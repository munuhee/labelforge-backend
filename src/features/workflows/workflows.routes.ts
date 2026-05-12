import { Router } from 'express'
import { list, create, getById, update, patch, remove } from './workflows.controller'

const router = Router()

router.get('/',        list)
router.post('/',       create)
router.get('/:id',    getById)
router.put('/:id',    update)
router.patch('/:id',  patch)
router.delete('/:id', remove)

export default router
