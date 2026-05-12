import { Request, Response } from 'express'
import { requireTenant, isClientAdmin, isSuperAdmin, forbidden, isValidObjectId } from '../../lib/tenant'
import { connectToDatabase } from '../../lib/mongodb'
import ClientMembership from '../../models/ClientMembership'
import User from '../../models/User'
import Client from '../../models/Client'

export async function list(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return forbidden(res)

  const { clientId: clientIdParam, clientSlug: clientSlugParam } = req.query as Record<string, string>
  let tenantId = ctx.tenantId

  await connectToDatabase()
  if (isSuperAdmin(ctx.role)) {
    if (clientSlugParam) {
      const client = await Client.findOne({ slug: clientSlugParam }).lean()
      if (!client) return res.status(404).json({ error: 'Workspace not found' })
      tenantId = (client._id as { toString(): string }).toString()
    } else if (clientIdParam && isValidObjectId(clientIdParam)) {
      tenantId = clientIdParam
    }
  }
  if (!isValidObjectId(tenantId)) return forbidden(res, 'Client context required')

  const memberships = await ClientMembership.find({ tenantId }).populate('userId', 'name email department isActive badges createdAt').sort({ joinedAt: -1 }).lean()
  return res.json(memberships.map(m => {
    const user = m.userId as unknown as { _id: { toString(): string }; name: string; email: string; department?: string; isActive: boolean; badges: unknown[] }
    return { id: m._id.toString(), userId: user._id.toString(), name: user.name, email: user.email, department: user.department, isActive: m.isActive, role: m.role, joinedAt: m.joinedAt }
  }))
}

export async function add(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return forbidden(res)

  const { userId, email, role, clientId: bodyClientId } = req.body
  const validRoles = ['client_admin', 'qa_lead', 'reviewer', 'annotator', 'reviewer_annotator']
  if (!role || !validRoles.includes(role)) return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` })
  if (role === 'client_admin' && !isClientAdmin(ctx.role)) return forbidden(res)

  const tenantId = (isSuperAdmin(ctx.role) && bodyClientId) ? bodyClientId : ctx.tenantId
  if (!tenantId) return forbidden(res, 'Client context required')

  await connectToDatabase()
  let targetUser
  if (userId) targetUser = await User.findById(userId)
  else if (email) targetUser = await User.findOne({ email: email.toLowerCase() })
  if (!targetUser) return res.status(404).json({ error: 'User not found' })
  if (targetUser.role === 'super_admin') return res.status(400).json({ error: 'Super admins access all workspaces globally' })

  const membership = await ClientMembership.findOneAndUpdate({ userId: targetUser._id, tenantId }, { role, isActive: true, joinedAt: new Date() }, { upsert: true, new: true })
  return res.status(201).json({ id: membership._id.toString(), userId: targetUser._id.toString(), tenantId, role: membership.role, isActive: membership.isActive, joinedAt: membership.joinedAt })
}

export async function patch(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  if (!isClientAdmin(ctx.role)) return forbidden(res)

  const { membershipId, action, role } = req.body
  await connectToDatabase()
  const q = isValidObjectId(ctx.tenantId) ? { _id: membershipId, tenantId: ctx.tenantId } : { _id: membershipId }
  const membership = await ClientMembership.findOne(q)
  if (!membership) return res.status(404).json({ error: 'Membership not found' })

  if (action === 'update-role') {
    if (!role) return res.status(400).json({ error: 'role is required' })
    if (role === 'client_admin' && !isSuperAdmin(ctx.role)) return forbidden(res)
    membership.role = role; await membership.save()
  } else if (action === 'deactivate') {
    membership.isActive = false; await membership.save()
  } else if (action === 'reactivate') {
    membership.isActive = true; await membership.save()
  } else {
    return res.status(400).json({ error: 'Unknown action' })
  }
  return res.json({ success: true, role: membership.role, isActive: membership.isActive })
}
