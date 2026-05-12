import { Router } from 'express'
import { list, getById, action } from './reviews.controller'

const router = Router()

router.get('/',       list)
router.get('/:id',   getById)
router.patch('/:id', action)

export default router
