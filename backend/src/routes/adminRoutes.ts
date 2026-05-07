import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import {
  getAdminDashboard,
  toggleClinic,
  updateSubscription,
  getClinics,
  createClinic,
  updateClinic,
  deleteClinic,
  getClinicUsers,
  createUser,
  resetUserPassword,
  toggleUser,
  getPayments,
  createPayment,
  updatePaymentStatus,
  getLoginLogs,
  impersonateClinic,
  exportClinicBackup,
  restoreClinicBackup,
  exportAllBackup,
} from '../controllers/adminController';

const router = Router();

// Dashboard
router.get('/dashboard', authenticate, requireRole('SUPER_ADMIN'), getAdminDashboard);

// Clínicas
router.get('/clinics', authenticate, requireRole('SUPER_ADMIN'), getClinics);
router.post('/clinics', authenticate, requireRole('SUPER_ADMIN'), createClinic);
router.put('/clinics/:id', authenticate, requireRole('SUPER_ADMIN'), updateClinic);
router.put('/clinics/:id/toggle', authenticate, requireRole('SUPER_ADMIN'), toggleClinic);
router.put('/clinics/:id/subscription', authenticate, requireRole('SUPER_ADMIN'), updateSubscription);
router.delete('/clinics/:id', authenticate, requireRole('SUPER_ADMIN'), deleteClinic);
router.get('/clinics/:id/users', authenticate, requireRole('SUPER_ADMIN'), getClinicUsers);

// Usuarios
router.post('/users', authenticate, requireRole('SUPER_ADMIN'), createUser);
router.put('/users/:id/reset-password', authenticate, requireRole('SUPER_ADMIN'), resetUserPassword);
router.put('/users/:id/toggle', authenticate, requireRole('SUPER_ADMIN'), toggleUser);

// Pagos / Comprobantes
router.get('/payments', authenticate, requireRole('SUPER_ADMIN'), getPayments);
router.post('/payments', authenticate, requireRole('SUPER_ADMIN'), createPayment);
router.put('/payments/:id/status', authenticate, requireRole('SUPER_ADMIN'), updatePaymentStatus);

// Logs
router.get('/login-logs', authenticate, requireRole('SUPER_ADMIN'), getLoginLogs);

// Impersonate
router.post('/impersonate/:clinicId', authenticate, requireRole('SUPER_ADMIN'), impersonateClinic);

// Backup / Restore
router.get('/clinics/:id/backup', authenticate, requireRole('SUPER_ADMIN'), exportClinicBackup);
router.post('/clinics/:id/restore', authenticate, requireRole('SUPER_ADMIN'), restoreClinicBackup);
router.get('/backup-all', authenticate, requireRole('SUPER_ADMIN'), exportAllBackup);

export default router;
