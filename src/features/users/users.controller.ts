import { Request, Response } from 'express'
import { requireTenant, isClientAdmin, isQaOrAbove, isSuperAdmin, isValidObjectId } from '../../lib/tenant'
import { connectToDatabase } from '../../lib/mongodb'
import User from '../../models/User'
import ClientMembership from '../../models/ClientMembership'
import Client from '../../models/Client'

const serializeUser = (u: Record<string, unknown>, role?: string) => ({ id: (u._id as { toString(): string }).toString(), name: u.name, email: u.email, role: role ?? u.role, department: u.department, isActive: u.isActive, badges: u.badges, createdAt: u.createdAt })

export async function list(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isQaOrAbove(ctx.role)) return res.status(403).json({ error: 'Forbidden' })
  await connectToDatabase()
  const { clientSlug: clientSlugParam, clientId: clientIdParam } = req.query as Record<string, string>

  if (isSuperAdmin(ctx.role)) {
    let scopeTenantId: string | null = null
    if (clientSlugParam) { const c = await Client.findOne({ slug: clientSlugParam }).lean(); if (c) scopeTenantId = (c._id as { toString(): string }).toString() }
    else if (clientIdParam && isValidObjectId(clientIdParam)) scopeTenantId = clientIdParam

    if (scopeTenantId) {
      const memberships = await ClientMembership.find({ tenantId: scopeTenantId, isActive: true }).populate('userId', 'name email department isActive badges createdAt').lean()
      return res.json(memberships.map(m => { const u = m.userId as unknown as Record<string, unknown>; return serializeUser(u, m.role) }))
    }
    const users = await User.find({}).select('-passwordHash -otp -otpExpiry').lean()
    return res.json(users.map(u => serializeUser(u as unknown as Record<string, unknown>)))
  }

  const memberships = await ClientMembership.find({ tenantId: ctx.tenantId, isActive: true }).populate('userId', 'name email department isActive badges createdAt').lean()
  return res.json(memberships.map(m => { const u = m.userId as unknown as Record<string, unknown>; return serializeUser(u, m.role) }))
}

export async function create(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return res.status(403).json({ error: 'Forbidden' })
  const bcrypt = await import('bcryptjs')
  const passwordHash = await bcrypt.hash(req.body.password, 12)
  const validRoles = ['client_admin', 'qa_lead', 'reviewer', 'annotator', 'reviewer_annotator']
  const role = req.body.role && validRoles.includes(req.body.role) ? req.body.role : 'annotator'
  try {
    await connectToDatabase()
    const user = await User.create({ name: req.body.name, email: req.body.email, passwordHash, role, department: req.body.department || '' })
    await ClientMembership.create({ userId: user._id, tenantId: ctx.tenantId, role })
    return res.status(201).json({ id: user._id.toString(), name: user.name, email: user.email, role: user.role })
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) return res.status(409).json({ error: 'Email already exists' })
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role) && ctx.userId !== id) return res.status(403).json({ error: 'Forbidden' })
  const upd: Record<string, unknown> = {}
  if (req.body.name) upd.name = req.body.name
  if (req.body.department !== undefined) upd.department = req.body.department
  await connectToDatabase()
  if (isClientAdmin(ctx.role)) {
    if (req.body.isActive !== undefined) upd.isActive = req.body.isActive
    const mf = isValidObjectId(ctx.tenantId) ? { tenantId: ctx.tenantId } : {}
    if (req.body.role) await ClientMembership.findOneAndUpdate({ userId: id, ...mf }, { role: req.body.role })
  }
  const user = await User.findByIdAndUpdate(id, upd, { new: true }).select('-passwordHash -otp -otpExpiry')
  if (!user) return res.status(404).json({ error: 'Not found' })
  const mf2 = isValidObjectId(ctx.tenantId) ? { tenantId: ctx.tenantId } : {}
  const membership = await ClientMembership.findOne({ userId: id, ...mf2 })
  return res.json({ id: user._id.toString(), name: user.name, email: user.email, role: membership?.role ?? user.role, department: user.department, isActive: user.isActive, badges: user.badges })
}

export async function patch(req: Request, res: Response) {
  const { id } = req.params
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return res.status(403).json({ error: 'Forbidden' })
  const { action, badge } = req.body
  await connectToDatabase()
  const user = await User.findById(id)
  if (!user) return res.status(404).json({ error: 'Not found' })
  if (action === 'award-badge') { user.badges.push({ ...badge, awardedAt: new Date() }); await user.save() }
  else if (action === 'remove-badge') { user.badges = user.badges.filter(b => b.name !== badge.name); await user.save() }
  return res.json({ id: user._id.toString(), badges: user.badges })
}
