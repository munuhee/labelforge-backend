import { randomUUID } from 'crypto'
import { connectToDatabase } from '../../lib/mongodb'
import { isClientAdmin, isSuperAdmin, isQaOrAbove, isReviewerOrAbove, isValidObjectId } from '../../lib/tenant'
import Task from '../../models/Task'
import Batch from '../../models/Batch'
import Review from '../../models/Review'
import Notification from '../../models/Notification'
import Client from '../../models/Client'

export function serializeTask(t: Record<string, unknown>) {
  return {
    id: (t._id as { toString(): string }).toString(),
    tenantId: (t.tenantId as { toString(): string } | undefined)?.toString(),
    projectId: (t.projectId as { toString(): string } | undefined)?.toString(),
    batchId: (t.batchId as { toString(): string }).toString(),
    batchTitle: t.batchTitle, workflowId: (t.workflowId as { toString(): string }).toString(), workflowName: t.workflowName,
    title: t.title, description: t.description, taskType: t.taskType, status: t.status, isLocked: t.isLocked ?? false,
    priority: t.priority, difficulty: t.difficulty, languageTags: t.languageTags, sla: t.sla, externalUrl: t.externalUrl,
    estimatedDuration: t.estimatedDuration, actualDuration: t.actualDuration,
    annotatorId: t.annotatorId ? (t.annotatorId as { toString(): string }).toString() : null,
    annotatorEmail: t.annotatorEmail,
    reviewerId: t.reviewerId ? (t.reviewerId as { toString(): string }).toString() : null,
    reviewerEmail: t.reviewerEmail, feedback: t.feedback, qualityScore: t.qualityScore, notes: t.notes,
    objective: t.objective, successCriteria: t.successCriteria, expectedOutput: t.expectedOutput,
    subtasks: t.subtasks, submissionData: t.submissionData, screenshots: t.screenshots, extensionData: t.extensionData,
    errorTags: t.errorTags ?? [], activityLog: t.activityLog ?? [],
    startedAt: t.startedAt, completedAt: t.completedAt, submittedAt: t.submittedAt, signedOffAt: t.signedOffAt, createdAt: t.createdAt,
  }
}

export function logEntry(userId: string, userEmail: string, action: string, comment?: string) {
  return { action, userId, userEmail, comment, timestamp: new Date() }
}

export interface ListTasksParams {
  tenantId: string; userId: string; role: string;
  batchId?: string; status?: string; mine?: string; projectId?: string;
  clientSlugParam?: string; clientIdParam?: string;
  workflow?: string; annotatorEmail?: string; reviewerEmail?: string;
  dateFrom?: string; dateTo?: string; dateExact?: string; viewAs?: string;
  page?: string; limit?: string;
}

