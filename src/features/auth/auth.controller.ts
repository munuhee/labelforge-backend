import { Request, Response } from 'express'
import { isSuperAdmin, forbidden } from '../../lib/tenant'
import { login, verifyOtp, getMe, impersonate } from './auth.service'

export async function handleLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    const result = await login(email, password)
    return res.json({ message: 'OTP sent to your email', testOtp: result.testOtp })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    console.error('[auth/login]', err)
    return res.status(e.status ?? 500).json({ error: e.message ?? 'Internal server error' })
  }
}

export async function handleVerifyOtp(req: Request, res: Response) {
  try {
    const { email, otp, clientSlug } = req.body
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' })
    const { token, user } = await verifyOtp(email, otp, clientSlug)
    res.cookie('lf_token', token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 86400000, path: '/' })
    return res.json({ user })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    console.error('[auth/verify-otp]', err)
    return res.status(e.status ?? 500).json({ error: e.message ?? 'Internal server error' })
  }
}

export async function handleMe(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const user = await getMe(userId, req.headers['x-user-role'] as string, req.headers['x-tenant-id'] as string | undefined, req.headers['x-client-slug'] as string | undefined)
    const impersonatedBy = req.headers['x-impersonated-by'] as string | undefined
    return res.json({ ...user, ...(impersonatedBy ? { impersonatedBy } : {}) })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    console.error('[auth/me]', err)
    return res.status(e.status ?? 500).json({ error: e.message ?? 'Internal server error' })
  }
}

export function handleLogout(_req: Request, res: Response) {
  res.clearCookie('lf_token')
  return res.json({ message: 'Logged out' })
}

export async function handleImpersonate(req: Request, res: Response) {
  try {
    const role = req.headers['x-user-role'] as string
    if (!isSuperAdmin(role)) return forbidden(res)
    const { targetUserId, clientSlug } = req.body
    if (!targetUserId || !clientSlug) return res.status(400).json({ error: 'targetUserId and clientSlug are required' })
    const { token, message, user } = await impersonate(req.headers['x-user-id'] as string, targetUserId, clientSlug)
    res.cookie('lf_token', token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600000, path: '/' })
    return res.json({ message, user })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return res.status(e.status ?? 500).json({ error: e.message ?? 'Internal server error' })
  }
}
