import { Router } from 'express'
import { run } from './seed.controller'

const router = Router()

router.post('/', run)

export default router