export async function listTasks(params: ListTasksParams) {
  await connectToDatabase()
  let { tenantId } = params
  const { userId, role, batchId, status, mine, projectId, clientSlugParam, clientIdParam, workflow, annotatorEmail, reviewerEmail, dateFrom, dateTo, dateExact, viewAs, page, limit } = params
  const pageNum  = Math.max(1, parseInt(page  ?? '1',  10))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '50', 10)))

  if (!isValidObjectId(tenantId) && isSuperAdmin(role)) {
    if (clientSlugParam) {
      const client = await Client.findOne({ slug: clientSlugParam }).lean()
      if (client) tenantId = (client._id as { toString(): string }).toString()
    } else if (clientIdParam && isValidObjectId(clientIdParam)) {
      tenantId = clientIdParam
    }
  }

  const filter: Record<string, unknown> = isValidObjectId(tenantId) ? { tenantId } : {}
  if (batchId) filter.batchId = batchId
  if (projectId) filter.projectId = projectId

  if (status && status !== 'all') {
    const statuses = status.split(',').map(s => s.trim())
    filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses }
  }

  if (role === 'annotator' || (role === 'reviewer_annotator' && viewAs === 'annotator')) {
    const requestedStatuses = status ? status.split(',').map(s => s.trim()) : []
    const onlyUnclaimed = requestedStatuses.length > 0 && requestedStatuses.every(s => s === 'unclaimed')
    if (!onlyUnclaimed) filter.annotatorId = userId
  } else if (mine === 'true' && (role === 'reviewer' || role === 'reviewer_annotator')) {
    filter.reviewerId = userId
  }

  if (isReviewerOrAbove(role)) {
    if (workflow) {
      const flexRegex = (term: string) => {
        const pattern = term.trim().split(/[-_\s]+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\-_]+')
        return new RegExp(pattern, 'i')
      }
      const names = workflow.split(',').map(s => s.trim())
      filter.$or = names.flatMap(n => [{ workflowName: flexRegex(n) }, { taskType: { $regex: n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }])
    }
    if (isQaOrAbove(role)) {
      if (annotatorEmail) {
        const emails = annotatorEmail.split(',').map(s => s.trim())
        filter.annotatorEmail = emails.length === 1 ? emails[0] : { $in: emails }
      }
      if (reviewerEmail) {
        const emails = reviewerEmail.split(',').map(s => s.trim())
        filter.reviewerEmail = emails.length === 1 ? emails[0] : { $in: emails }
      }
      if (dateExact) {
        const d = new Date(dateExact); const next = new Date(d); next.setDate(next.getDate() + 1)
        filter.submittedAt = { $gte: d, $lt: next }
      } else if (dateFrom || dateTo) {
        const dateFilter: Record<string, Date> = {}
        if (dateFrom) dateFilter.$gte = new Date(dateFrom)
        if (dateTo) { const d = new Date(dateTo); d.setDate(d.getDate() + 1); dateFilter.$lt = d }
        filter.submittedAt = dateFilter
      }
    }
  }

  const total = await Task.countDocuments(filter)
  console.log(`[listTasks] filter=${JSON.stringify(filter)} total=${total} page=${pageNum} limit=${limitNum}`)
  const tasks = await Task.find(filter).sort({ priority: -1, createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean()
  return {
    tasks: tasks.map(t => serializeTask(t as unknown as Record<string, unknown>)),
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    limit: limitNum,
  }
}

export async function createTask(tenantId: string, body: Record<string, unknown>) {
  await connectToDatabase()
  const task = await Task.create({ ...body, tenantId })
  await Batch.findByIdAndUpdate(body.batchId, { $inc: { tasksTotal: 1 } })
  return serializeTask(task.toObject() as unknown as Record<string, unknown>)
}

export async function bulkCreateTasks(tenantId: string, batchId: string, tasks: Record<string, unknown>[], metadata: Record<string, unknown>) {
  await connectToDatabase()
  const bf = isValidObjectId(tenantId) ? { tenantId } : {}
  const batch = await Batch.findOne({ _id: batchId, ...bf })
  if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 })
  const effectiveTenantId = isValidObjectId(tenantId) ? tenantId : (batch.tenantId as { toString(): string }).toString()

  const errors: { index: number; error: string }[] = []
  const globalMeta: Record<string, unknown> = {}
  if (metadata.priority != null) globalMeta.priority = Number(metadata.priority)
  if (metadata.difficulty) globalMeta.difficulty = metadata.difficulty
  if (metadata.estimatedDuration) globalMeta.estimatedDuration = Number(metadata.estimatedDuration)
  if (metadata.sla) globalMeta.sla = new Date(metadata.sla as string)
  if (metadata.languageTags) globalMeta.languageTags = Array.isArray(metadata.languageTags) ? metadata.languageTags : String(metadata.languageTags).split(',').map((t: string) => t.trim()).filter(Boolean)

  const validDocs: Record<string, unknown>[] = []
  for (let i = 0; i < tasks.length; i++) {
    const raw = tasks[i]
    if (!raw.title) { errors.push({ index: i, error: 'Missing required field: title' }); continue }
    const taskDoc: Record<string, unknown> = { tenantId: effectiveTenantId, projectId: batch.projectId, batchId: batch._id, batchTitle: batch.title, workflowId: batch.workflowId, workflowName: batch.workflowName, taskType: batch.taskType, status: 'unclaimed', priority: batch.priority, estimatedDuration: 30, ...globalMeta, ...raw }
    if (typeof taskDoc.languageTags === 'string') taskDoc.languageTags = (taskDoc.languageTags as string).split(',').map((t: string) => t.trim()).filter(Boolean)
    if (taskDoc.priority) taskDoc.priority = Number(taskDoc.priority)
    if (taskDoc.estimatedDuration) taskDoc.estimatedDuration = Number(taskDoc.estimatedDuration)
    validDocs.push(taskDoc)
  }

  const createdIds: string[] = []
  for (let i = 0; i < validDocs.length; i++) {
    try {
      const task = await Task.create(validDocs[i])
      createdIds.push((task._id as { toString(): string }).toString())
    } catch (err: unknown) {
      const e = err as Error
      console.error(`[bulkCreate] doc ${i} failed:`, e.message)
      errors.push({ index: i, error: e.message ?? 'Write error' })
    }
  }

  if (createdIds.length > 0) await Batch.findByIdAndUpdate(batchId, { $inc: { tasksTotal: createdIds.length } })
  console.log(`[bulkCreate] created=${createdIds.length} errors=${errors.length} tenant=${effectiveTenantId} batch=${batchId}`)
  return { created: createdIds.length, errors: errors.length, errorDetails: errors, taskIds: createdIds }
}

