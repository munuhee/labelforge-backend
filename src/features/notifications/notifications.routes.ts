import { Router } from 'express'
import { list, markAllRead, markOneRead } from './notifications.controller'

const router = Router()

router.get('/',       list)
router.put('/',       markAllRead)
router.patch('/:id', markOneRead)

export default router
