import express from 'express';
import { getAdminDashboard, getOrderDetail, updateUsuarioRol } from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);
router.get('/dashboard', getAdminDashboard);
router.get('/orders/:orderId', getOrderDetail);
router.patch('/users/:userId/role', updateUsuarioRol);

export default router;
