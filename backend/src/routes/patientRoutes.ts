import { Router } from 'express';
import { getPatients, getPatientById, createPatient, updatePatient, deletePatient } from '../controllers/patientController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();
router.get('/', authenticate, getPatients);
router.get('/:id', authenticate, getPatientById);
router.post('/', authenticate, authorize(['ADMIN', 'RECEPTIONIST']), createPatient);
router.put('/:id', authenticate, authorize(['ADMIN', 'RECEPTIONIST', 'ORTHODONTIST', 'EXTERNAL']), updatePatient);
router.delete('/:id', authenticate, authorize(['ADMIN']), deletePatient);

export default router;
