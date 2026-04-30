import { Router } from 'express';
import { getAppointments, createAppointment, updateAppointmentStatus, getAppointmentCountByRange } from '../controllers/appointmentController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();
router.get('/', authenticate, getAppointments);
router.get('/count', authenticate, getAppointmentCountByRange);
router.post('/', authenticate, createAppointment);
router.patch('/:id/status', authenticate, updateAppointmentStatus);

export default router;
