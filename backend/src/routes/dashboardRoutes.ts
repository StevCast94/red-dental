import { Router } from 'express';
import { getStats } from '../controllers/dashboardController';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.get('/', authenticate, getStats);
export default router;
