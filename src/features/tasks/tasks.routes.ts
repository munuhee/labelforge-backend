import { Router } from 'express'
import { list, create, bulkCreate, getById, action, remove, extensionData } from './tasks.controller'

const router = Router()

router.get('/',                      list)
router.post('/',                     create)
router.post('/bulk',                 bulkCreate)
router.get('/:id',                   getById)
router.patch('/:id',                 action)
router.delete('/:id',                remove)
router.post('/:id/extension-data',   extensionData)

export default router
