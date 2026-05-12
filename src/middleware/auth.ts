import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/jwt'

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/verify-otp',
  '/api/seed',
]

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_PATHS.includes(req.path) || req.method === 'OPTIONS') {
    return next()
  }

  const token = req.cookies?.lf_token

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const payload = await verifyToken(token)
  if (!payload) {
    res.clearCookie('lf_token')
    return res.status(401).json({ error: 'Invalid token' })
  }

  req.headers['x-user-id'] = payload.userId
  req.headers['x-user-email'] = payload.email
  req.headers['x-user-role'] = payload.role
  if (payload.tenantId) req.headers['x-tenant-id'] = payload.tenantId
  if (payload.clientSlug) req.headers['x-client-slug'] = payload.clientSlug

  next()
}
