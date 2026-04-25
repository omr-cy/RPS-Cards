import { Router } from 'express';
import { register, login, resendCode, verifyCode, verifyGet } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/resend-code', resendCode);
router.post('/verify-code', verifyCode);
router.get('/verify', verifyGet);

export const authRoutes = router;
