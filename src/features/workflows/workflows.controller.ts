import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { requireTenant, isClientAdmin, isSuperAdmin, isValidObjectId } from '../../lib/tenant'
import { connectToDatabase } from '../../lib/mongodb'
import Workflow from '../../models/Workflow'
import Batch from '../../models/Batch'
import Client from '../../models/Client'

export async function list(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  await connectToDatabase()
  const { type, projectId, clientSlug: clientSlugParam, clientId: clientIdParam } = req.query as Record<string, string>
  const { userId, role } = ctx
  let { tenantId } = ctx

  if (!isValidObjectId(tenantId) && isSuperAdmin(role)) {
    if (clientSlugParam) { const c = await Client.findOne({ slug: clientSlugParam }).lean(); if (c) tenantId = (c._id as { toString(): string }).toString() }
    else if (clientIdParam && isValidObjectId(clientIdParam)) tenantId = clientIdParam
  }

  const filter: Record<string, unknown> = isValidObjectId(tenantId) ? { tenantId } : {}
  if (type && type !== 'all') filter.type = type
  if (projectId) filter.projectId = projectId
  if (!isClientAdmin(role)) filter.isActive = true
  if ((role === 'annotator' || role === 'reviewer') && userId) filter.assignedUsers = new mongoose.Types.ObjectId(userId)

  const workflows = await Workflow.find(filter).sort({ createdAt: -1 }).lean()
  const result = await Promise.all(workflows.map(async (w) => {
    const batchFilter: Record<string, unknown> = { workflowId: w._id }
    if (isValidObjectId(tenantId)) batchFilter.tenantId = tenantId
    const batches = await Batch.find(batchFilter).lean()
    return { id: w._id.toString(), tenantId: w.tenantId.toString(), projectId: w.projectId?.toString(), name: w.name, description: w.description, type: w.type, isActive: w.isActive, assignedUsers: (w.assignedUsers || []).map((id: unknown) => (id as { toString(): string })?.toString()), batchCount: batches.length, taskCount: batches.reduce((s, b) => s + b.tasksTotal, 0), createdAt: w.createdAt }
  }))
  return res.json(result)
}

export async function create(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return res.status(403).json({ error: 'Forbidden' })
  await connectToDatabase()
  const wf = await Workflow.create({ ...req.body, tenantId: ctx.tenantId, createdBy: ctx.userId })
  return res.status(201).json({ id: wf._id.toString(), ...wf.toObject() })
}

export async function getById(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  await connectToDatabase()
  const tf = isValidObjectId(ctx.tenantId) ? { tenantId: ctx.tenantId } : {}
  const wf = await Workflow.findOne({ _id: req.params.id, ...tf }).lean()
  if (!wf) return res.status(404).json({ error: 'Not found' })
  const batches = await Batch.find({ workflowId: req.params.id, ...tf }).sort({ createdAt: -1 }).lean()
  return res.json({ id: wf._id.toString(), tenantId: wf.tenantId.toString(), projectId: wf.projectId?.toString(), name: wf.name, description: wf.description, type: wf.type, isActive: wf.isActive, createdAt: wf.createdAt, batches: batches.map(b => ({ id: b._id.toString(), workflowId: b.workflowId.toString(), workflowName: b.workflowName, title: b.title, description: b.description, taskType: b.taskType, priority: b.priority, workloadEstimate: b.workloadEstimate, status: b.status, tasksTotal: b.tasksTotal, tasksCompleted: b.tasksCompleted, deadline: b.deadline, createdAt: b.createdAt })) })
}

export async function update(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return res.status(403).json({ error: 'Forbidden' })
  await connectToDatabase()
  const tf = isValidObjectId(ctx.tenantId) ? { tenantId: ctx.tenantId } : {}
  const wf = await Workflow.findOneAndUpdate({ _id: req.params.id, ...tf }, req.body, { new: true }).lean()
  if (!wf) return res.status(404).json({ error: 'Not found' })
  return res.json({ id: wf._id.toString(), ...wf })
}

export async function patch(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return res.status(403).json({ error: 'Forbidden' })
  await connectToDatabase()
  const tf = isValidObjectId(ctx.tenantId) ? { tenantId: ctx.tenantId } : {}
  const wf = await Workflow.findOne({ _id: req.params.id, ...tf })
  if (!wf) return res.status(404).json({ error: 'Not found' })
  const { action, userId } = req.body
  if (action === 'assign') {
    if (!wf.assignedUsers.map((u: unknown) => (u as { toString(): string })?.toString()).includes(userId)) { wf.assignedUsers.push(userId); await wf.save() }
  } else if (action === 'unassign') {
    wf.assignedUsers = wf.assignedUsers.filter((u: unknown) => (u as { toString(): string })?.toString() !== userId) as typeof wf.assignedUsers
    await wf.save()
  }
  return res.json({ id: wf._id.toString(), assignedUsers: wf.assignedUsers.map((u: unknown) => (u as { toString(): string })?.toString()) })
}

export async function remove(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return res.status(403).json({ error: 'Forbidden' })
  await connectToDatabase()
  const tf = isValidObjectId(ctx.tenantId) ? { tenantId: ctx.tenantId } : {}
  const result = await Workflow.findOneAndDelete({ _id: req.params.id, ...tf })
  if (!result) return res.status(404).json({ error: 'Not found' })
  return res.json({ message: 'Deleted' })
}
