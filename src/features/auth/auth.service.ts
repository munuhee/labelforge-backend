import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { connectToDatabase } from '../../lib/mongodb'
import { signToken } from '../../lib/jwt'
import User from '../../models/User'
import Client from '../../models/Client'
import ClientMembership from '../../models/ClientMembership'

export async function login(email: string, password: string) {
  await connectToDatabase()
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true })
  if (!user) throw Object.assign(new Error('Invalid email or password'), { status: 401 })
  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) throw Object.assign(new Error('Invalid email or password'), { status: 401 })
  const otp = crypto.randomInt(100000, 999999).toString()
  user.otp = otp
  user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000)
  await user.save()
  return { testOtp: otp }
}

export async function verifyOtp(email: string, otp: string, clientSlug?: string) {
  await connectToDatabase()
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) throw Object.assign(new Error('Invalid OTP'), { status: 401 })
  if (!user.otp || user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
    throw Object.assign(new Error('Invalid or expired OTP'), { status: 401 })
  }
  user.otp = undefined; user.otpExpiry = undefined
  await user.save()

  let tenantId: string | undefined
  let resolvedClientSlug: string | undefined
  let clientRole: string = user.role

  if (user.role === 'super_admin') {
    // no tenant context
  } else if (clientSlug) {
    const client = await Client.findOne({ slug: clientSlug, isActive: true })
    if (!client) throw Object.assign(new Error('Workspace not found'), { status: 404 })
    const membership = await ClientMembership.findOne({ userId: user._id, tenantId: client._id, isActive: true })
    if (!membership) throw Object.assign(new Error('You do not have access to this workspace'), { status: 403 })
    tenantId = client._id.toString(); resolvedClientSlug = client.slug; clientRole = membership.role
  } else {
    const membership = await ClientMembership.findOne({ userId: user._id, isActive: true })
      .populate<{ tenantId: { _id: { toString(): string }; slug: string } }>('tenantId')
    if (membership) {
      const populated = membership.tenantId as unknown as { _id: { toString(): string }; slug: string }
      tenantId = populated._id.toString(); resolvedClientSlug = populated.slug; clientRole = membership.role
    }
  }

  const token = await signToken({ userId: user._id.toString(), email: user.email, role: clientRole, tenantId, clientSlug: resolvedClientSlug })
  return { token, user: { id: user._id.toString(), name: user.name, email: user.email, role: clientRole, tenantId, clientSlug: resolvedClientSlug, department: user.department, badges: user.badges } }
}

export async function getMe(userId: string, role: string, tenantId?: string, clientSlug?: string) {
  await connectToDatabase()
  const user = await User.findById(userId).select('-passwordHash -otp -otpExpiry')
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 })
  return { id: user._id.toString(), name: user.name, email: user.email, role, tenantId, clientSlug, department: user.department, badges: user.badges, createdAt: user.createdAt }
}

export async function impersonate(requesterId: string, targetUserId: string, clientSlug: string) {
  await connectToDatabase()
  const targetUser = await User.findById(targetUserId).select('-passwordHash -otp -otpExpiry')
  if (!targetUser) throw Object.assign(new Error('Target user not found'), { status: 404 })
  if (targetUser.role === 'super_admin') throw Object.assign(new Error('Cannot impersonate another super_admin'), { status: 400 })
  const client = await Client.findOne({ slug: clientSlug, isActive: true })
  if (!client) throw Object.assign(new Error('Workspace not found'), { status: 404 })
  const membership = await ClientMembership.findOne({ userId: targetUser._id, tenantId: client._id, isActive: true })
  if (!membership) throw Object.assign(new Error('Target user has no membership in this workspace'), { status: 404 })
  const token = await signToken({ userId: targetUser._id.toString(), email: targetUser.email, role: membership.role, tenantId: client._id.toString(), clientSlug: client.slug, impersonatedBy: requesterId })
  return { token, message: `Now impersonating ${targetUser.name} in workspace "${client.name}"`, user: { id: targetUser._id.toString(), name: targetUser.name, email: targetUser.email, role: membership.role, tenantId: client._id.toString(), clientSlug: client.slug } }
}
