import { connectToDatabase } from '../../lib/mongodb'
import Client from '../../models/Client'
import ClientMembership from '../../models/ClientMembership'
import Project from '../../models/Project'

const serialize = (c: Record<string, unknown>) => ({ id: (c._id as { toString(): string }).toString(), name: c.name, slug: c.slug, description: c.description, logoUrl: c.logoUrl, isActive: c.isActive, plan: c.plan, settings: c.settings, createdAt: c.createdAt })

export async function listClients() {
  await connectToDatabase()
  return (await Client.find().sort({ createdAt: -1 }).lean()).map(c => serialize(c as unknown as Record<string, unknown>))
}

export async function createClient(data: { name: string; slug: string; description?: string; plan?: string; logoUrl?: string; settings?: unknown; userId?: string }) {
  await connectToDatabase()
  if (await Client.findOne({ slug: data.slug })) throw Object.assign(new Error('Slug already in use'), { status: 409 })
  const client = await Client.create({ ...data, plan: data.plan ?? 'starter', createdBy: data.userId })
  return serialize(client.toObject() as unknown as Record<string, unknown>)
}

export async function getClientById(id: string) {
  await connectToDatabase()
  const client = await Client.findById(id).lean()
  if (!client) throw Object.assign(new Error('Not found'), { status: 404 })
  return serialize(client as unknown as Record<string, unknown>)
}

export async function updateClient(id: string, update: Record<string, unknown>) {
  await connectToDatabase()
  const client = await Client.findByIdAndUpdate(id, update, { new: true }).lean()
  if (!client) throw Object.assign(new Error('Not found'), { status: 404 })
  return serialize(client as unknown as Record<string, unknown>)
}

export async function deactivateClient(id: string) {
  await connectToDatabase()
  await Client.findByIdAndUpdate(id, { isActive: false })
}

export async function patchClient(id: string, action: string) {
  await connectToDatabase()
  if (action === 'activate') { await Client.findByIdAndUpdate(id, { isActive: true }); return }
  if (action === 'purge') { await Promise.all([Client.findByIdAndDelete(id), ClientMembership.deleteMany({ tenantId: id }), Project.deleteMany({ tenantId: id })]); return }
  throw Object.assign(new Error('Unknown action'), { status: 400 })
}
