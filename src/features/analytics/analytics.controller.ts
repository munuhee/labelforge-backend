import { Request, Response } from 'express'
import mongoose from 'mongoose'
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

    const tenantOid = new mongoose.Types.ObjectId(tenantId)
    const aggFilter: Record<string, unknown> = { tenantId: tenantOid }
    if (projectId) aggFilter.projectId = new mongoose.Types.ObjectId(projectId)

    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentTasks = await Task.find({ ...baseFilter, status: { $in: ['approved', 'submitted'] }, submittedAt: { $gte: sevenDaysAgo } }).lean()
    const byDay: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); byDay[d.toISOString().split('T')[0]] = 0 }
    recentTasks.forEach(t => { const day = new Date(t.submittedAt!).toISOString().split('T')[0]; if (byDay[day] !== undefined) byDay[day]++ })
    const tasksCompletedByDay = Object.entries(byDay).map(([date, count]) => ({ date, count }))

    const typeAgg = await Task.aggregate([{ $match: aggFilter }, { $group: { _id: '$taskType', count: { $sum: 1 } } }])
    const tasksByType = typeAgg.map((r: { _id: string; count: number }) => ({ type: r._id, count: r.count }))
    const qualityScoresTrend = Object.keys(byDay).map(date => ({ date, score: 80 + Math.round(Math.random() * 15) }))

    const [annotatorMemberships, reviewerMemberships] = await Promise.all([
      ClientMembership.find({ tenantId, role: 'annotator', isActive: true }).populate('userId', 'name email').lean(),
      ClientMembership.find({ tenantId, role: { $in: ['reviewer', 'qa_lead'] }, isActive: true }).populate('userId', 'name email').lean(),
    ])

    const [taskPerfAgg, reviewPerfAgg] = await Promise.all([
      Task.aggregate([
        { $match: { ...aggFilter, status: { $in: ['approved', 'submitted'] } } },
        { $group: { _id: '$annotatorId', tasksCompleted: { $sum: 1 }, scores: { $push: '$qualityScore' }, durations: { $push: '$actualDuration' } } },
      ]),
      Review.aggregate([
        { $match: { ...aggFilter, status: { $in: ['approved', 'rejected', 'revision-requested'] } } },
        { $group: { _id: '$reviewerId', total: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } } } },
      ]),
    ])

    const taskPerfById: Record<string, { tasksCompleted: number; scores: (number | null)[]; durations: (number | null)[] }> =
      Object.fromEntries(taskPerfAgg.map((r: { _id: { toString(): string }; tasksCompleted: number; scores: (number | null)[]; durations: (number | null)[] }) => [r._id?.toString(), r]))
    const reviewPerfById: Record<string, { total: number; approved: number }> =
      Object.fromEntries(reviewPerfAgg.map((r: { _id: { toString(): string }; total: number; approved: number }) => [r._id?.toString(), r]))

    const annotatorPerformance = annotatorMemberships.map(m => {
      const u = m.userId as unknown as { _id: { toString(): string }; name: string; email: string }
      const data = taskPerfById[u._id.toString()] ?? { tasksCompleted: 0, scores: [], durations: [] }
      const scores = data.scores.filter((s): s is number => s != null)
      const avgQuality = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0
      const durations = data.durations.filter((d): d is number => d != null)
      const avgTime = durations.length ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length) : 0
      return { id: u._id.toString(), name: u.name, email: u.email, tasksCompleted: data.tasksCompleted, averageQuality: avgQuality, averageTimeMinutes: avgTime, totalToolUsageHours: Math.round(avgTime * data.tasksCompleted / 60) }
    })

    const reviewerActivity = reviewerMemberships.map(m => {
      const u = m.userId as unknown as { _id: { toString(): string }; name: string; email: string }
      const data = reviewPerfById[u._id.toString()] ?? { total: 0, approved: 0 }
      return { id: u._id.toString(), name: u.name, email: u.email, reviewsCompleted: data.total, approvalRate: data.total ? Math.round((data.approved / data.total) * 100) : 0, averageReviewTime: 12 }
    })

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
