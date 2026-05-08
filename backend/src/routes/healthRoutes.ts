import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const prisma = new PrismaClient();

// Health check completo (público - no requiere autenticación)
router.get('/', async (_req: Request, res: Response) => {
  const checks: { status: string; db: boolean; supabase: boolean; uptime: number } = {
    status: 'error',
    db: false,
    supabase: false,
    uptime: process.uptime(),
  };

  // Verificar conexión a DB
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch (e) {
    checks.db = false;
  }

  // Verificar Supabase Storage
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase.storage.listBuckets();
      checks.supabase = Array.isArray(data);
    }
  } catch (e) {
    checks.supabase = false;
  }

  checks.status = checks.db ? 'ok' : 'error';

  const statusCode = checks.db ? 200 : 503;
  res.status(statusCode).json(checks);
});

export default router;
