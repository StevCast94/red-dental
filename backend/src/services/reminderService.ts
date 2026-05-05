import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TYPE_LABELS: Record<string, string> = {
  INITIAL_CONSULTATION: 'consulta inicial',
  BRACKETS_PLACEMENT: 'colocación de brackets',
  ADJUSTMENT: 'ajuste',
  REMOVAL: 'retiro',
  ALIGNER_DELIVERY: 'entrega de alineadores',
  CONTROL: 'control',
  EMERGENCY: 'emergencia',
};

function getWhatsAppLink(phone: string, patientName: string, date: Date, type: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d]/g, '');
  const fullPhone = cleaned.startsWith('593') ? cleaned :
    cleaned.startsWith('09') ? '593' + cleaned.slice(1) :
    cleaned.startsWith('9') ? '593' + cleaned :
    '593' + cleaned;

  const formattedDate = date.toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const formattedTime = date.toLocaleTimeString('es-EC', {
    hour: '2-digit', minute: '2-digit'
  });

  const message = `Hola ${patientName}, te recordamos que tienes una cita de ${TYPE_LABELS[type] || type} el día ${formattedDate} a las ${formattedTime}. Por favor confirma tu asistencia. ¡Te esperamos!`;

  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}

export async function sendTomorrowReminders(): Promise<number> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      date: { gte: tomorrowStart, lt: tomorrowEnd },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
    include: {
      patient: { select: { firstName: true, lastName: true, phone: true } },
    },
  });

  let sent = 0;
  for (const apt of appointments) {
    const link = getWhatsAppLink(
      apt.patient.phone,
      `${apt.patient.firstName} ${apt.patient.lastName}`,
      apt.date,
      apt.type
    );
    if (link) {
      console.log(`[REMINDER] Cita ${apt.id}: ${link}`);
      // En producción aquí iría una llamada real a API de WhatsApp
      sent++;
    }
  }
  console.log(`[REMINDER] ${sent}/${appointments.length} recordatorios generados`);
  return sent;
}
