import { Request, Response } from 'express'
import { requireTenant, isClientAdmin } from '../../lib/tenant'
import { listTasks, createTask, bulkCreateTasks, getTaskById, applyTaskAction, deleteTask } from './tasks.service'

export async function list(req: Request, res: Response) {
  try {
    const ctx = requireTenant(req, res)
    if (!ctx) return
    const q = req.query as Record<string, string>
    const tasks = await listTasks({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role, batchId: q.batchId, status: q.status, mine: q.mine, projectId: q.projectId, clientSlugParam: q.clientSlug, clientIdParam: q.clientId, workflow: q.workflow, annotatorEmail: q.annotatorEmail, reviewerEmail: q.reviewerEmail, dateFrom: q.dateFrom, dateTo: q.dateTo, dateExact: q.dateExact, viewAs: q.viewAs, page: q.page, limit: q.limit })
    return res.json(tasks)
  } catch (err) {
    console.error('[tasks GET]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function create(req: Request, res: Response) {
  try {
    const ctx = requireTenant(req, res)
    if (!ctx) return
    if (!isClientAdmin(ctx.role)) return res.status(403).json({ error: 'Forbidden' })
    const task = await createTask(ctx.tenantId, req.body)
    return res.status(201).json(task)
  } catch (err) {
    console.error('[tasks POST]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function bulkCreate(req: Request, res: Response) {
  try {
    const ctx = requireTenant(req, res)
    if (!ctx) return
    if (!isClientAdmin(ctx.role)) return res.status(403).json({ error: 'Forbidden' })
    const { batchId, tasks, metadata = {} } = req.body
    if (!batchId) return res.status(400).json({ error: 'batchId is required' })
    if (!Array.isArray(tasks) || tasks.length === 0) return res.status(400).json({ error: 'tasks must be a non-empty array' })
    const result = await bulkCreateTasks(ctx.tenantId, batchId, tasks, metadata)
    return res.status(result.errors > 0 && result.created === 0 ? 400 : 201).json(result)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return res.status(e.status ?? 500).json({ error: e.message ?? 'Internal server error' })
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const ctx = requireTenant(req, res)
    if (!ctx) return
    const task = await getTaskById(req.params.id as string, ctx.tenantId)
    return res.json(task)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return res.status(e.status ?? 500).json({ error: e.message ?? 'Internal server error' })
  }
}

export async function action(req: Request, res: Response) {
  try {
    const ctx = requireTenant(req, res)
    if (!ctx) return
    const task = await applyTaskAction(req.params.id as string, ctx, req.body)
    return res.json(task)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    console.error('[tasks/:id PATCH]', err)
    return res.status(e.status ?? 500).json({ error: e.message ?? 'Internal server error' })
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const ctx = requireTenant(req, res)
    if (!ctx) return
    if (!isClientAdmin(ctx.role)) return res.status(403).json({ error: 'Forbidden' })
    await deleteTask(req.params.id as string, ctx.tenantId)
    return res.json({ message: 'Deleted' })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return res.status(e.status ?? 500).json({ error: e.message ?? 'Internal server error' })
  }
}
