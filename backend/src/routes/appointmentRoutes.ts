import { Router } from 'express';
import { getAppointments, createAppointment, updateAppointmentStatus, updateAppointment, deleteAppointment, getAppointmentById, getAppointmentCountByRange, getOccupiedSlots } from '../controllers/appointmentController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();
router.get('/', authenticate, getAppointments);
router.get('/count', authenticate, getAppointmentCountByRange);
router.get('/slots', authenticate, getOccupiedSlots);
router.post('/', authenticate, createAppointment);
router.patch('/:id/status', authenticate, updateAppointmentStatus);
router.put('/:id', authenticate, updateAppointment);
router.delete('/:id', authenticate, deleteAppointment);
router.get('/:id', authenticate, getAppointmentById);

export default router;
