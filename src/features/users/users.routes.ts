import { Router } from 'express'
import { list, create, update, patch } from './users.controller'

const router = Router()

router.get('/',       list)
router.post('/',      create)
router.put('/:id',   update)
router.patch('/:id', patch)

export default router
