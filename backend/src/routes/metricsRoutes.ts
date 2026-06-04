import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// GET /api/metrics — Dashboard público de métricas (no requiere auth)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const prisma = new PrismaClient();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [patientsTotal, appointmentsToday, appointmentsPending, treatmentsActive, inventoryLowStock, revenueAgg] =
      await Promise.all([
        // Total pacientes (no soft-deleted)
        prisma.patient.count({ where: { deletedAt: null } }),

        // Citas hoy
        prisma.appointment.count({
          where: {
            date: { gte: startOfDay },
            deletedAt: null,
          },
        }),

        // Citas pendientes (SCHEDULED)
        prisma.appointment.count({
          where: {
            status: 'SCHEDULED',
            deletedAt: null,
          },
        }),

        // Tratamientos activos
        prisma.treatment.count({ where: { active: true } }),

        // Items con stock bajo (stock <= minStock)
        prisma.inventoryItem.count({
          where: {
            stock: { lte: 0 },
          },
        }),

        // Ingresos del mes
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            date: { gte: startOfMonth },
          },
        }),
      ]);

    // También contar items con stock >= 0 pero <= minStock
    const lowStockItems = await prisma.inventoryItem.findMany({
      select: { stock: true, minStock: true },
    });

    const actualLowStock = lowStockItems.filter((item) => item.stock <= item.minStock).length;

    await prisma.$disconnect();

    res.json({
      patients_total: patientsTotal,
      appointments_today: appointmentsToday,
      appointments_pending: appointmentsPending,
      treatments_active: treatmentsActive,
      inventory_low_stock: actualLowStock,
      revenue_month: `$${((revenueAgg._sum.amount ?? 0)).toFixed(2)}`,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error en /api/metrics:', error);
    res.status(500).json({ error: 'Error al obtener métricas.' });
  }
});

export default router;
