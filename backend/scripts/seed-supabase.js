/**
 * Seed controlado para Red Dental en Supabase.
 * Usando las credenciales que maduramos: stevens / Admin123
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

async function main() {
  console.log('=== LIMPIANDO DB ===');
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

  console.log('\n=== SEMBRANDO ===');

  // Clínica por defecto
  const clinic = await p.clinic.create({
    data: {
      name: 'Red Dental',
      slug: 'red-dental',
      address: '',
      phone: '',
      active: true
    }
  });
  console.log(`✓ Clínica: ${clinic.name}`);

  // SUPER_ADMIN (multi-clínica) - sin clinicId
  const superHash = await bcrypt.hash('Admin123', 10);
  const superAdmin = await p.user.create({
    data: {
      name: 'Stevens',
      email: 'stevens@reddental.com',
      username: 'stevens',
      password: superHash,
      role: 'ADMIN',
      active: true
    }
  });
  console.log(`✓ Super Admin: ${superAdmin.username} / Admin123`);

  // Admin de la clínica
  const adminHash = await bcrypt.hash('admin123', 10);
  await p.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@ortodoncia.com',
      username: 'admin',
      password: adminHash,
      role: 'ADMIN',
      clinicId: clinic.id,
      active: true
    }
  });
  console.log('✓ Admin clínica: admin / admin123');

  // Ortodoncista
  const orthoHash = await bcrypt.hash('ortodoncia123', 10);
  await p.user.create({
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
  console.log('✓ Ortodoncista: ortiz / ortodoncia123');

  // Recepcionista
  const recepHash = await bcrypt.hash('recepcion123', 10);
  await p.user.create({
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
  console.log('✓ Recepcionista: recepcion / recepcion123');

  console.log('\n=== LISTO ===');
  console.log('Super Admin:   stevens / Admin123');
  console.log('Admin clínica: admin / admin123');
  console.log('Ortodoncista:  ortiz / ortodoncia123');
  console.log('Recepción:     recepcion / recepcion123');
}

main()
  .catch(e => { console.error('ERROR:', e.message.substring(0,500)); process.exit(1); })
  .finally(() => p.$disconnect());
