import express from 'express';
import { createAnnouncement, getAdminDashboard, getOrderDetail, updateAnnouncement, updateOrderStatus, uploadImage, updateUsuarioRol } from '../controllers/adminController.js';
import multer from 'multer';
import { downloadOfflineSalesTemplate, importOfflineSalesWorkbook } from '../controllers/offlineSalesController.js';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
const offlineSalesUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
});

const imageUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter(_req, file, cb) {
		if (!file.mimetype.startsWith('image/')) {
			cb(new Error('Solo se permiten archivos de imagen'));
			return;
		}
		cb(null, true);
	},
});

function handleImageUpload(req, res, next) {
	imageUpload.single('imagen')(req, res, (error) => {
		if (!error) {
			next();
			return;
		}
		if (error.code === 'LIMIT_FILE_SIZE') {
			res.status(400).json({ error: 'La imagen excede el límite de 5 MB' });
			return;
		}
		res.status(400).json({ error: error.message || 'No se pudo procesar la imagen' });
	});
}

function handleOfflineSalesUpload(req, res, next) {
	offlineSalesUpload.single('file')(req, res, (error) => {
		if (!error) {
			next();
			return;
		}

		if (error.code === 'LIMIT_FILE_SIZE') {
			res.status(400).json({ error: 'El archivo excede el limite de 5 MB para la importacion.' });
			return;
		}

		res.status(400).json({ error: error.message || 'No se pudo procesar el archivo enviado.' });
	});
}

router.use(requireAuth, requireAdmin);
router.post('/upload-image', handleImageUpload, uploadImage);
router.get('/dashboard', getAdminDashboard);
router.get('/offline-sales/template', downloadOfflineSalesTemplate);
router.post('/offline-sales/import', handleOfflineSalesUpload, importOfflineSalesWorkbook);
router.get('/orders/:orderId', getOrderDetail);
router.patch('/orders/:orderId/status', updateOrderStatus);
router.patch('/users/:userId/role', updateUsuarioRol);
router.post('/announcements', createAnnouncement);
router.put('/announcements/:announcementId', updateAnnouncement);

export default router;
