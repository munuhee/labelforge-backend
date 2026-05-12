import { Router } from 'express'
import { get } from './analytics.controller'

const router = Router()

router.get('/', get)

export default router
