import express from 'express';
import { createGuestOrder, createWompiWidgetConfig } from '../controllers/checkoutController.js';
import { checkoutOrderLimiter, checkoutWidgetLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/orders', checkoutOrderLimiter, createGuestOrder);
router.post('/wompi/widget', checkoutWidgetLimiter, createWompiWidgetConfig);

export default router;