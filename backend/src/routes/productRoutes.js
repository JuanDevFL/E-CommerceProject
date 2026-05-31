import express from 'express';
import { getProductos, createProducto, updateProducto } from '../controllers/productController.js';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getProductos);
router.post('/', requireAuth, requireAdmin, createProducto);
router.put('/:id', requireAuth, requireAdmin, updateProducto);

export default router;
