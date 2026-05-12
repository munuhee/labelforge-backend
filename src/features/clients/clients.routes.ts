import { Router } from 'express'
import { list, create, getById, update, deactivate, patch } from './clients.controller'

const router = Router()

router.get('/',        list)
router.post('/',       create)
router.get('/:id',    getById)
router.put('/:id',    update)
router.delete('/:id', deactivate)
router.patch('/:id',  patch)

export default router
