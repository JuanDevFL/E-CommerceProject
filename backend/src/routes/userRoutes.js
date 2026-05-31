import express from 'express';
import { forgotPassword, loginUsuario, logoutUsuario, refreshToken, registerUsuario, resetPassword } from '../controllers/userController.js';
import { forgotPasswordLimiter, loginLimiter, registerLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', registerLimiter, registerUsuario);
router.post('/login', loginLimiter, loginUsuario);
router.post('/refresh-token', refreshToken);
router.post('/logout', logoutUsuario);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
