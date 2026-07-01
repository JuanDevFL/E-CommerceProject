import express from 'express';
import { createGuestOrder, createWompiWidgetConfig, getWompiTransactionById } from '../controllers/checkoutController.js';
import { checkoutOrderLimiter, checkoutWidgetLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/orders', checkoutOrderLimiter, createGuestOrder);
router.post('/wompi/widget', checkoutWidgetLimiter, createWompiWidgetConfig);
router.get('/wompi/transactions/:transactionId', checkoutWidgetLimiter, getWompiTransactionById);

export default router;