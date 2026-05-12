import { Request, Response } from 'express'
import { requireTenant, isValidObjectId } from '../../lib/tenant'
import { connectToDatabase } from '../../lib/mongodb'
import Notification from '../../models/Notification'

const tenantFilter = (tenantId: string) => isValidObjectId(tenantId)
  ? { $or: [{ tenantId }, { tenantId: { $exists: false } }] }
  : { $or: [{ tenantId: { $exists: false } }] }

export async function list(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  await connectToDatabase()
  const notifications = await Notification.find({ userId: ctx.userId, ...tenantFilter(ctx.tenantId) }).sort({ createdAt: -1 }).limit(50).lean()
  return res.json(notifications.map(n => ({ id: n._id.toString(), tenantId: n.tenantId?.toString(), userId: n.userId.toString(), type: n.type, title: n.title, message: n.message, read: n.read, actionUrl: n.actionUrl, createdAt: n.createdAt })))
}

export async function markAllRead(req: Request, res: Response) {
  const ctx = requireTenant(req, res)
  if (!ctx) return
  await connectToDatabase()
  if (req.body.markAllRead) await Notification.updateMany({ userId: ctx.userId, read: false, ...tenantFilter(ctx.tenantId) }, { read: true })
  return res.json({ message: 'Updated' })
}

export async function markOneRead(req: Request, res: Response) {
  const userId = req.headers['x-user-id'] as string
  await connectToDatabase()
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, userId }, { read: true }, { new: true })
  if (!notification) return res.status(404).json({ error: 'Not found' })
  return res.json({ id: notification._id.toString(), read: notification.read })
}