export async function getTaskById(id: string, tenantId: string) {
  await connectToDatabase()
  const tenantFilter = isValidObjectId(tenantId) ? { tenantId } : {}
  const task = await Task.findOne({ _id: id, ...tenantFilter }).lean()
  if (!task) throw Object.assign(new Error('Not found'), { status: 404 })

  const review = await Review.findOne({ taskId: id, ...tenantFilter }).sort({ createdAt: -1 }).lean()
  return {
    ...serializeTask(task as unknown as Record<string, unknown>),
    review: review ? { id: review._id.toString(), status: review.status, decision: review.decision, comments: review.comments, qualityScore: review.qualityScore, criteriaScores: review.criteriaScores, reviewerName: review.reviewerName, reviewedAt: review.reviewedAt } : null,
  }
}

export async function applyTaskAction(id: string, ctx: { userId: string; email: string; role: string; tenantId: string; clientSlug?: string }, body: Record<string, unknown>) {
  await connectToDatabase()
  const { userId, email: userEmail, role, tenantId, clientSlug } = ctx
  const task = await Task.findOne({ _id: id, tenantId })
  if (!task) throw Object.assign(new Error('Not found'), { status: 404 })

  const { action } = body
  const taskUrl = `/${clientSlug}/dashboard/tasks/${task._id}`

  if (task.isLocked && !['add-error-tag', 'remove-error-tag', 'resolve-error-tag'].includes(action as string)) {
    throw Object.assign(new Error('This task is locked and cannot be modified'), { status: 403 })
  }

  if (action === 'claim') {
    if (task.status !== 'unclaimed') throw Object.assign(new Error('Task is not available to claim'), { status: 400 })
    const blockingTask = await Task.findOne({ tenantId, annotatorId: userId, status: { $in: ['in-progress', 'paused', 'revision-requested'] } })
    if (blockingTask) {
      if (blockingTask.status === 'revision-requested') throw Object.assign(new Error('You have a task requiring rework. Complete it before claiming a new one'), { status: 400 })
      throw Object.assign(new Error('Complete your current in-progress task before claiming a new one'), { status: 400 })
    }
    task.annotatorId = userId as unknown as typeof task.annotatorId
    task.annotatorEmail = userEmail
    task.status = 'in-progress'; task.startedAt = new Date()
    task.activityLog.push(logEntry(userId, userEmail, 'claimed'))
    await Batch.findByIdAndUpdate(task.batchId, { status: 'in-progress' })
  } else if (action === 'pause') {
    task.status = 'paused'; task.activityLog.push(logEntry(userId, userEmail, 'paused'))
  } else if (action === 'resume') {
    task.status = 'in-progress'; task.activityLog.push(logEntry(userId, userEmail, 'resumed'))
  } else if (action === 'park') {
    const comment = (body.parkComment as string) || ''
    task.status = 'paused'; if (comment) task.notes = `[PARKED] ${comment}`
    task.activityLog.push(logEntry(userId, userEmail, 'parked', comment))
  } else if (action === 'submit') {
    const wasRevisionRequested = task.status === 'revision-requested'
    task.status = 'submitted'; task.submittedAt = new Date()
    if (body.notes) task.notes = body.notes as string
    task.activityLog.push(logEntry(userId, userEmail, wasRevisionRequested ? 'resubmitted-after-rework' : 'submitted', body.notes as string))
    if (wasRevisionRequested) {
      const existingReview = await Review.findOne({ taskId: task._id, tenantId, status: 'revision-requested' })
      if (existingReview) { existingReview.status = 'pending'; existingReview.decision = undefined; existingReview.submittedAt = new Date(); await existingReview.save() }
      else await Review.create({ tenantId, taskId: task._id, taskTitle: task.title, batchId: task.batchId, batchTitle: task.batchTitle, workflowId: task.workflowId, annotatorId: userId, annotatorEmail: userEmail, annotatorName: userEmail.split('@')[0], status: 'pending', submittedAt: new Date() })
    } else {
      await Review.create({ tenantId, taskId: task._id, taskTitle: task.title, batchId: task.batchId, batchTitle: task.batchTitle, workflowId: task.workflowId, annotatorId: userId, annotatorEmail: userEmail, annotatorName: userEmail.split('@')[0], status: 'pending', submittedAt: new Date() })
    }
  } else if (action === 'recall') {
    const pendingReview = await Review.findOne({ taskId: id, tenantId, status: 'pending' })
    if (!pendingReview) throw Object.assign(new Error('Task is already in review — cannot recall'), { status: 400 })
    await Review.findByIdAndDelete(pendingReview._id)
    task.status = 'in-progress'; task.submittedAt = undefined
    task.activityLog.push(logEntry(userId, userEmail, 'recalled', 'Pulled back for edits'))
  } else if (action === 'escalate') {
    const comment = (body.comment as string) || ''
    task.status = 'escalated'; task.activityLog.push(logEntry(userId, userEmail, 'escalated', comment))
    if (task.reviewerId) await Notification.create({ tenantId, userId: task.reviewerId, type: 'escalation', title: 'Task Escalated by Annotator', message: `${userEmail.split('@')[0]} escalated "${task.title}": ${comment}`, actionUrl: taskUrl })
  } else if (action === 'unenroll') {
    task.status = 'unclaimed'; task.annotatorId = undefined; task.annotatorEmail = undefined
    task.activityLog.push(logEntry(userId, userEmail, 'unenrolled'))
  } else if (action === 'sign-off') {
    if (!isReviewerOrAbove(role)) throw Object.assign(new Error('Forbidden'), { status: 403 })
    const qualityScore = (body.qualityScore as number) ?? 100
    task.status = 'data-ready'; task.isLocked = true; task.qualityScore = qualityScore
    task.feedback = (body.comments as string) || ''; task.completedAt = new Date(); task.signedOffAt = new Date()
    task.reviewerId = userId as unknown as typeof task.reviewerId; task.reviewerEmail = userEmail
    task.activityLog.push(logEntry(userId, userEmail, 'signed-off', body.comments as string))
    task.errorTags.forEach(tag => { if (tag.status === 'open') { tag.status = 'resolved'; tag.resolvedBy = userEmail; tag.resolvedAt = new Date() } })
    await Review.findOneAndUpdate({ taskId: task._id, tenantId, status: 'in-review' }, { status: 'approved', decision: 'approve', qualityScore, reviewedAt: new Date(), comments: body.comments })
    await Batch.findByIdAndUpdate(task.batchId, { $inc: { tasksCompleted: 1 } })
    await Notification.create({ tenantId, userId: task.annotatorId, type: 'task-approved', title: 'Task Signed Off — Data Ready', message: `Your task "${task.title}" has been signed off.`, actionUrl: taskUrl })
  } else if (action === 'request-rework') {
    if (!isReviewerOrAbove(role)) throw Object.assign(new Error('Forbidden'), { status: 403 })
    const comment = (body.comment as string) || ''
    task.status = 'revision-requested'; task.feedback = comment
    task.activityLog.push(logEntry(userId, userEmail, 'requested-rework', comment))
    await Review.findOneAndUpdate({ taskId: task._id, tenantId, status: 'in-review' }, { status: 'revision-requested', decision: 'request-rework', comments: comment, reviewedAt: new Date() })
    await Notification.create({ tenantId, userId: task.annotatorId, type: 'task-rejected', title: 'Rework Required', message: `Your task "${task.title}" needs rework.`, actionUrl: taskUrl })
  } else if (action === 'add-error-tag') {
    if (!isReviewerOrAbove(role)) throw Object.assign(new Error('Forbidden'), { status: 403 })
    const { tag } = body as { tag: Record<string, unknown> }
    task.errorTags.push({ tagId: (tag.tagId as string) ?? randomUUID(), severity: tag.severity as 'major' | 'minor', category: tag.category as string, message: tag.message as string, stepReference: tag.stepReference as string | undefined, scoreDeduction: (tag.scoreDeduction as number) ?? (tag.severity === 'major' ? 20 : 5), status: 'open', createdBy: userId, createdByEmail: userEmail })
    task.activityLog.push(logEntry(userId, userEmail, 'added-error-tag', `[${(tag.severity as string).toUpperCase()}] ${tag.message}`))
  } else if (action === 'remove-error-tag') {
    if (!isReviewerOrAbove(role)) throw Object.assign(new Error('Forbidden'), { status: 403 })
    task.errorTags = task.errorTags.filter(t => t.tagId !== body.tagId) as typeof task.errorTags
    task.activityLog.push(logEntry(userId, userEmail, 'removed-error-tag', body.tagId as string))
  } else if (action === 'resolve-error-tag') {
    if (!isReviewerOrAbove(role)) throw Object.assign(new Error('Forbidden'), { status: 403 })
    const tag = task.errorTags.find(t => t.tagId === body.tagId)
    if (tag) { tag.status = 'resolved'; tag.resolvedBy = userEmail; tag.resolvedAt = new Date(); task.activityLog.push(logEntry(userId, userEmail, 'resolved-error-tag', tag.message)) }
  } else if (action === 'complete') {
    task.status = 'approved'; task.completedAt = new Date()
    task.activityLog.push(logEntry(userId, userEmail, 'completed'))
    await Batch.findByIdAndUpdate(task.batchId, { $inc: { tasksCompleted: 1 } })
  } else {
    Object.assign(task, body)
  }

  await task.save()
  return serializeTask(task.toObject() as unknown as Record<string, unknown>)
}

export async function deleteTask(id: string, tenantId: string) {
  await connectToDatabase()
  const tFilter = isValidObjectId(tenantId) ? { tenantId } : {}
  const task = await Task.findOne({ _id: id, ...tFilter })
  if (!task) throw Object.assign(new Error('Not found'), { status: 404 })
  if (task.isLocked) throw Object.assign(new Error('Cannot delete a locked task'), { status: 403 })
  await task.deleteOne()
  await Batch.findByIdAndUpdate(task.batchId, { $inc: { tasksTotal: -1 } })
}
