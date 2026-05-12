import { Router } from 'express'
import { list, create, getById, update, remove } from './batches.controller'

const router = Router()

router.get('/',        list)
router.post('/',       create)
router.get('/:id',    getById)
router.put('/:id',    update)
router.delete('/:id', remove)

export default router
