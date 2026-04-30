import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

export const getAppointments = async (req: AuthRequest, res: Response) => {
  try {
    const { date, patientId } = req.query;
    const where: any = {};
    if (date) where.date = { gte: new Date(String(date)), lt: new Date(new Date(String(date)).getTime() + 86400000) };
    if (patientId) where.patientId = String(patientId);
    // EXTERNAL solo ve sus propias citas
    if (req.user?.role === 'EXTERNAL') {
      where.orthodontistId = req.user.id;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        orthodontist: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
};

export const createAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, date, duration, type, orthodontistId } = req.body;
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        orthodontistId: orthodontistId || req.user?.id,
        date: new Date(date),
        duration: duration || 30,
        type: type || 'INITIAL_CONSULTATION',
        status: 'SCHEDULED',
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    res.status(201).json(appointment);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al crear cita' });
  }
};

export const getAppointmentCountByRange = async (req: AuthRequest, res: Response) => {
  try {
    const { from, to } = req.query;
    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: new Date(String(from)),
          lt: new Date(new Date(String(to)).getTime() + 86400000),
        },
      },
      select: { date: true },
    });

    const countMap: Record<string, number> = {};
    appointments.forEach((a) => {
      const dateKey = a.date.toISOString().split('T')[0];
      countMap[dateKey] = (countMap[dateKey] || 0) + 1;
    });
    res.json(countMap);
  } catch (error) {
    res.status(500).json({ error: 'Error al contar citas' });
  }
};

export const updateAppointmentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    res.json(appointment);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar cita' });
  }
};
