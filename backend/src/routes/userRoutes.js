import express from 'express';
import { loginUsuario, registerUsuario } from '../controllers/userController.js';

const router = express.Router();

router.post('/register', registerUsuario);
router.post('/login', loginUsuario);

export default router;
