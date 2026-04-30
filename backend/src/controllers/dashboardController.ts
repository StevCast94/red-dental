import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getStats = async (req: Request, res: Response) => {
  try {
    const [patients, appointments, treatments] = await Promise.all([
      prisma.patient.count(),
      prisma.appointment.count({ where: { status: 'SCHEDULED' } }),
      prisma.treatment.count({ where: { active: true } }),
    ]);
    res.json({ patients, appointments, treatments });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};
