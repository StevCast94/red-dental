import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { clinicFilter } from '../utils/clinicFilter';

const prisma = new PrismaClient();

export const getEvolutions = async (req: AuthRequest, res: Response) => {
  try {
    const { treatmentId } = req.query;
    const where: any = {};
    if (treatmentId) where.treatmentId = String(treatmentId);
    
    const evolutions = await prisma.evolution.findMany({
      where,
      include: {
        treatment: { select: { type: true, patient: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { date: 'desc' },
    });
    res.json(evolutions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener evoluciones' });
  }
};

export const createEvolution = async (req: AuthRequest, res: Response) => {
  try {
    const { treatmentId, appointmentId, observations, photoBefore, photoAfter } = req.body;
    // Verificar que el tratamiento pertenezca a la clínica del usuario
    const treatment = await prisma.treatment.findFirst({
      where: {
        id: treatmentId,
        patient: { clinicId: req.user?.clinicId },
      },
    });
    if (!treatment) return res.status(404).json({ error: 'Tratamiento no encontrado en esta clínica' });
    const evolution = await prisma.evolution.create({
      data: {
        treatmentId,
        appointmentId: appointmentId || undefined,
        observations: observations || '',
        photoBefore: photoBefore || null,
        photoAfter: photoAfter || null,
        createdByUserId: req.user?.id,
      },
    });
    console.log(`[AUDIT] User ${req.user?.id} created evolution ${evolution.id} for treatment ${treatmentId}`);
    res.status(201).json(evolution);
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una evolución para esta cita' });
    }
    res.status(400).json({ error: 'Error al crear evolución' });
  }
};

export const updateEvolution = async (req: AuthRequest, res: Response) => {
  try {
    const { observations, photoBefore, photoAfter } = req.body;
    const data: any = {};
    if (observations !== undefined) data.observations = observations;
    if (photoBefore !== undefined) data.photoBefore = photoBefore;
    if (photoAfter !== undefined) data.photoAfter = photoAfter;
    
    const evolution = await prisma.evolution.update({
      where: { id: req.params.id },
      data,
    });
    res.json(evolution);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al actualizar evolución' });
  }
};
