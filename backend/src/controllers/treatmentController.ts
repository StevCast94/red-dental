import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

export const getTreatments = async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, active } = req.query;
    const where: any = {};
    if (patientId) where.patientId = String(patientId);
    if (active !== undefined) where.active = active === 'true';
    
    const treatments = await prisma.treatment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        evolutions: { orderBy: { date: 'desc' } },
        payments: { select: { amount: true } },
        _count: { select: { evolutions: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    res.json(treatments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener tratamientos' });
  }
};

export const getTreatmentById = async (req: AuthRequest, res: Response) => {
  try {
    const treatment = await prisma.treatment.findUnique({
      where: { id: req.params.id },
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
