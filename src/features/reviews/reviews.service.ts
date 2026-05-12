import { connectToDatabase } from '../../lib/mongodb'
import { isSuperAdmin, isReviewerOrAbove, isValidObjectId } from '../../lib/tenant'
import Review from '../../models/Review'
import Task from '../../models/Task'
import Batch from '../../models/Batch'
import Notification from '../../models/Notification'
import Client from '../../models/Client'

export function serializeReview(r: Record<string, unknown>) {
  return {
    id: (r._id as { toString(): string }).toString(),
    tenantId: (r.tenantId as { toString(): string } | undefined)?.toString(),
    projectId: (r.projectId as { toString(): string } | undefined)?.toString(),
    taskId: (r.taskId as { toString(): string }).toString(),
    taskTitle: r.taskTitle, batchId: (r.batchId as { toString(): string }).toString(), batchTitle: r.batchTitle,
    workflowId: (r.workflowId as { toString(): string }).toString(),
    annotatorId: (r.annotatorId as { toString(): string }).toString(),
    annotatorEmail: r.annotatorEmail, annotatorName: r.annotatorName,
    reviewerId: r.reviewerId ? (r.reviewerId as { toString(): string }).toString() : null,
    reviewerEmail: r.reviewerEmail, reviewerName: r.reviewerName,
    status: r.status, decision: r.decision, comments: r.comments, reasonCode: r.reasonCode,
    qualityScore: r.qualityScore, criteriaScores: r.criteriaScores,
    submittedAt: r.submittedAt, reviewedAt: r.reviewedAt, createdAt: r.createdAt,
  }
}

export async function listReviews(params: { tenantId: string; userId: string; role: string; status?: string; mine?: string; projectId?: string; clientSlugParam?: string; clientIdParam?: string }) {
  await connectToDatabase()
  let { tenantId } = params
  const { userId, role, status, mine, projectId, clientSlugParam, clientIdParam } = params

  if (!isValidObjectId(tenantId) && isSuperAdmin(role)) {
    if (clientSlugParam) {
      const client = await Client.findOne({ slug: clientSlugParam }).lean()
      if (client) tenantId = (client._id as { toString(): string }).toString()
    } else if (clientIdParam && isValidObjectId(clientIdParam)) {
      tenantId = clientIdParam
    }
  }

  const filter: Record<string, unknown> = isValidObjectId(tenantId) ? { tenantId } : {}
  if (projectId) filter.projectId = projectId
  if (status && status !== 'all') filter.status = status
  if (role === 'annotator') {
    filter.annotatorId = userId
  } else if (role === 'reviewer_annotator') {
    filter.$or = [{ annotatorId: userId }, { reviewerId: userId }]
  } else if (mine === 'true' && (role === 'reviewer' || role === 'qa_lead')) {
    filter.reviewerId = userId
  }

  const reviews = await Review.find(filter).sort({ submittedAt: -1 }).lean()
  return reviews.map(r => serializeReview(r as unknown as Record<string, unknown>))
}

export async function getReviewById(id: string, tenantId: string) {
  await connectToDatabase()
  const rf = isValidObjectId(tenantId) ? { tenantId } : {}
  const review = await Review.findOne({ _id: id, ...rf }).lean()
  if (!review) throw Object.assign(new Error('Not found'), { status: 404 })
  return { id: review._id.toString(), ...review }
}

