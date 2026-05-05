import { Router } from 'express';
import { getRevenueReport, getAppointmentsReport, getTreatmentsReport, getDashboardMetrics, getPatientMetrics } from '../controllers/reportsController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();
router.get('/revenue', authenticate, getRevenueReport);
router.get('/appointments', authenticate, getAppointmentsReport);
router.get('/treatments', authenticate, getTreatmentsReport);
router.get('/metrics', authenticate, getDashboardMetrics);
router.get('/patients', authenticate, getPatientMetrics);

export default router;
