import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { clinicFilter } from '../utils/clinicFilter';

const prisma = new PrismaClient();

export const getPatients = async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const skip = (page - 1) * limit;
    const where: any = { ...clinicFilter(req.user), deletedAt: null };
    if (search) {
      where.OR = [
        { firstName: { contains: String(search) } },
        { lastName: { contains: String(search) } },
        { phone: { contains: String(search) } }
      ];
    }
    // EXTERNAL solo ve sus pacientes asignados
    if (req.user?.role === 'EXTERNAL') {
      where.orthodontistId = req.user.id;
    }
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: { orthodontist: { select: { name: true } }, treatments: { select: { id: true, type: true, active: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where }),
    ]);
    res.json({ data: patients, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
};

export const getPatientById = async (req: AuthRequest, res: Response) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { id: req.params.id, deletedAt: null, ...clinicFilter(req.user) },
      include: {
        orthodontist: { select: { name: true } },
        appointments: { include: { orthodontist: { select: { name: true } } }, orderBy: { date: 'desc' } },
        treatments: { include: { evolutions: true }, orderBy: { startDate: 'desc' } },
        payments: true,
      },
    });
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener paciente' });
  }
};

export const createPatient = async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, phone } = req.body;
    // Validaciones simples
    const name = firstName || lastName;
    if (!name || String(name).trim().length === 0) {
      return res.status(400).json({ error: 'El nombre del paciente es obligatorio' });
    }
    if (!phone || String(phone).replace(/\D/g, '').length < 7) {
      return res.status(400).json({ error: 'El teléfono debe tener al menos 7 dígitos' });
    }
    const user = req.user;
    const data = {
      ...req.body,
      clinicId: user?.clinicId || req.body.clinicId,
      orthodontistId: req.body.orthodontistId || user?.id,
    };
    const patient = await prisma.patient.create({ data });
    console.log(`[AUDIT] User ${req.user?.id} created patient ${patient.id}`);
    res.status(201).json(patient);
  } catch (error: any) {
    console.error('Error al crear paciente:', error);
    res.status(400).json({ error: error?.message || 'Error al crear paciente' });
  }
};

export const updatePatient = async (req: AuthRequest, res: Response) => {
  try {
    const patient = await prisma.patient.updateMany({
      where: { id: req.params.id, ...clinicFilter(req.user) },
      data: req.body,
    });
    if (patient.count === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
    const updated = await prisma.patient.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar paciente' });
  }
};

export const deletePatient = async (req: AuthRequest, res: Response) => {
  try {
    const result = await prisma.patient.updateMany({
      where: { id: req.params.id, deletedAt: null, ...clinicFilter(req.user) },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
    console.log(`[AUDIT] User ${req.user?.id} soft-deleted patient ${req.params.id}`);
    res.json({ message: 'Paciente eliminado correctamente' });
  } catch (error) {
    res.status(400).json({ error: 'Error al eliminar paciente' });
  }
};
