import { Router } from 'express';
import { exportPatients, exportPayments, exportAppointments } from '../controllers/exportController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();
router.get('/patients', authenticate, exportPatients);
router.get('/payments', authenticate, exportPayments);
router.get('/appointments', authenticate, exportAppointments);

export default router;
