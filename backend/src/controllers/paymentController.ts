import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { clinicFilter } from '../utils/clinicFilter';

const prisma = new PrismaClient();

export const getPayments = async (req: AuthRequest, res: Response) => {
  try {
    const { treatmentId, patientId, startDate, endDate } = req.query;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const skip = (page - 1) * limit;
    const cf: any = clinicFilter(req.user);
    const where: any = { patient: cf };
    if (treatmentId) where.treatmentId = String(treatmentId);
    if (patientId) where.patientId = String(patientId);
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(String(startDate));
      if (endDate) where.date.lte = new Date(String(endDate));
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          treatment: { select: { id: true, type: true } },
          appointment: { select: { id: true, date: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);
    res.json({ data: payments, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
};

export const getPaymentById = async (req: AuthRequest, res: Response) => {
  try {
    const cf2: any = clinicFilter(req.user);
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, patient: cf2 },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        treatment: { select: { id: true, type: true } },
        appointment: { select: { id: true, date: true } },
      },
    });
    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pago' });
  }
};

export const createPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method, date, note, patientId, treatmentId, appointmentId } = req.body;
    const payment = await prisma.payment.create({
      data: {
        amount,
        method: method || 'CASH',
        date: date ? new Date(date) : new Date(),
        note: note || null,
        patientId,
        treatmentId,
        appointmentId: appointmentId || null,
        createdByUserId: req.user?.id,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { id: true, type: true } },
      },
    });
    console.log(`[AUDIT] User ${req.user?.id} created payment ${payment.id} for patient ${patientId}`);
    res.status(201).json(payment);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al crear pago' });
  }
};

export const updatePayment = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method, date, note } = req.body;
    const data: any = {};
    if (amount !== undefined) data.amount = amount;
    if (method) data.method = method;
    if (date) data.date = new Date(date);
    if (note !== undefined) data.note = note;

    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { id: true, type: true } },
      },
    });
    res.json(payment);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar pago' });
  }
};

export const deletePayment = async (req: AuthRequest, res: Response) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, patient: clinicFilter(req.user) as any },
    });
    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });
    
    await prisma.payment.delete({ where: { id: req.params.id } });
    
    console.log(`[AUDIT] User ${req.user?.id} deleted payment ${req.params.id}`);
    auditLog({
      ...getAuditInfo(req),
      action: 'DELETE',
      entity: 'Payment',
      entityId: req.params.id,
      details: { amount: payment.amount, method: payment.method },
    });
    res.json({ message: 'Pago eliminado' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al eliminar pago' });
  }
};
