import { Router } from 'express'
import { list, add, patch } from './memberships.controller'

const router = Router()

router.get('/',    list)
router.post('/',   add)
router.patch('/',  patch)

export default router
