import express from 'express';
import { createAnnouncement, getAdminDashboard, getOrderDetail, updateAnnouncement, updateOrderStatus, updateUsuarioRol } from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);
router.get('/dashboard', getAdminDashboard);
router.get('/orders/:orderId', getOrderDetail);
router.patch('/orders/:orderId/status', updateOrderStatus);
router.patch('/users/:userId/role', updateUsuarioRol);
router.post('/announcements', createAnnouncement);
router.put('/announcements/:announcementId', updateAnnouncement);

export default router;
