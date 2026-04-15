import express from 'express';
import { getAdminDashboard, updateUsuarioRol } from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);
router.get('/dashboard', getAdminDashboard);
router.patch('/users/:userId/role', updateUsuarioRol);

export default router;
