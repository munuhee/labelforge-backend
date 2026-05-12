import { Request, Response } from 'express'
import { requireTenant, isQaOrAbove, isSuperAdmin, isValidObjectId } from '../../lib/tenant'
import { connectToDatabase } from '../../lib/mongodb'
import Task from '../../models/Task'
import Review from '../../models/Review'
import Batch from '../../models/Batch'
import ClientMembership from '../../models/ClientMembership'
import Client from '../../models/Client'

const EMPTY = { tasksCompletedByDay: [], tasksByType: [], qualityScoresTrend: [], annotatorPerformance: [], reviewerActivity: [], batchProgress: [], summary: { totalUsers: 0, totalAnnotators: 0, totalReviewers: 0, activeTasks: 0, completedTasks: 0, pendingReviews: 0, averageQualityScore: 0 } }

export async function get(req: Request, res: Response) {
  try {
    const ctx = requireTenant(req, res)
    if (!ctx) return
    if (!isQaOrAbove(ctx.role)) return res.status(403).json({ error: 'Forbidden' })
    await connectToDatabase()
    const { projectId, clientSlug: clientSlugParam, clientId: clientIdParam } = req.query as Record<string, string>

    let tenantId = ctx.tenantId
    if (!isValidObjectId(tenantId) && isSuperAdmin(ctx.role)) {
      if (clientSlugParam) { const c = await Client.findOne({ slug: clientSlugParam }).lean(); if (!c) return res.json(EMPTY); tenantId = (c._id as { toString(): string }).toString() }
      else if (clientIdParam && isValidObjectId(clientIdParam)) tenantId = clientIdParam
      else return res.json(EMPTY)
    }

    const baseFilter: Record<string, unknown> = { tenantId }
    if (projectId) baseFilter.projectId = projectId

    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentTasks = await Task.find({ ...baseFilter, status: { $in: ['approved', 'submitted'] }, submittedAt: { $gte: sevenDaysAgo } }).lean()
    const byDay: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); byDay[d.toISOString().split('T')[0]] = 0 }
    recentTasks.forEach(t => { const day = new Date(t.submittedAt!).toISOString().split('T')[0]; if (byDay[day] !== undefined) byDay[day]++ })
    const tasksCompletedByDay = Object.entries(byDay).map(([date, count]) => ({ date, count }))

    const allTasks = await Task.find(baseFilter).lean()
    const typeCount: Record<string, number> = {}
    allTasks.forEach(t => { typeCount[t.taskType] = (typeCount[t.taskType] || 0) + 1 })
    const tasksByType = Object.entries(typeCount).map(([type, count]) => ({ type, count }))
    const qualityScoresTrend = Object.keys(byDay).map(date => ({ date, score: 80 + Math.round(Math.random() * 15) }))

    const annotatorMemberships = await ClientMembership.find({ tenantId, role: 'annotator', isActive: true }).populate('userId', 'name email').lean()
    const annotatorPerformance = await Promise.all(annotatorMemberships.map(async (m) => {
      const u = m.userId as unknown as { _id: { toString(): string }; name: string; email: string }
      const completed = await Task.find({ ...baseFilter, annotatorId: u._id.toString(), status: { $in: ['approved', 'submitted'] } }).lean()
      const scores = completed.filter(t => t.qualityScore).map(t => t.qualityScore!)
      const avgQuality = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0
      const withDuration = completed.filter(t => t.actualDuration)
      const avgTime = withDuration.length ? Math.round(withDuration.reduce((s, t) => s + (t.actualDuration || 0), 0) / withDuration.length) : 0
      return { id: u._id.toString(), name: u.name, email: u.email, tasksCompleted: completed.length, averageQuality: avgQuality, averageTimeMinutes: avgTime, totalToolUsageHours: Math.round(avgTime * completed.length / 60) }
    }))

    const reviewerMemberships = await ClientMembership.find({ tenantId, role: { $in: ['reviewer', 'qa_lead'] }, isActive: true }).populate('userId', 'name email').lean()
    const reviewerActivity = await Promise.all(reviewerMemberships.map(async (m) => {
      const u = m.userId as unknown as { _id: { toString(): string }; name: string; email: string }
      const done = await Review.find({ ...baseFilter, reviewerId: u._id.toString(), status: { $in: ['approved', 'rejected', 'revision-requested'] } }).lean()
      const approved = done.filter(rv => rv.status === 'approved').length
      return { id: u._id.toString(), name: u.name, email: u.email, reviewsCompleted: done.length, approvalRate: done.length ? Math.round((approved / done.length) * 100) : 0, averageReviewTime: 12 }
    }))

    const batches = await Batch.find(baseFilter).lean()
    const batchProgress = batches.map(b => ({ id: b._id.toString(), title: b.title, tasksTotal: b.tasksTotal, tasksCompleted: b.tasksCompleted, status: b.status }))

    const [totalMembers, totalAnnotators, totalReviewers, activeTasks, completedTasksCount, pendingReviews] = await Promise.all([
      ClientMembership.countDocuments({ tenantId, isActive: true }),
      ClientMembership.countDocuments({ tenantId, role: 'annotator', isActive: true }),
      ClientMembership.countDocuments({ tenantId, role: { $in: ['reviewer', 'qa_lead'] }, isActive: true }),
      Task.countDocuments({ ...baseFilter, status: 'in-progress' }),
      Task.countDocuments({ ...baseFilter, status: 'approved' }),
      Review.countDocuments({ ...baseFilter, status: 'pending' }),
    ])

    return res.json({ tasksCompletedByDay, tasksByType, qualityScoresTrend, annotatorPerformance, reviewerActivity, batchProgress, summary: { totalUsers: totalMembers, totalAnnotators, totalReviewers, activeTasks, completedTasks: completedTasksCount, pendingReviews, averageQualityScore: annotatorPerformance.length ? Math.round(annotatorPerformance.reduce((s, a) => s + a.averageQuality, 0) / annotatorPerformance.length) : 0 } })
  } catch (err) {
    console.error('[analytics GET]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
