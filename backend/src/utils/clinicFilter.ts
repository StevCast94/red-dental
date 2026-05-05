import { AuthRequest } from '../middlewares/authMiddleware';

export function clinicFilter(user: any): any {
  if (user?.role === 'SUPER_ADMIN') return {};
  const cid = user?.clinicId;
  return cid ? { clinicId: cid } : {};
}
