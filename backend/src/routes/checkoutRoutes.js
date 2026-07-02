import express from 'express';
import { createGuestOrder, createWompiWidgetConfig, getWompiTransactionById, handleWompiWebhook } from '../controllers/checkoutController.js';
import { checkoutOrderLimiter, checkoutWidgetLimiter, wompiWebhookLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/orders', checkoutOrderLimiter, createGuestOrder);
router.post('/wompi/widget', checkoutWidgetLimiter, createWompiWidgetConfig);
router.get('/wompi/transactions/:transactionId', checkoutWidgetLimiter, getWompiTransactionById);
router.post('/wompi/webhook', wompiWebhookLimiter, handleWompiWebhook);

export default router;