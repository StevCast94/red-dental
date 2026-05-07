import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { clinicFilter } from '../utils/clinicFilter';

const prisma = new PrismaClient();

// Labels y helpers visuales
const statusLabels: Record<string, string> = {
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  ATTENDED: 'Atendida',
  CANCELED: 'Cancelada',
  NO_SHOW: 'No Asistió',
};

const methodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    // EXTERNAL no tiene acceso al dashboard
    if (user?.role === 'EXTERNAL') {
      return res.json(null);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Mes actual y anterior
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // SUPER_ADMIN ve todas las clínicas, resto solo la suya
    const cf: any = clinicFilter(user);

    // Agrupar pacientes activos (no eliminados) y nuevos del mes
    const patientCf = { ...cf, deletedAt: null };
    
    // Filtros a través de la relación patient (clinicId del paciente)
    const patientFilter = Object.keys(cf).length > 0 ? { clinicId: cf.clinicId } : {};
    const treatmentCf = { patient: patientFilter };
    const treatmentActiveCf = { patient: patientFilter, active: true };
    const appointmentCf = { patient: patientFilter, deletedAt: null };
    const paymentCf = { patient: patientFilter };

    const [
      totalPatients,
      newPatientsThisMonth,
      treatmentStats,
      scheduledAppointments,
      todayAppointments,
      upcomingAppointments,
      recentPayments,
      appointmentsByStatus,
      totalEvolutions,
      dailyPayments,
      dailyPaymentMethods,
      dailyAttendedAppointments,
      monthlyPaymentsRaw,
      paymentAggregates,
    ] = await Promise.all([
      // 1. Todos los pacientes activos
      prisma.patient.count({ where: patientCf }),
      // 2. Pacientes nuevos este mes
      prisma.patient.count({ where: { ...patientCf, createdAt: { gte: monthStart } } }),
      // 3. Tratamientos: activos y totales en una sola query groupBy
      prisma.treatment.groupBy({
        by: ['active'],
        _count: true,
        where: { patient: cf },
      }),
      // 4. Citas agendadas
      prisma.appointment.count({ where: { ...appointmentCf, status: 'SCHEDULED' } }),
      // 5. Citas de hoy
      prisma.appointment.count({ where: { ...appointmentCf, date: { gte: today, lt: tomorrow } } }),
      // 6. Próximas citas
      prisma.appointment.findMany({
        where: { ...appointmentCf, date: { gte: today, lt: weekFromNow }, status: { not: 'CANCELED' } },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          orthodontist: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
        take: 8,
      }),
      // 7. Últimos pagos
      prisma.payment.findMany({
        where: paymentCf,
        include: { patient: { select: { firstName: true, lastName: true } } },
        orderBy: { date: 'desc' },
        take: 5,
      }),
      // 8. Citas por estado
      prisma.appointment.groupBy({ by: ['status'], _count: true, where: appointmentCf }),
      // 9. Total evoluciones
      prisma.evolution.count({ where: { treatment: { patient: cf } } }),
      // 10. Pagos de hoy (detalle)
      prisma.payment.findMany({
        where: { ...paymentCf, date: { gte: today, lt: tomorrow } },
        include: { patient: { select: { firstName: true, lastName: true } } },
        orderBy: { date: 'desc' },
      }),
      // 11. Pagos de hoy (por método)
      prisma.payment.groupBy({
        by: ['method'],
        where: { ...paymentCf, date: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
        _count: true,
      }),
      // 12. Citas atendidas hoy
      prisma.appointment.count({ where: { ...appointmentCf, date: { gte: today, lt: tomorrow }, status: 'ATTENDED' } }),
      // 13. Pagos últimos 6 meses (para monthlyPayments)
      prisma.payment.findMany({
        where: { ...paymentCf, date: { gte: sixMonthsAgo } },
        select: { date: true, amount: true },
        orderBy: { date: 'desc' },
      }),
      // 14. Ingresos: mes actual, mes anterior, e histórico en una sola agregación groupBy
      // Usamos groupBy por año-mes para obtener los 3 períodos de una vez
      prisma.payment.groupBy({
        by: ['date'],
        where: {
          ...paymentCf,
          OR: [
            { date: { gte: monthStart } },
            { date: { gte: prevMonthStart, lte: prevMonthEnd } },
          ],
        },
        _sum: { amount: true },
      }),
    ]);

    // Procesar treatmentStats: total y activos
    let totalTreatments = 0;
    let activeTreatments = 0;
    for (const stat of treatmentStats) {
      totalTreatments += stat._count;
      if (stat.active) activeTreatments = stat._count;
    }

    // Procesar paymentAggregates para obtener revenue por período
    let currentMonthRevenue = 0;
    let previousRevenue = 0;
    let totalPayments = 0;
    for (const agg of paymentAggregates) {
      const d = new Date(agg.date);
      const amt = agg._sum.amount || 0;
      if (d >= monthStart) {
        currentMonthRevenue += amt;
        totalPayments += amt;
      } else if (d >= prevMonthStart && d <= prevMonthEnd) {
        previousRevenue += amt;
      }
    }
    // Fetch total histórico aparte (no cambia mucho)
    const totalHistory = await prisma.payment.aggregate({
      where: paymentCf,
      _sum: { amount: true },
    });
    totalPayments = totalHistory._sum.amount || 0;

    const dailyTotal = dailyPayments.reduce((sum, p) => sum + p.amount, 0);

    // Monthly payments agrupado por mes en JS (de monthlyPaymentsRaw)
    const monthlyMap: Record<string, number> = {};
    monthlyPaymentsRaw.forEach(p => {
      const key = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + p.amount;
    });
    const monthlyPayments = Object.entries(monthlyMap)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => b.month.localeCompare(a.month));

    // Tratamientos por tipo﻿
    const treatmentsByType = await prisma.treatment.groupBy({
      by: ['type'],
      _count: true,
      where: { active: true, patient: cf },
    });

    // Obtener nombre de la clínica
    let clinicName: string | null = null;
    if (user?.clinicId && user?.role !== 'SUPER_ADMIN') {
      const clinic = await prisma.clinic.findUnique({
        where: { id: user.clinicId },
        select: { name: true },
      });
      clinicName = clinic?.name || null;
    }

    res.json({
      clinicName,
      stats: {
        totalPatients,
        totalTreatments,
        activeTreatments,
        newPatientsThisMonth,
        scheduledAppointments,
        todayAppointments,
        totalRevenue: totalPayments,
        totalEvolutions,
      },
      upcomingAppointments,
      recentPayments,
      monthlyPayments,
      appointmentsByStatus,
      treatmentsByType,
      dailyClose: {
        date: today.toISOString().split('T')[0],
        total: dailyTotal,
        paymentCount: dailyPayments.length,
        attendedAppointments: dailyAttendedAppointments,
        payments: dailyPayments,
        byMethod: dailyPaymentMethods.map((m: any) => ({
          method: m.method,
          total: m._sum.amount,
          count: m._count,
        })),
      },
      monthlyRevenue: {
        current: currentMonthRevenue,
        previous: previousRevenue,
        currentMonth: monthStart.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' }),
        previousMonth: prevMonthStart.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' }),
        difference: currentMonthRevenue - previousRevenue,
        percentChange: previousRevenue > 0 ? Math.round(((currentMonthRevenue - previousRevenue) / previousRevenue) * 100) : 0,
      },
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
};
