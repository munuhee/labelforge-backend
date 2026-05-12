import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { authMiddleware } from './middleware/auth'

import authRoutes         from './features/auth'
import clientRoutes       from './features/clients'
import projectRoutes      from './features/projects'
import membershipRoutes   from './features/memberships'
import workflowRoutes     from './features/workflows'
import batchRoutes        from './features/batches'
import taskRoutes         from './features/tasks'
import reviewRoutes       from './features/reviews'
import notificationRoutes from './features/notifications'
import userRoutes         from './features/users'
import analyticsRoutes    from './features/analytics'
import seedRoutes         from './features/seed'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

app.use(authMiddleware)

app.use('/api/auth',          authRoutes)
app.use('/api/clients',       clientRoutes)
app.use('/api/projects',      projectRoutes)
app.use('/api/memberships',   membershipRoutes)
app.use('/api/workflows',     workflowRoutes)
app.use('/api/batches',       batchRoutes)
app.use('/api/tasks',         taskRoutes)
app.use('/api/reviews',       reviewRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/users',         userRoutes)
app.use('/api/analytics',     analyticsRoutes)
app.use('/api/seed',          seedRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.listen(PORT, () => {
  console.log(`LabelForge API running on http://localhost:${PORT}`)
})

export default app
