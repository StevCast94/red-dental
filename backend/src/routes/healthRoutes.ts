import { Router, Request, Response } from 'express';

const router = Router();

// Health check simple (público - no requiere autenticación)
router.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'OK' });
});

export default router;
