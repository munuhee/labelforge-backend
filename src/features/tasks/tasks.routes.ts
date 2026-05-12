import { Router } from 'express'
import { list, create, bulkCreate, getById, action, remove } from './tasks.controller'

const router = Router()

router.get('/',        list)
router.post('/',       create)
router.post('/bulk',   bulkCreate)
router.get('/:id',    getById)
router.patch('/:id',  action)
router.delete('/:id', remove)

export default router