export async function applyReviewAction(id: string, ctx: { userId: string; email: string; role: string; tenantId: string; clientSlug?: string }, body: Record<string, unknown>) {
  await connectToDatabase()
  const { userId, email: userEmail, role, tenantId, clientSlug } = ctx
  if (!isReviewerOrAbove(role)) throw Object.assign(new Error('Forbidden'), { status: 403 })

  const review = await Review.findOne({ _id: id, tenantId })
  if (!review) throw Object.assign(new Error('Not found'), { status: 404 })

  const { action } = body
  const taskUrl = `/${clientSlug}/dashboard/tasks/${review.taskId}`

  if (action === 'claim') {
    const active = await Review.countDocuments({ tenantId, reviewerId: userId, status: 'in-review' })
    if (active >= 1) throw Object.assign(new Error('Complete your current active review before claiming another'), { status: 400 })
    review.reviewerId = userId as unknown as typeof review.reviewerId
    review.reviewerEmail = userEmail; review.reviewerName = userEmail.split('@')[0]; review.status = 'in-review'
    await Task.findOneAndUpdate({ _id: review.taskId, tenantId }, { reviewerId: userId, reviewerEmail: userEmail, status: 'in-review' })

  } else if (action === 'decide') {
    const { decision, comments, reasonCode, qualityScore, criteriaScores, errorTags } = body
    review.decision = decision as string; review.comments = comments as string; review.reasonCode = reasonCode as string
    review.qualityScore = qualityScore as number; review.criteriaScores = criteriaScores as { accuracy: number; completeness: number; adherence: number }; review.reviewedAt = new Date()
    if ((errorTags as unknown[])?.length) review.errorTags = errorTags as typeof review.errorTags

    if (decision === 'approve') {
      const task = await Task.findOne({ _id: review.taskId, tenantId })
      if (task) {
        task.status = 'data-ready'; task.isLocked = true; task.qualityScore = qualityScore as number; task.feedback = comments as string
        task.completedAt = new Date(); task.signedOffAt = new Date()
        task.errorTags.forEach(tag => { if (tag.status === 'open') { tag.status = 'resolved'; tag.resolvedBy = userEmail; tag.resolvedAt = new Date() } })
        task.activityLog.push({ action: 'signed-off', userId, userEmail, comment: comments as string, timestamp: new Date() })
        await task.save(); await Batch.findByIdAndUpdate(task.batchId, { $inc: { tasksCompleted: 1 } })
      }
      review.status = 'approved'
      await Notification.create({ tenantId, userId: review.annotatorId, type: 'task-approved', title: 'Task Signed Off — Data Ready', message: `Your task "${review.taskTitle}" is now in the training dataset.`, actionUrl: taskUrl })

    } else if (decision === 'reject') {
      review.status = 'rejected'
      const task = await Task.findOne({ _id: review.taskId, tenantId })
      if (task) { task.status = 'rejected'; task.feedback = comments as string; if ((errorTags as unknown[])?.length) task.errorTags.push(...(errorTags as typeof task.errorTags)); task.activityLog.push({ action: 'rejected', userId, userEmail, comment: comments as string, timestamp: new Date() }); await task.save() }
      await Notification.create({ tenantId, userId: review.annotatorId, type: 'task-rejected', title: 'Task Rejected', message: `Your task "${review.taskTitle}" was rejected. ${comments || ''}`, actionUrl: taskUrl })

    } else if (decision === 'request-rework') {
      review.status = 'revision-requested'
      const task = await Task.findOne({ _id: review.taskId, tenantId })
      if (task) { task.status = 'revision-requested'; task.feedback = comments as string; if ((errorTags as unknown[])?.length) task.errorTags.push(...(errorTags as typeof task.errorTags)); task.activityLog.push({ action: 'revision-requested', userId, userEmail, comment: comments as string, timestamp: new Date() }); await task.save() }
      await Notification.create({ tenantId, userId: review.annotatorId, type: 'task-rejected', title: 'Rework Required', message: `Your task "${review.taskTitle}" needs rework. ${comments || ''}`, actionUrl: taskUrl })

    } else if (decision === 'escalate') {
      review.status = 'escalated'
      await Task.findOneAndUpdate({ _id: review.taskId, tenantId }, { status: 'submitted', feedback: comments })
      await Notification.create({ tenantId, userId: review.annotatorId, type: 'escalation', title: 'Task Escalated', message: `Your task "${review.taskTitle}" has been escalated.`, actionUrl: taskUrl })

    } else if (decision === 'hold') {
      review.status = 'on-hold'
      await Task.findOneAndUpdate({ _id: review.taskId, tenantId }, { status: 'submitted', feedback: comments })

    } else if (decision === 'flag') {
      review.status = 'flagged'
      await Task.findOneAndUpdate({ _id: review.taskId, tenantId }, { status: 'submitted', feedback: comments })
      await Notification.create({ tenantId, userId: review.annotatorId, type: 'priority-warning', title: 'Task Flagged', message: `Your task "${review.taskTitle}" has been flagged. ${comments || ''}`, actionUrl: taskUrl })
    }
  }

  await review.save()
  return { id: review._id.toString(), ...review.toObject() }
}
