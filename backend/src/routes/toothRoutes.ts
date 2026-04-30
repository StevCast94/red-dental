import { Router } from 'express';
import { getToothRecords, upsertSingleFace, updateAllTeeth } from '../controllers/toothController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();
router.get('/:patientId', authenticate, getToothRecords);
router.post('/:patientId/single', authenticate, upsertSingleFace);
router.put('/:patientId/batch', authenticate, updateAllTeeth);

export default router;