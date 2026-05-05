import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login } from '../controllers/authController';

const router = Router();

// Rate limiting: max 5 intentos por IP cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, login);

export default router;
