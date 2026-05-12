import { Request, Response } from 'express'
import { requireTenant, isClientAdmin, forbidden } from '../../lib/tenant'
import { connectToDatabase } from '../../lib/mongodb'
import Project from '../../models/Project'

const serialize = (p: Record<string, unknown>) => ({ id: (p._id as { toString(): string }).toString(), tenantId: (p.tenantId as { toString(): string }).toString(), name: p.name, description: p.description, guidelines: p.guidelines, taskTypes: p.taskTypes, workflowStages: p.workflowStages, isActive: p.isActive, createdAt: p.createdAt })

export async function list(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  await connectToDatabase()
  return res.json((await Project.find({ tenantId: ctx.tenantId, isActive: true }).sort({ createdAt: -1 }).lean()).map(p => serialize(p as unknown as Record<string, unknown>)))
}

export async function create(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return forbidden(res)
  if (!req.body.name) return res.status(400).json({ error: 'name is required' })
  await connectToDatabase()
  const project = await Project.create({ tenantId: ctx.tenantId, createdBy: ctx.userId, taskTypes: [], workflowStages: ['annotation', 'review'], ...req.body })
  return res.status(201).json(serialize(project.toObject() as unknown as Record<string, unknown>))
}

export async function getById(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  await connectToDatabase()
  const project = await Project.findOne({ _id: req.params.id, tenantId: ctx.tenantId }).lean()
  if (!project) return res.status(404).json({ error: 'Not found' })
  return res.json(serialize(project as unknown as Record<string, unknown>))
}

export async function update(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return forbidden(res)
  const allowed = ['name', 'description', 'guidelines', 'taskTypes', 'workflowStages', 'isActive'] as const
  const upd: Record<string, unknown> = {}
  for (const key of allowed) { if (req.body[key] !== undefined) upd[key] = req.body[key] }
  await connectToDatabase()
  const project = await Project.findOneAndUpdate({ _id: req.params.id, tenantId: ctx.tenantId }, upd, { new: true }).lean()
  if (!project) return res.status(404).json({ error: 'Not found' })
  return res.json(serialize(project as unknown as Record<string, unknown>))
}

export async function remove(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return forbidden(res)
  await connectToDatabase()
  await Project.findOneAndUpdate({ _id: req.params.id, tenantId: ctx.tenantId }, { isActive: false })
  return res.json({ success: true })
}
