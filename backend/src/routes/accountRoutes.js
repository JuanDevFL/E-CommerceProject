import express from 'express';
import {
  changePassword,
  createAddress,
  deleteAddress,
  getMyAddresses,
  getMyOrders,
  getMyProfile,
  updateAddress,
  updateMyProfile,
} from '../controllers/accountController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile);
router.put('/password', changePassword);

router.get('/orders', getMyOrders);

router.get('/addresses', getMyAddresses);
router.post('/addresses', createAddress);
router.put('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);

export default router;
