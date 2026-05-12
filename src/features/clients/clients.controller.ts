import { Request, Response } from 'express'
import { isSuperAdmin, forbidden } from '../../lib/tenant'
import { listClients, createClient, getClientById, updateClient, deactivateClient, patchClient } from './clients.service'

export async function list(req: Request, res: Response) {
  const role = req.headers['x-user-role'] as string
  if (!isSuperAdmin(role)) return forbidden(res)
  return res.json(await listClients())
}

export async function create(req: Request, res: Response) {
  const role = req.headers['x-user-role'] as string
  if (!isSuperAdmin(role)) return forbidden(res)
  const { name, slug } = req.body
  if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' })
  try {
    const client = await createClient({ ...req.body, userId: req.headers['x-user-id'] as string })
    return res.status(201).json(client)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return res.status(e.status ?? 500).json({ error: e.message })
  }
}

export async function getById(req: Request, res: Response) {
  const role = req.headers['x-user-role'] as string
  const tenantId = req.headers['x-tenant-id'] as string
  if (!isSuperAdmin(role) && tenantId !== req.params.id) return forbidden(res)
  try {
    return res.json(await getClientById(req.params.id))
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return res.status(e.status ?? 500).json({ error: e.message })
  }
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const role = req.headers['x-user-role'] as string
  const tenantId = req.headers['x-tenant-id'] as string
  if (!isSuperAdmin(role) && (role !== 'client_admin' || tenantId !== id)) return forbidden(res)
  const allowed = ['name', 'description', 'logoUrl', 'settings', 'plan', 'isActive'] as const
  const upd: Record<string, unknown> = {}
  for (const key of allowed) { if (req.body[key] !== undefined) upd[key] = req.body[key] }
  if (!isSuperAdmin(role)) { delete upd.isActive; delete upd.plan }
  try {
    return res.json(await updateClient(id, upd))
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return res.status(e.status ?? 500).json({ error: e.message })
  }
}

export async function deactivate(req: Request, res: Response) {
  if (!isSuperAdmin(req.headers['x-user-role'] as string)) return forbidden(res)
  await deactivateClient(req.params.id)
  return res.json({ success: true })
}

export async function patch(req: Request, res: Response) {
  if (!isSuperAdmin(req.headers['x-user-role'] as string)) return forbidden(res)
  try {
    await patchClient(req.params.id, req.body.action)
    return res.json({ success: true })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return res.status(e.status ?? 400).json({ error: e.message })
  }
}
