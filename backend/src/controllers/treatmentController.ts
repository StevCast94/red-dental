import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { clinicFilter } from '../utils/clinicFilter';

const prisma = new PrismaClient();

export const getTreatments = async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, active } = req.query;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const skip = (page - 1) * limit;
    const cf: any = clinicFilter(req.user);
    const where: any = { patient: cf };
    if (patientId) where.patientId = String(patientId);
    if (active !== undefined) where.active = active === 'true';
    
    const [treatments, total] = await Promise.all([
      prisma.treatment.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          evolutions: { orderBy: { date: 'desc' } },
          payments: { select: { amount: true } },
          _count: { select: { evolutions: true } },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.treatment.count({ where }),
    ]);
    res.json({ data: treatments, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener tratamientos' });
  }
};

export const getTreatmentById = async (req: AuthRequest, res: Response) => {
  try {
    const cf2: any = clinicFilter(req.user);
    const treatment = await prisma.treatment.findFirst({
      where: { id: req.params.id, patient: cf2 },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        evolutions: {
          orderBy: { date: 'desc' },
          include: { appointment: { select: { date: true } } },
        },
        payments: true,
        inventoryUsage: { include: { item: true } },
      },
    });
    if (!treatment) return res.status(404).json({ error: 'Tratamiento no encontrado' });
    res.json(treatment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener tratamiento' });
  }
};

export const createTreatment = async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, type, estimatedMonths, phases } = req.body;
    // Verificar que el paciente sea de la misma clínica
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: req.user?.clinicId }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado en esta clínica' });
    const treatment = await prisma.treatment.create({
      data: {
        patientId,
        type: type || 'METAL_BRACES',
        estimatedMonths: estimatedMonths || 12,
        phases: phases ? JSON.stringify(phases) : null,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    console.log(`[AUDIT] User ${req.user?.id} created treatment ${treatment.id} for patient ${patientId}`);
    res.status(201).json(treatment);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al crear tratamiento' });
  }
};

export const updateTreatment = async (req: AuthRequest, res: Response) => {
  try {
    const { type, estimatedMonths, active, phases } = req.body;
    const data: any = {};
    if (type) data.type = type;
    if (estimatedMonths) data.estimatedMonths = estimatedMonths;
    if (active !== undefined) data.active = active;
    if (phases) data.phases = JSON.stringify(phases);
    
    const treatment = await prisma.treatment.update({
      where: { id: req.params.id },
      data,
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.json(treatment);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al actualizar tratamiento' });
  }
};

export const completeTreatment = async (req: AuthRequest, res: Response) => {
  try {
    const treatment = await prisma.treatment.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    res.json(treatment);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al finalizar tratamiento' });
  }
};

export const deleteTreatment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const cf: any = clinicFilter(req.user);
    // Verify treatment exists and belongs to user's clinic
    const treatment = await prisma.treatment.findFirst({
      where: { id, patient: cf },
      include: { patient: { select: { clinicId: true } } },
    });
    if (!treatment) return res.status(404).json({ error: 'Tratamiento no encontrado' });
    
    await prisma.$transaction(async (tx) => {
      // Delete evolutions
      await tx.evolution.deleteMany({ where: { treatmentId: id } });
      // Delete payments
      await tx.payment.deleteMany({ where: { treatmentId: id } });
      // Delete inventory usage
      await tx.inventoryUsage.deleteMany({ where: { treatmentId: id } });
      // Delete the treatment
      await tx.treatment.delete({ where: { id } });
    });

    console.log(`[AUDIT] User ${req.user?.id} deleted treatment ${id}`);
    res.json({ success: true, message: 'Tratamiento eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar tratamiento' });
  }
};
