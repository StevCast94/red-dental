import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { clinicFilter } from '../utils/clinicFilter';
import { auditLog, getAuditInfo } from '../utils/auditLog';

const prisma = new PrismaClient();

export const getAppointments = async (req: AuthRequest, res: Response) => {
  try {
    const { date, patientId } = req.query;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const skip = (page - 1) * limit;
    const cf: any = clinicFilter(req.user);
    const where: any = {
      deletedAt: null,
      patient: cf
    };
    if (date) where.date = { gte: new Date(String(date)), lt: new Date(new Date(String(date)).getTime() + 86400000) };
    if (patientId) where.patientId = String(patientId);
    // EXTERNAL solo ve sus propias citas
    if (req.user?.role === 'EXTERNAL') {
      where.orthodontistId = req.user.id;
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          orthodontist: { select: { id: true, name: true } },
        },
        orderBy: { date: 'asc' },
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);
    res.json({ data: appointments, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
};

export const createAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, date, duration, type, orthodontistId } = req.body;
    // Verificar que el paciente sea de la misma clínica
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: req.user?.clinicId }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado en esta clínica' });

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
    console.log(`[AUDIT] User ${req.user?.id} created appointment ${appointment.id} for patient ${patientId}`);
    auditLog({
      ...getAuditInfo(req),
      action: 'CREATE',
      entity: 'Appointment',
      entityId: appointment.id,
      details: { patientId, type: appointment.type, date: appointment.date },
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
    // Las fechas from/to vienen como "YYYY-MM-DD" del frontend (fechas Ecuador)
    // Buscar citas en UTC, pero el día Ecuador inicia a las 05:00 UTC
    const [fy, fm, fd] = String(from).split('-').map(Number);
    const [ty, tm, td] = String(to).split('-').map(Number);
    const rangeStart = new Date(Date.UTC(fy, fm - 1, fd, 5, 0, 0));
    const rangeEnd = new Date(Date.UTC(ty, tm - 1, td, 28, 59, 59));

    const appointments = await prisma.appointment.findMany({
      where: {
        deletedAt: null,
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        patient: { clinicId: req.user?.clinicId }
      },
      select: { date: true },
    });

    // Agrupar por fecha local (Ecuador)
    const countMap: Record<string, number> = {};
    appointments.forEach((a) => {
      const localDate = new Date(a.date.getTime() - 5 * 3600000);
      const dateKey = localDate.toISOString().split('T')[0];
      countMap[dateKey] = (countMap[dateKey] || 0) + 1;
    });
    res.json(countMap);
  } catch (error) {
    res.status(500).json({ error: 'Error al contar citas' });
  }
};

export const getOccupiedSlots = async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Fecha requerida' });

    const dateStr = String(date);
    // Las fechas se guardan en UTC en la DB, pero representan hora Ecuador (UTC-5)
    // Para buscar citas de un día local, el rango UTC debe cubrir el día completo en Ecuador
    // Ecuador está en UTC-5, entonces el día local [00:00, 23:59] = UTC [05:00, 04:59+1día]
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayStart = new Date(Date.UTC(y, m - 1, d, 5, 0, 0));  // 00:00 Ecuador = 05:00 UTC
    const dayEnd = new Date(Date.UTC(y, m - 1, d, 28, 59, 59));  // 23:59 Ecuador = 04:59+1día UTC

    const appointments = await prisma.appointment.findMany({
      where: {
        deletedAt: null,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        patient: { clinicId: req.user?.clinicId },
      },
      select: {
        date: true,
        duration: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    const slots = appointments.map(a => {
      const d = new Date(a.date);
      // Convertir UTC a hora local Ecuador (UTC-5 = restar 5h)
      const localMs = d.getTime() - 5 * 3600000;
      const localD = new Date(localMs);
      const hh = String(localD.getUTCHours()).padStart(2, '0');  // getUTCHours porque localD ya está ajustado
      const mm = String(localD.getUTCMinutes()).padStart(2, '0');
      const start = `${hh}:${mm}`;
      const endDate = new Date(localMs + (a.duration || 30) * 60000);
      const endHh = String(endDate.getUTCHours()).padStart(2, '0');
      const endMm = String(endDate.getUTCMinutes()).padStart(2, '0');
      return { start, end: `${endHh}:${endMm}` };
    });

    res.json(slots);
  } catch (error) {
    console.error('Error al obtener slots:', error);
    res.status(500).json({ error: 'Error al obtener slots ocupados' });
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
    auditLog({
      ...getAuditInfo(req),
      action: 'UPDATE',
      entity: 'Appointment',
      entityId: id,
      details: { field: 'status', newValue: status },
    });
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar cita' });
  }
};

export const updateAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { date, type, notes, status, orthodontistId } = req.body;

    // Verify the appointment belongs to the user's clinic
    const existing = await prisma.appointment.findFirst({
      where: {
        id,
        patient: { clinicId: req.user?.clinicId }
      }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Cita no encontrada en esta clínica' });
    }

    const data: any = {};
    if (date !== undefined) data.date = new Date(date);
    if (type !== undefined) data.type = type;
    if (notes !== undefined) data.notes = notes;
    if (status !== undefined) data.status = status;
    if (orthodontistId !== undefined) data.orthodontistId = orthodontistId;

    const appointment = await prisma.appointment.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        orthodontist: { select: { id: true, name: true } },
      },
    });
    res.json(appointment);
    auditLog({
      ...getAuditInfo(req),
      action: 'UPDATE',
      entity: 'Appointment',
      entityId: id,
      details: { updatedFields: Object.keys(data) },
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al actualizar cita' });
  }
};

export const deleteAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify the appointment belongs to the user's clinic
    const existing = await prisma.appointment.findFirst({
      where: {
        id,
        patient: { clinicId: req.user?.clinicId }
      }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Cita no encontrada en esta clínica' });
    }

    // Soft-delete
    await prisma.appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Cita eliminada correctamente' });
    auditLog({
      ...getAuditInfo(req),
      action: 'DELETE',
      entity: 'Appointment',
      entityId: id,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al eliminar cita' });
  }
};

export const getAppointmentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        patient: { clinicId: req.user?.clinicId }
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        orthodontist: { select: { id: true, name: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener cita' });
  }
};
