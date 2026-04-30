import { Router } from 'express';
import { getPayments, getPaymentById, createPayment, updatePayment, deletePayment } from '../controllers/paymentController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();
router.get('/', authenticate, getPayments);
router.get('/:id', authenticate, getPaymentById);
router.post('/', authenticate, authorize(['ADMIN', 'RECEPTIONIST']), createPayment);
router.put('/:id', authenticate, authorize(['ADMIN', 'RECEPTIONIST']), updatePayment);
router.delete('/:id', authenticate, authorize(['ADMIN']), deletePayment);

export default router;
