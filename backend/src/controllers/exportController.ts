import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.join(',');
  const body = rows.map(r => r.join(',')).join('\n');
  return `${headerLine}\n${body}`;
}

export const exportPatients = async (req: Request, res: Response) => {
  try {
    const patients = await prisma.patient.findMany({
      include: {
        orthodontist: { select: { name: true } },
        treatments: { select: { type: true, active: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Nombre', 'Apellido', 'Teléfono', 'Email', 'Dirección', 'F. Nacimiento', 'Ortodoncista', 'Tratamientos Activos', 'Total Pagado'];
    const rows = patients.map(p => [
      escapeCsv(p.firstName),
      escapeCsv(p.lastName),
      escapeCsv(p.phone),
      escapeCsv(p.email),
      escapeCsv(p.address),
      p.birthDate ? new Date(p.birthDate).toLocaleDateString() : '',
      escapeCsv(p.orthodontist.name),
      String(p.treatments.filter(t => t.active).length),
      String(p.payments.reduce((s, pm) => s + pm.amount, 0)),
    ]);

    const csv = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pacientes-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csv); // BOM para Excel
  } catch (error) {
    res.status(500).json({ error: 'Error al exportar' });
  }
};

export const exportPayments = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(String(startDate));
      if (endDate) where.date.lte = new Date(String(endDate) + 'T23:59:59');
    }

    const payments = await prisma.payment.findMany({
      where,
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { date: 'desc' },
    });

    const headers = ['Fecha', 'Paciente', 'Monto', 'Método', 'Nota'];
    const rows = payments.map(p => [
      new Date(p.date).toLocaleDateString(),
      escapeCsv(`${p.patient.firstName} ${p.patient.lastName}`),
      String(p.amount),
      escapeCsv(p.method),
      escapeCsv(p.note),
    ]);

    const csv = toCsv(headers, rows);
    const suffix = startDate ? `-${String(startDate)}` : '';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pagos${suffix}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    res.status(500).json({ error: 'Error al exportar pagos' });
  }
};

export const exportAppointments = async (req: Request, res: Response) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: { select: { firstName: true, lastName: true } },
        orthodontist: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const statusLabels: Record<string, string> = {
      SCHEDULED: 'Agendada', CONFIRMED: 'Confirmada', ATTENDED: 'Atendida', CANCELED: 'Cancelada', NO_SHOW: 'No Asistió',
    };

    const headers = ['Fecha', 'Paciente', 'Ortodoncista', 'Tipo', 'Estado', 'Duración'];
    const rows = appointments.map(a => [
      new Date(a.date).toLocaleString(),
      escapeCsv(`${a.patient.firstName} ${a.patient.lastName}`),
      escapeCsv(a.orthodontist.name),
      escapeCsv(a.type),
      statusLabels[a.status] || a.status,
      `${a.duration} min`,
    ]);

    const csv = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="citas-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    res.status(500).json({ error: 'Error al exportar citas' });
  }
};
