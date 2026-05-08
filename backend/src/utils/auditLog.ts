import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuditEntry {
  userId?: string;
  username?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  clinicId?: string;
}

/**
 * Registra una entrada en la tabla de auditoría.
 * Es un fire-and-forget: no lanza errores si falla.
 */
export async function auditLog(entry: AuditEntry) {
  try {
    const db = prisma;
    await db.auditLog.create({
      data: {
        userId: entry.userId || null,
        username: entry.username || null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId || null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        clinicId: entry.clinicId || null,
      },
    });
  } catch (error) {
    console.error(`[AUDIT_ERROR] No se pudo registrar auditoría:`, error);
  }
}

/**
 * Helper para extraer datos de auditoría del request.
 */
export function getAuditInfo(req: any) {
  return {
    userId: req.user?.id,
    username: req.user?.username,
    clinicId: req.user?.clinicId,
  };
}
