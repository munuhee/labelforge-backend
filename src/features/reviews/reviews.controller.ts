import { Request, Response } from 'express'
import { requireTenant } from '../../lib/tenant'
import { listReviews, getReviewById, applyReviewAction } from './reviews.service'

export async function list(req: Request, res: Response) {
  try {
    const ctx = requireTenant(req, res)
    if (!ctx) return
    const q = req.query as Record<string, string>
    const reviews = await listReviews({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role, status: q.status, mine: q.mine, projectId: q.projectId, clientSlugParam: q.clientSlug, clientIdParam: q.clientId })
    return res.json(reviews)
  } catch (err) {
    console.error('[reviews GET]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const ctx = requireTenant(req, res)
    if (!ctx) return
    const review = await getReviewById(req.params.id as string, ctx.tenantId)
    return res.json(review)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return res.status(e.status ?? 500).json({ error: e.message ?? 'Internal server error' })
  }
}

export async function action(req: Request, res: Response) {
  try {
    const ctx = requireTenant(req, res)
    if (!ctx) return
    const review = await applyReviewAction(req.params.id as string, ctx, req.body)
    return res.json(review)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    console.error('[reviews/:id PATCH]', err)
    return res.status(e.status ?? 500).json({ error: e.message ?? 'Internal server error' })
  }
}
