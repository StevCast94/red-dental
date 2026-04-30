import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/authRoutes';
import patientRoutes from './routes/patientRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import treatmentRoutes from './routes/treatmentRoutes';
import evolutionRoutes from './routes/evolutionRoutes';
import paymentRoutes from './routes/paymentRoutes';
import toothRoutes from './routes/toothRoutes';
import exportRoutes from './routes/exportRoutes';
import userRoutes from './routes/userRoutes';
import bcrypt from 'bcrypt';
import { authenticate, AuthRequest } from './middlewares/authMiddleware';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;
export const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Obtener usuarios activos (para dropdowns) - público
app.get('/api/users/dropdown', async (req, res) => {
  try {
    const { role } = req.query;
    const where: any = { active: true };
    if (role) where.role = String(role);
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard stats
app.get('/api/dashboard', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
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

    const [
      totalPatients,
      totalTreatments,
      activeTreatments,
      scheduledAppointments,
      todayAppointments,
      upcomingAppointments,
      recentPayments,
      monthlyPayments,
      appointmentsByStatus,
      treatmentsByType,
      totalEvolutions,
      // Cierre de caja diario
      dailyPayments,
      dailyPaymentMethods,
      dailyAttendedAppointments,
      // Ingresos del mes vs mes anterior
      currentMonthRevenue,
      prevMonthRevenue,
      // Totales generales
      totalPayments,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.treatment.count(),
      prisma.treatment.count({ where: { active: true } }),
      prisma.appointment.count({ where: { status: 'SCHEDULED' } }),
      prisma.appointment.count({ where: { date: { gte: today, lt: tomorrow } } }),
      prisma.appointment.findMany({
        where: { date: { gte: today, lt: weekFromNow }, status: { not: 'CANCELED' } },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          orthodontist: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
        take: 8,
      }),
      prisma.payment.findMany({
        include: { patient: { select: { firstName: true, lastName: true } } },
        orderBy: { date: 'desc' },
        take: 5,
      }),
      prisma.$queryRawUnsafe<Array<{ month: string; total: number }>>(
        `SELECT strftime('%Y-%m', date) as month, SUM(amount) as total FROM Payment WHERE date >= date('now', '-6 months') GROUP BY month ORDER BY month DESC`
      ),
      prisma.appointment.groupBy({ by: ['status'], _count: true }),
      prisma.treatment.groupBy({ by: ['type'], _count: true, where: { active: true } }),
      prisma.evolution.count(),
      // Cierre de caja diario
      prisma.payment.findMany({
        where: { date: { gte: today, lt: tomorrow } },
        include: { patient: { select: { firstName: true, lastName: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.payment.groupBy({
        by: ['method'],
        where: { date: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.appointment.count({ where: { date: { gte: today, lt: tomorrow }, status: 'ATTENDED' } }),
      // Ingresos del mes
      prisma.payment.aggregate({ where: { date: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { amount: true } }),
      // Total histórico
      prisma.payment.aggregate({ _sum: { amount: true } }),
    ]);

    const currentRevenue = currentMonthRevenue._sum.amount || 0;
    const previousRevenue = prevMonthRevenue._sum.amount || 0;
    const dailyTotal = dailyPayments.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      stats: {
        totalPatients,
        totalTreatments,
        activeTreatments,
        scheduledAppointments,
        todayAppointments,
        totalRevenue: totalPayments._sum.amount || 0,
        totalEvolutions,
      },
      upcomingAppointments,
      recentPayments,
      monthlyPayments: monthlyPayments || [],
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
        current: currentRevenue,
        previous: previousRevenue,
        currentMonth: monthStart.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' }),
        previousMonth: prevMonthStart.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' }),
        difference: currentRevenue - previousRevenue,
        percentChange: previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100) : 0,
      },
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/evolutions', evolutionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/odontogram', toothRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/users', userRoutes);

// Perfil de usuario (autenticado)
app.get('/api/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, email } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
      data.email = email;
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    // Generar nuevo token con datos actualizados
    const jwt = require('./utils/jwt');
    const token = jwt.generateToken(user);
    res.json({ user, token });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/profile/password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Contraseña actual incorrecta' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed },
    });
    res.json({ message: 'Contraseña actualizada' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// En producción, servir el frontend estático
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});
