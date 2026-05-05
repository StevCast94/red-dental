import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// GET /api/admin/dashboard — Resumen ejecutivo del Super Admin
export const getAdminDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const [totalClinics, activeClinics, totalUsers, totalPatients, overdueCharges] = await Promise.all([
      prisma.clinic.count(),
      prisma.clinic.count({ where: { active: true } }),
      prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      prisma.patient.count({ where: { deletedAt: null } }),
      prisma.clinicSubscription.count({
        where: { active: true, nextBilling: { lt: new Date() } },
      }),
    ]);

    const clinics = await prisma.clinic.findMany({
      include: {
        _count: { select: { users: true, patients: true } },
        subscription: { select: { plan: true, amount: true, nextBilling: true, active: true } },
      },
      orderBy: { name: 'asc' },
    });

    const clinicsData = clinics.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      active: c.active,
      address: c.address,
      phone: c.phone,
      contactEmail: c.contactEmail,
      userCount: c._count.users,
      patientCount: c._count.patients,
      subscription: c.subscription,
    }));

    const subscriptions = await prisma.clinicSubscription.findMany({
      where: { active: true },
      include: { clinic: { select: { name: true } } },
    });

    const totalRevenue = subscriptions.reduce((sum, s) => sum + s.amount, 0);
    const revenueByClinic = subscriptions.map((s) => ({
      name: s.clinic.name,
      amount: s.amount,
      status: s.active ? 'Activa' : 'Inactiva',
    }));

    const loginLogs = await prisma.loginLog.findMany({
      include: { clinic: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const loginActivity = loginLogs.map((l) => ({
      username: l.username,
      clinicName: l.clinic?.name || '—',
      success: l.success,
      ip: l.ip || '—',
      createdAt: l.createdAt,
    }));

    // Alertas: clínicas con pago vencido
    const overdueClinics = clinics
      .filter(c => c.subscription && c.subscription.nextBilling < new Date() && c.active)
      .map(c => ({ id: c.id, name: c.name, nextBilling: c.subscription!.nextBilling }));

    res.json({
      stats: { totalClinics, activeClinics, totalUsers, totalPatients, overdueCharges },
      clinics: clinicsData,
      revenue: { total: totalRevenue, byClinic: revenueByClinic },
      loginActivity,
      alerts: {
        overdueClinics,
        totalOverdue: overdueClinics.length,
      },
    });
  } catch (error: any) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/admin/clinics/:id/toggle — Activar/desactivar clínica
export const toggleClinic = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const clinic = await prisma.clinic.findUnique({ where: { id } });
    if (!clinic) return res.status(404).json({ error: 'Clínica no encontrada' });

    const updated = await prisma.clinic.update({
      where: { id },
      data: { active: !clinic.active },
    });
    res.json({ id: updated.id, active: updated.active });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/admin/clinics/:id/subscription — Actualizar suscripción
export const updateSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { plan, amount, nextBilling, active } = req.body;

    const clinic = await prisma.clinic.findUnique({ where: { id } });
    if (!clinic) return res.status(404).json({ error: 'Clínica no encontrada' });

    const data: any = {};
    if (plan !== undefined) data.plan = plan;
    if (amount !== undefined) data.amount = amount;
    if (nextBilling !== undefined) data.nextBilling = new Date(nextBilling);
    if (active !== undefined) data.active = active;

    const subscription = await prisma.clinicSubscription.upsert({
      where: { clinicId: id },
      update: data,
      create: {
        clinicId: id,
        plan: plan || 'MONTHLY',
        amount: amount || 100,
        nextBilling: nextBilling ? new Date(nextBilling) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        active: active !== undefined ? active : true,
      },
    });
    res.json(subscription);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/admin/clinics/:id — Eliminar clínica con cascada completa
export const deleteClinic = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const clinic = await prisma.clinic.findUnique({ where: { id } });
    if (!clinic) return res.status(404).json({ error: 'Clínica no encontrada' });

    await prisma.$transaction(async (tx) => {
      // Obtener todos los pacientes de la clínica
      const patients = await tx.patient.findMany({ where: { clinicId: id }, select: { id: true } });
      const patientIds = patients.map(p => p.id);

      if (patientIds.length > 0) {
        // 1. Eliminar evoluciones de tratamientos de pacientes de la clínica
        const treatments = await tx.treatment.findMany({ where: { patientId: { in: patientIds } }, select: { id: true } });
        const treatmentIds = treatments.map(t => t.id);
        if (treatmentIds.length > 0) {
          await tx.evolution.deleteMany({ where: { treatmentId: { in: treatmentIds } } });
          // 2. Eliminar pagos de tratamientos de pacientes de la clínica
          await tx.payment.deleteMany({ where: { treatmentId: { in: treatmentIds } } });
          // 4. Eliminar tratamientos de pacientes de la clínica
          await tx.treatment.deleteMany({ where: { id: { in: treatmentIds } } });
        }
        // 3. Eliminar citas de pacientes de la clínica
        await tx.appointment.deleteMany({ where: { patientId: { in: patientIds } } });
        // Eliminar toothRecords de pacientes
        await tx.toothRecord.deleteMany({ where: { patientId: { in: patientIds } } });
        // 5. Eliminar pacientes de la clínica
        await tx.patient.deleteMany({ where: { id: { in: patientIds } } });
      }

      // 6. Eliminar usuarios de la clínica
      await tx.user.deleteMany({ where: { clinicId: id } });

      // Limpiar relaciones adicionales
      await tx.loginLog.deleteMany({ where: { clinicId: id } });
      await tx.paymentReceipt.deleteMany({ where: { clinicId: id } });
      await tx.clinicSubscription.deleteMany({ where: { clinicId: id } });

      // 7. Eliminar la clínica
      await tx.clinic.delete({ where: { id } });
    });

    res.json({ success: true, message: 'Clínica eliminada correctamente' });
  } catch (error: any) {
    console.error('Error deleting clinic:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/admin/clinics/:id — Editar datos de clínica
export const updateClinic = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, phone, contactEmail } = req.body;

    const clinic = await prisma.clinic.findUnique({ where: { id } });
    if (!clinic) return res.status(404).json({ error: 'Clínica no encontrada' });

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (address !== undefined) data.address = address;
    if (phone !== undefined) data.phone = phone;
    if (contactEmail !== undefined) data.contactEmail = contactEmail;

    const updated = await prisma.clinic.update({ where: { id }, data });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/clinics — Lista de clínicas (con datos de contacto)
export const getClinics = async (req: AuthRequest, res: Response) => {
  try {
    const clinics = await prisma.clinic.findMany({
      include: {
        _count: { select: { users: true, patients: true } },
        subscription: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(clinics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/admin/clinics — Crear una nueva clínica
export const createClinic = async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Nombre y slug son requeridos' });

    const existing = await prisma.clinic.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (existing) return res.status(400).json({ error: 'Ya existe una clínica con ese nombre o slug' });

    const clinic = await prisma.clinic.create({
      data: { name, slug, active: true },
    });

    // Crear suscripción inicial con 14 días gratis
    await prisma.clinicSubscription.create({
      data: {
        clinicId: clinic.id,
        plan: 'MONTHLY',
        amount: 30,
        nextBilling: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        active: true,
      },
    });

    res.json(clinic);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/clinics/:id/users — Usuarios de una clínica
export const getClinicUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const users = await prisma.user.findMany({
      where: { clinicId: id },
      select: {
        id: true, name: true, email: true, username: true,
        role: true, active: true, createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/admin/users — Crear usuario en una clínica
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, username, password, role, clinicId } = req.body;
    if (!name || !email || !username || !password || !clinicId) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) return res.status(400).json({ error: 'Ya existe un usuario con ese email o username' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, username, password: hashedPassword, role, clinicId },
      select: { id: true, name: true, email: true, username: true, role: true, active: true },
    });

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/admin/users/:id/reset-password — Resetear contraseña
export const resetUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: 'Nueva contraseña requerida' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/admin/users/:id/toggle — Activar/desactivar usuario
export const toggleUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const updated = await prisma.user.update({
      where: { id },
      data: { active: !user.active },
    });
    res.json({ id: updated.id, active: updated.active });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ----- PAGOS / COMPROBANTES -----

// GET /api/admin/payments — Todos los comprobantes de pago
export const getPayments = async (req: AuthRequest, res: Response) => {
  try {
    const payments = await prisma.paymentReceipt.findMany({
      include: { clinic: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/admin/payments — Registrar un pago/comprobante
export const createPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { clinicId, amount, method, reference, notes, periodStart, periodEnd, status } = req.body;
    if (!clinicId || !amount) return res.status(400).json({ error: 'Clínica y monto son requeridos' });

    const payment = await prisma.paymentReceipt.create({
      data: {
        clinicId,
        amount,
        method: method || 'TRANSFER',
        reference,
        notes,
        status: status || 'PENDING',
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
      },
    });
    res.json(payment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/admin/payments/:id — Aprobar/rechazar comprobante
export const updatePaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const updated = await prisma.paymentReceipt.update({
      where: { id },
      data: { status },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/login-logs — Todos los logs de acceso
export const getLoginLogs = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.loginLog.findMany({
      include: { clinic: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
