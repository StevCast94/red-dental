import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

export const getPatients = async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = {};
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
    const patients = await prisma.patient.findMany({
      where,
      include: { orthodontist: { select: { name: true } }, treatments: { select: { id: true, type: true, active: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
};

export const getPatientById = async (req: AuthRequest, res: Response) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
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
    const user = req.user;
    const data = {
      ...req.body,
      orthodontistId: req.body.orthodontistId || user?.id,
    };
    const patient = await prisma.patient.create({ data });
    res.status(201).json(patient);
  } catch (error: any) {
    console.error('Error al crear paciente:', error);
    res.status(400).json({ error: error?.message || 'Error al crear paciente' });
  }
};

export const updatePatient = async (req: AuthRequest, res: Response) => {
  try {
    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(patient);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar paciente' });
  }
};

export const deletePatient = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.patient.delete({ where: { id: req.params.id } });
    res.json({ message: 'Paciente eliminado correctamente' });
  } catch (error) {
    res.status(400).json({ error: 'Error al eliminar paciente' });
  }
};
