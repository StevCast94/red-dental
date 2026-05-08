import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { clinicFilter } from '../utils/clinicFilter';
import { auditLog, getAuditInfo } from '../utils/auditLog';

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
    auditLog({
      ...getAuditInfo(req),
      action: 'CREATE',
      entity: 'Evolution',
      entityId: evolution.id,
      details: { treatmentId, hasPhotos: !!(photoBefore || photoAfter) },
    });
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
    
    // Verificar que la evolución pertenezca a la clínica del usuario
    const evolution = await prisma.evolution.findFirst({
      where: {
        id: req.params.id,
        treatment: {
          patient: { clinicId: req.user?.clinicId },
        },
      },
    });
    if (!evolution) return res.status(404).json({ error: 'Evolución no encontrada en esta clínica' });
    
    const data: any = {};
    if (observations !== undefined) data.observations = observations;
    if (photoBefore !== undefined) data.photoBefore = photoBefore;
    if (photoAfter !== undefined) data.photoAfter = photoAfter;
    
    const updated = await prisma.evolution.update({
      where: { id: req.params.id },
      data,
    });
    console.log(`[AUDIT] User ${req.user?.id} updated evolution ${updated.id}`);
    auditLog({
      ...getAuditInfo(req),
      action: 'UPDATE',
      entity: 'Evolution',
      entityId: updated.id,
      details: { changedFields: Object.keys(data) },
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al actualizar evolución' });
  }
};
