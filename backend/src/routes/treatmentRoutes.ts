import { Router } from 'express';
import { getTreatments, getTreatmentById, createTreatment, updateTreatment, completeTreatment } from '../controllers/treatmentController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();
router.get('/', authenticate, getTreatments);
router.get('/:id', authenticate, getTreatmentById);
router.post('/', authenticate, authorize(['ADMIN', 'ORTHODONTIST']), createTreatment);
router.put('/:id', authenticate, authorize(['ADMIN', 'ORTHODONTIST']), updateTreatment);
router.patch('/:id/complete', authenticate, authorize(['ADMIN', 'ORTHODONTIST']), completeTreatment);

export default router;
