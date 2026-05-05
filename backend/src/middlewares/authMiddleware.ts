import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

// Extiende Request para incluir user
export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó token.' });
  }

  try {
    const decoded: any = verifyToken(token);
    if (typeof decoded === 'object' && decoded !== null) {
      req.user = decoded;
    } else {
      return res.status(401).json({ error: 'Token inválido.' });
    }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
    }
    next();
  };
};

export const requireRole = (role: string) => authorize([role]);
