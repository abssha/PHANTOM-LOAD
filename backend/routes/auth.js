import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import requireAuth from '../middleware/auth.js';
import { validateLogin, validateRegister } from '../middleware/validator.js';

const router = Router();

router.get('/me', requireAuth, authController.me);
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);

export default router;
