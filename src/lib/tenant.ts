import { Request, Response } from 'express'

export function getTenantContext(req: Request) {
  return {
    tenantId: (req.headers['x-tenant-id'] as string) ?? '',
    clientSlug: (req.headers['x-client-slug'] as string) ?? '',
    userId: (req.headers['x-user-id'] as string) ?? '',
    email: (req.headers['x-user-email'] as string) ?? '',
    role: (req.headers['x-user-role'] as string) ?? '',
  }
}

export function requireTenant(req: Request, res: Response): {
  tenantId: string; userId: string; email: string; role: string; clientSlug: string
} | null {
  const role = (req.headers['x-user-role'] as string) ?? ''
  const tenantId = (req.headers['x-tenant-id'] as string) ?? ''
  const userId = (req.headers['x-user-id'] as string) ?? ''
  const email = (req.headers['x-user-email'] as string) ?? ''
  const clientSlug = (req.headers['x-client-slug'] as string) ?? ''

  if (role === 'super_admin') {
    return { tenantId, userId, email, role, clientSlug }
  }

  if (!tenantId) {
    res.status(403).json({ error: 'Client context required' })
    return null
  }

  return { tenantId, userId, email, role, clientSlug }
}

export function isSuperAdmin(role: string) { return role === 'super_admin' }
export function isClientAdmin(role: string) { return role === 'client_admin' || role === 'super_admin' }
export function isQaOrAbove(role: string) { return role === 'qa_lead' || isClientAdmin(role) }
export function isReviewerOrAbove(role: string) { return role === 'reviewer' || role === 'reviewer_annotator' || isQaOrAbove(role) }
export function isFieldWorker(role: string) { return role === 'annotator' || role === 'reviewer' || role === 'reviewer_annotator' }

export function forbidden(res: Response, message = 'Forbidden') {
  res.status(403).json({ error: message })
}

export function isValidObjectId(id: string): boolean {
  return !!id && /^[0-9a-f]{24}$/i.test(id)
}
