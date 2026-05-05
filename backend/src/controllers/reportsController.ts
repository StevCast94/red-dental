import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { clinicFilter } from '../utils/clinicFilter';

const prisma = new PrismaClient();

// Helper: convertir fecha UTC a Ecuador (UTC-5)
function toEcuador(d: Date): Date {
  return new Date(d.getTime() - 5 * 3600000);
}

// Helper: rango de día en Ecuador en UTC
function ecuadorDayRange(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, d, 5, 0, 0)),      // 00:00 Ecuador = 05:00 UTC
    end: new Date(Date.UTC(y, m - 1, d, 28, 59, 59)),     // 23:59 Ecuador = 04:59+1d UTC
  };
}

// Helper: construir where para clinic
function clinicWhere(user: any, field: string = 'patient') {
  const cf: any = clinicFilter(user);
  if (Object.keys(cf).length === 0) return {};
  const clinicId = cf.clinicId;
  if (field === 'patient') return { patient: { clinicId } };
  if (field === 'direct') return { clinicId };
  return {};
}

// ============================================================
// REPORTE DE INGRESOS (mensual y diario, últimos 12 meses)
// ============================================================
export const getRevenueReport = async (req: AuthRequest, res: Response) => {
  try {
    const { period, from, to } = req.query;
    const user = req.user!;

    const now = new Date();
    const monthsBack = period === 'all' ? 24 : 12;
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - monthsBack);
    startDate.setDate(1);

    const payments = await prisma.payment.findMany({
      where: {
        date: { gte: startDate },
        ...clinicWhere(user, 'patient'),
      },
      select: { date: true, amount: true, method: true },
      orderBy: { date: 'asc' },
    });

    // Agrupar por mes
    const monthly: Record<string, { total: number; count: number; methods: Record<string, number> }> = {};
    // Agrupar por día (últimos 60 días para gráfico diario)
    const daily: Record<string, number> = {};

    payments.forEach(p => {
      const local = toEcuador(p.date);
      const monthKey = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}`;
      const dayKey = local.toISOString().split('T')[0];

      if (!monthly[monthKey]) monthly[monthKey] = { total: 0, count: 0, methods: {} };
      monthly[monthKey].total += p.amount;
      monthly[monthKey].count += 1;
      monthly[monthKey].methods[p.method] = (monthly[monthKey].methods[p.method] || 0) + p.amount;

      daily[dayKey] = (daily[dayKey] || 0) + p.amount;
    });

    // Generar todos los meses en el rango (incluso sin datos)
    const allMonths: string[] = [];
    const d = new Date(startDate);
    while (d <= now) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      allMonths.push(key);
      d.setMonth(d.getMonth() + 1);
    }

    const monthlyReport = allMonths.map(month => ({
      month,
      total: monthly[month]?.total || 0,
      count: monthly[month]?.count || 0,
      methods: monthly[month]?.methods || {},
    }));

    const dailyReport = Object.entries(daily)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-60); // últimos 60 días

    res.json({
      monthlyData: monthlyReport,
      dailyData: dailyReport,
      totalRevenue: monthlyReport.reduce((sum, m) => sum + m.total, 0),
      period: period || '12m',
    });
  } catch (error: any) {
    console.error('Revenue report error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// REPORTE DE CITAS (por día/semana/mes, últimos 12 meses)
// ============================================================
export const getAppointmentsReport = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { groupBy } = req.query; // 'week' | 'month' | 'day'

    const now = new Date();
    const startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - 1);

    const where: any = {
      deletedAt: null,
      date: { gte: startDate },
      ...clinicWhere(user, 'patient'),
    };

    const appointments = await prisma.appointment.findMany({
      where,
      select: { date: true, status: true, type: true },
      orderBy: { date: 'asc' },
    });

    const groupFn = groupBy === 'month'
      ? (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : groupBy === 'week'
        ? (d: Date) => {
          const start = new Date(d);
          start.setDate(d.getDate() - d.getDay());
          return start.toISOString().split('T')[0];
        }
        : (d: Date) => d.toISOString().split('T')[0];

    const grouped: Record<string, { total: number; attended: number; canceled: number; noShow: number; byType: Record<string, number> }> = {};

    appointments.forEach(a => {
      const local = toEcuador(a.date);
      const key = groupFn(local);
      if (!grouped[key]) grouped[key] = { total: 0, attended: 0, canceled: 0, noShow: 0, byType: {} };
      grouped[key].total += 1;
      if (a.status === 'ATTENDED') grouped[key].attended += 1;
      if (a.status === 'CANCELED') grouped[key].canceled += 1;
      if (a.status === 'NO_SHOW') grouped[key].noShow += 1;
      grouped[key].byType[a.type] = (grouped[key].byType[a.type] || 0) + 1;
    });

    const report = Object.entries(grouped)
      .map(([period, data]) => ({ period, ...data }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Totales generales
    const totals = {
      total: appointments.length,
      attended: appointments.filter(a => a.status === 'ATTENDED').length,
      canceled: appointments.filter(a => a.status === 'CANCELED').length,
      noShow: appointments.filter(a => a.status === 'NO_SHOW').length,
      scheduled: appointments.filter(a => a.status === 'SCHEDULED').length,
      confirmed: appointments.filter(a => a.status === 'CONFIRMED').length,
    };

    res.json({
      monthlyData: report,
      totals: totals,
      totalAppointments: totals.total,
    });
  } catch (error: any) {
    console.error('Appointments report error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// REPORTE DE TRATAMIENTOS
// ============================================================
export const getTreatmentsReport = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    const treatments = await prisma.treatment.findMany({
      where: {
        ...clinicWhere(user, 'patient'),
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        payments: { select: { amount: true } },
        _count: { select: { evolutions: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    const byType: Record<string, { active: number; total: number; revenue: number }> = {};
    let totalRevenue = 0;
    let activeCount = 0;

    treatments.forEach(t => {
      if (!byType[t.type]) byType[t.type] = { active: 0, total: 0, revenue: 0 };
      byType[t.type].total += 1;
      byType[t.type].revenue += t.payments.reduce((s, p) => s + p.amount, 0);
      totalRevenue += t.payments.reduce((s, p) => s + p.amount, 0);
      if (t.active) {
        byType[t.type].active += 1;
        activeCount += 1;
      }
    });

    const phases: Record<string, number> = {};
    treatments.filter(t => t.phases).forEach(t => {
      const phaseList = t.phases!.split(',').map(p => p.trim());
      phaseList.forEach(p => {
        phases[p] = (phases[p] || 0) + 1;
      });
    });

    res.json({
      totalTreatments: treatments.length,
      activeTreatments: activeCount,
      byType: Object.entries(byType).map(([type, data]) => ({ type, _count: data.total })),
      revenueGenerated: totalRevenue,
      phases,
    });
  } catch (error: any) {
    console.error('Treatments report error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// MÉTRICAS AVANZADAS PARA DASHBOARD
// ============================================================
export const getDashboardMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const cf = clinicWhere(user, 'patient');

    // Tasa de asistencia (últimos 30 días)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAppointments = await prisma.appointment.findMany({
      where: {
        deletedAt: null,
        date: { gte: thirtyDaysAgo },
        ...cf,
      },
      select: { status: true },
    });

    const attendedCount = recentAppointments.filter(a => a.status === 'ATTENDED').length;
    const canceledCount = recentAppointments.filter(a => a.status === 'CANCELED' || a.status === 'NO_SHOW').length;
    const attendanceRate = recentAppointments.length > 0
      ? Math.round((attendedCount / recentAppointments.length) * 100)
      : 0;

    // Duración promedio de tratamiento
    const treatments = await prisma.treatment.findMany({
      where: { ...cf, active: false },
      select: { startDate: true, updatedAt: true },
    });
    const avgTreatmentDays = treatments.length > 0
      ? Math.round(treatments.reduce((sum, t) => {
        const days = (t.updatedAt.getTime() - t.startDate.getTime()) / 86400000;
        return sum + days;
      }, 0) / treatments.length)
      : 0;

    // Pacientes nuevos. este mes y este año
    const newPatientsMonth = await prisma.patient.count({
      where: {
        deletedAt: null,
        createdAt: { gte: monthStart },
        ...clinicWhere(user, 'direct'),
      },
    });
    const newPatientsYear = await prisma.patient.count({
      where: {
        deletedAt: null,
        createdAt: { gte: yearStart },
        ...clinicWhere(user, 'direct'),
      },
    });

    // Ingreso promedio por paciente
    const payments = await prisma.payment.findMany({
      where: cf,
      select: { amount: true, patientId: true },
    });
    const patientIds = new Set(payments.map(p => p.patientId));
    const avgRevenuePerPatient = patientIds.size > 0
      ? Math.round((payments.reduce((s, p) => s + p.amount, 0) / patientIds.size) * 100) / 100
      : 0;

    // Citas de hoy restantes
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const remainingToday = await prisma.appointment.count({
      where: {
        deletedAt: null,
        date: { gte: todayStart, lt: tomorrow },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        ...cf,
      },
    });

    res.json({
      attendanceRate,
      avgTreatmentDays,
      newPatientsThisMonth: newPatientsMonth,
      newPatientsThisYear: newPatientsYear,
      avgRevenuePerPatient,
      remainingAppointmentsToday: remainingToday,
      avgTreatmentDuration: avgTreatmentDays,
    });
  } catch (error: any) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// MÉTRICAS DE PACIENTES (demográficas)
// ============================================================
export const getPatientMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const cf = clinicWhere(user, 'direct');
    const patients = await prisma.patient.findMany({
      where: { deletedAt: null, ...cf },
      select: { birthDate: true, createdAt: true },
    });

    const now = new Date();
    const ageGroups: Record<string, number> = { '0-12': 0, '13-17': 0, '18-25': 0, '26-40': 0, '41-60': 0, '60+': 0 };

    patients.forEach(p => {
      const age = Math.floor((now.getTime() - new Date(p.birthDate).getTime()) / 31557600000);
      if (age <= 12) ageGroups['0-12']++;
      else if (age <= 17) ageGroups['13-17']++;
      else if (age <= 25) ageGroups['18-25']++;
      else if (age <= 40) ageGroups['26-40']++;
      else if (age <= 60) ageGroups['41-60']++;
      else ageGroups['60+']++;
    });

    // Crecimiento de pacientes por mes (últimos 12 meses)
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setDate(1);

    const patientGrowth: Record<string, number> = {};
    patients.filter(p => p.createdAt >= twelveMonthsAgo).forEach(p => {
      const local = toEcuador(p.createdAt);
      const key = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}`;
      patientGrowth[key] = (patientGrowth[key] || 0) + 1;
    });

    res.json({
      totalPatients: patients.length,
      ageGroups: Object.entries(ageGroups).map(([group, _count]) => ({ group, _count })),
      monthlyGrowth: Object.entries(patientGrowth)
        .map(([month, count]) => ({ month, count, cumulative: count }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    });
  } catch (error: any) {
    console.error('Patient metrics error:', error);
    res.status(500).json({ error: error.message });
  }
};
