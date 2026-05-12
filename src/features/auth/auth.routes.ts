import { Router } from 'express'
import { handleLogin, handleVerifyOtp, handleMe, handleLogout, handleImpersonate } from './auth.controller'

const router = Router()

router.post('/login',       handleLogin)
router.post('/verify-otp',  handleVerifyOtp)
router.get('/me',           handleMe)
router.post('/logout',      handleLogout)
router.post('/impersonate', handleImpersonate)

export default router
