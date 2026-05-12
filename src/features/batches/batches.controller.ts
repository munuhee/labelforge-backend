import { Request, Response } from 'express'
import { requireTenant, isClientAdmin, isSuperAdmin, isValidObjectId } from '../../lib/tenant'
import { connectToDatabase } from '../../lib/mongodb'
import Batch from '../../models/Batch'
import Task from '../../models/Task'
import Client from '../../models/Client'

const serializeBatch = (b: Record<string, unknown>) => ({ id: (b._id as { toString(): string }).toString(), tenantId: (b.tenantId as { toString(): string }).toString(), projectId: (b.projectId as { toString(): string } | undefined)?.toString(), workflowId: (b.workflowId as { toString(): string }).toString(), workflowName: b.workflowName, title: b.title, description: b.description, taskType: b.taskType, priority: b.priority, workloadEstimate: b.workloadEstimate, status: b.status, tasksTotal: b.tasksTotal, tasksCompleted: b.tasksCompleted, deadline: b.deadline, createdAt: b.createdAt })

export async function list(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  await connectToDatabase()
  const { workflowId, status, taskType, projectId, clientSlug: clientSlugParam, clientId: clientIdParam } = req.query as Record<string, string>
  let tenantId = ctx.tenantId
  if (!isValidObjectId(tenantId) && isSuperAdmin(ctx.role)) {
    if (clientSlugParam) { const c = await Client.findOne({ slug: clientSlugParam }).lean(); if (c) tenantId = (c._id as { toString(): string }).toString() }
    else if (clientIdParam && isValidObjectId(clientIdParam)) tenantId = clientIdParam
  }
  const filter: Record<string, unknown> = isValidObjectId(tenantId) ? { tenantId } : {}
  if (workflowId) filter.workflowId = workflowId
  if (projectId) filter.projectId = projectId
  if (status && status !== 'all') filter.status = status
  if (taskType && taskType !== 'all') filter.taskType = taskType
  const batches = await Batch.find(filter).sort({ priority: -1, createdAt: -1 }).lean()
  return res.json(batches.map(b => serializeBatch(b as unknown as Record<string, unknown>)))
}

export async function create(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return res.status(403).json({ error: 'Forbidden' })
  await connectToDatabase()
  const batch = await Batch.create({ ...req.body, tenantId: ctx.tenantId, createdBy: ctx.userId })
  return res.status(201).json({ id: batch._id.toString(), ...batch.toObject() })
}

export async function getById(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  await connectToDatabase()
  const tf = isValidObjectId(ctx.tenantId) ? { tenantId: ctx.tenantId } : {}
  const batch = await Batch.findOne({ _id: req.params.id, ...tf }).lean()
  if (!batch) return res.status(404).json({ error: 'Not found' })
  const tasks = await Task.find({ batchId: req.params.id, ...tf }).sort({ priority: -1 }).lean()
  return res.json({ ...serializeBatch(batch as unknown as Record<string, unknown>), instructions: batch.instructions, tasks: tasks.map(t => ({ id: t._id.toString(), batchId: t.batchId.toString(), batchTitle: t.batchTitle, workflowId: t.workflowId.toString(), workflowName: t.workflowName, title: t.title, description: t.description, taskType: t.taskType, status: t.status, priority: t.priority, externalUrl: t.externalUrl, estimatedDuration: t.estimatedDuration, actualDuration: t.actualDuration, annotatorId: t.annotatorId?.toString(), annotatorEmail: t.annotatorEmail, qualityScore: t.qualityScore, startedAt: t.startedAt, submittedAt: t.submittedAt })) })
}

export async function update(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return res.status(403).json({ error: 'Forbidden' })
  await connectToDatabase()
  const tf = isValidObjectId(ctx.tenantId) ? { tenantId: ctx.tenantId } : {}
  const batch = await Batch.findOneAndUpdate({ _id: req.params.id, ...tf }, req.body, { new: true }).lean()
  if (!batch) return res.status(404).json({ error: 'Not found' })
  return res.json({ id: batch._id.toString(), ...batch })
}

export async function remove(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return res.status(403).json({ error: 'Forbidden' })
  await connectToDatabase()
  const tf = isValidObjectId(ctx.tenantId) ? { tenantId: ctx.tenantId } : {}
  const batch = await Batch.findOne({ _id: req.params.id, ...tf })
  if (!batch) return res.status(404).json({ error: 'Not found' })
  await batch.deleteOne()
  await Task.deleteMany({ batchId: req.params.id, ...tf })
  return res.json({ message: 'Deleted' })
}
