import express from 'express';
import { getProductos, createProducto } from '../controllers/productController.js';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getProductos);
router.post('/', requireAuth, requireAdmin, createProducto);

export default router;
