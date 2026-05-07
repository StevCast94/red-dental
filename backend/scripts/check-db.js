const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const users = await p.user.findMany({ 
      select: { username: true, email: true, role: true, clinicId: true } 
    });
    const clinics = await p.clinic.findMany({ 
      select: { id: true, name: true, slug: true } 
    });
    const patients = await p.patient.count();
    const treatments = await p.treatment.count();
    const appointments = await p.appointment.count();
    const payments = await p.payment.count();

    console.log('=== ESTADO ACTUAL DB (Supabase) ===');
    console.log('Users:', JSON.stringify(users, null, 2));
    console.log('Clinics:', JSON.stringify(clinics, null, 2));
    console.log('Patients:', patients);
    console.log('Treatments:', treatments);
    console.log('Appointments:', appointments);
    console.log('Payments:', payments);
  } catch (e) {
    console.error('Error:', e.message);
  }
  await p.$disconnect();
})();
