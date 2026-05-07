/**
 * Script para limpiar la DB de Supabase y sembrarla controladamente.
 * Ejecutar solo cuando estemos seguros de reemplazar todos los datos.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

async function main() {
  console.log('=== LIMPIANDO DB ===');

  // Orden respetando FK
  await p.inventoryUsage.deleteMany();
  await p.inventoryItem.deleteMany();
  await p.payment.deleteMany();
  await p.evolution.deleteMany();
  await p.toothRecord.deleteMany();
  await p.appointment.deleteMany();
  await p.treatment.deleteMany();
  await p.loginLog.deleteMany();
  await p.paymentReceipt.deleteMany();
  await p.clinicSubscription.deleteMany();
  await p.patient.deleteMany();
  await p.user.deleteMany();
  await p.clinic.deleteMany();
  console.log('✓ DB limpia');

  console.log('\n=== SEMBRANDO DATOS ===');

  // 1. Clínica
  const clinic = await p.clinic.create({
    data: {
      name: 'Red Dental',
      slug: 'red-dental',
      address: 'Dirección de la clínica',
      phone: '0999999999',
      contactEmail: 'info@reddental.com',
      active: true
    }
  });
  console.log(`✓ Clínica: ${clinic.name} (${clinic.slug})`);

  // 2. Admin
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await p.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@reddental.com',
      username: 'admin',
      password: adminHash,
      role: 'ADMIN',
      clinicId: clinic.id,
      active: true
    }
  });
  console.log(`✓ Admin: ${admin.username} / admin123`);

  // 3. Ortodoncista
  const orthoHash = await bcrypt.hash('ortodoncia123', 10);
  const ortho = await p.user.create({
    data: {
      name: 'Dr. Ortiz',
      email: 'ortiz@reddental.com',
      username: 'ortiz',
      password: orthoHash,
      role: 'ORTHODONTIST',
      clinicId: clinic.id,
      active: true
    }
  });
  console.log(`✓ Ortodoncista: ${ortho.username} / ortodoncia123`);

  // 4. Recepcionista (opcional)
  const recepHash = await bcrypt.hash('recepcion123', 10);
  const recep = await p.user.create({
    data: {
      name: 'Recepcionista',
      email: 'recepcion@reddental.com',
      username: 'recepcion',
      password: recepHash,
      role: 'RECEPTIONIST',
      clinicId: clinic.id,
      active: true
    }
  });
  console.log(`✓ Recepcionista: ${recep.username} / recepcion123`);

  console.log('\n=== SEED COMPLETADO ===');
  console.log('Admin:        admin / admin123');
  console.log('Ortodoncista: ortiz / ortodoncia123');
  console.log('Recepcion:    recepcion / recepcion123');
}

main()
  .catch(e => { console.error('ERROR:', e.message.substring(0,500)); process.exit(1); })
  .finally(() => p.$disconnect());
