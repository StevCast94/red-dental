import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CLINICS = [
  { name: 'REDH Dental', slug: 'redh-dental' },
];

async function main() {
  // Limpiar datos existentes (orden respetando FK)
  await prisma.loginLog.deleteMany();
  await prisma.clinicSubscription.deleteMany();
  await prisma.inventoryUsage.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.toothRecord.deleteMany();
  await prisma.evolution.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinic.deleteMany();

  const password = await bcrypt.hash('admin123', 10);

  // 1. SUPER ADMIN — sin clínica asignada, ve todo
  await prisma.user.create({
    data: {
      name: 'Stevens (Super Admin)',
      username: 'stevens',
      email: 'stevens@reddental.com',
      password,
      role: 'SUPER_ADMIN',
      clinicId: null,
    },
  });
  console.log(`👑 Super Admin: stevens / admin123`);
  console.log(`🏥 REDH Dental Admin: dra.rita / admin123`);

  // 2. Crear clínicas con sus usuarios
  let clinicIndex = 0;
  for (const clinicData of CLINICS) {
    const slug = clinicData.slug;

    // Crear clínica
    const clinic = await prisma.clinic.create({
      data: {
        name: clinicData.name,
        slug,
      },
    });

    // Crear suscripción para cada clínica
    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    await prisma.clinicSubscription.create({
      data: {
        clinicId: clinic.id,
        plan: 'MONTHLY',
        amount: 100,
        nextBilling,
        active: true,
      },
    });

    // Usuarios de esta clínica
    const admin = await prisma.user.create({
      data: {
        name: `Dra. Rita`,
        username: `dra.rita`,
        email: `drita@redhdental.com`,
        password,
        role: 'ADMIN',
        clinicId: clinic.id,
      },
    });

    const orthodontist = await prisma.user.create({
      data: {
        name: `Dr. Carlos Mendoza`,
        username: `dr.carlos`,
        email: `cmendoza@redhdental.com`,
        password,
        role: 'ORTHODONTIST',
        clinicId: clinic.id,
      },
    });

    await prisma.user.create({
      data: {
        name: `María González`,
        username: `maria.recepcion`,
        email: `mgonzalez@redhdental.com`,
        password,
        role: 'RECEPTIONIST',
        clinicId: clinic.id,
      },
    });

    // Crear pacientes para esta clínica
    const patient1 = await prisma.patient.create({
      data: {
        firstName: 'Juan',
        lastName: 'Pérez',
        birthDate: new Date('1990-05-15'),
        phone: '0991234567',
        email: 'juan@email.com',
        address: 'Av. Principal 123',
        clinicId: clinic.id,
        orthodontistId: orthodontist.id,
      },
    });

    const patient2 = await prisma.patient.create({
      data: {
        firstName: 'Ana',
        lastName: 'López',
        birthDate: new Date('2000-08-22'),
        phone: '0997654321',
        email: 'ana@email.com',
        address: 'Calle Secundaria 456',
        clinicId: clinic.id,
        orthodontistId: orthodontist.id,
      },
    });

    // Tratamientos
    await prisma.treatment.create({
      data: {
        type: 'METAL_BRACES',
        estimatedMonths: 24,
        active: true,
        patientId: patient1.id,
        phases: JSON.stringify(['Colocación', 'Alineación', 'Cierre de espacios', 'Detalles finales', 'Retiro']),
      },
    });

    await prisma.treatment.create({
      data: {
        type: 'INVISIBLE_ALIGNERS',
        estimatedMonths: 12,
        active: true,
        patientId: patient2.id,
        phases: JSON.stringify(['Escaneo inicial', 'Primer set de aligners', 'Control mensual']),
      },
    });

    // Citas
    await prisma.appointment.create({
      data: {
        date: new Date('2025-06-01T10:00:00Z'),
        duration: 30,
        type: 'ADJUSTMENT',
        status: 'SCHEDULED',
        patientId: patient1.id,
        orthodontistId: orthodontist.id,
      },
    });

    await prisma.appointment.create({
      data: {
        date: new Date('2025-06-02T11:00:00Z'),
        duration: 45,
        type: 'INITIAL_CONSULTATION',
        status: 'SCHEDULED',
        patientId: patient2.id,
        orthodontistId: orthodontist.id,
      },
    });

    // Login logs de ejemplo para esta clínica
    await prisma.loginLog.create({
      data: {
        username: 'dra.rita',
        clinicId: clinic.id,
        success: true,
        ip: '192.168.1.100',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    });
    await prisma.loginLog.create({
      data: {
        username: 'dra.rita',
        clinicId: clinic.id,
        success: false,
        ip: '192.168.1.100',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
    });

    console.log(`🏥 ${clinicData.name}: ${clinic.name}`);
    console.log(`   dra.rita (Admin)`);
    console.log(`   dr.carlos (Ortodoncista)`);
    console.log(`   maria.recepcion (Recepcionista)`);
    clinicIndex++;
  } // end for

  // Login log del super admin
  await prisma.loginLog.create({
    data: {
      username: 'stevens',
      clinicId: null,
      success: true,
      ip: '192.168.1.1',
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  });

  // Inventario (compartido entre clínicas)
  await prisma.inventoryItem.createMany({
    data: [
      { name: 'Brackets metálicos', category: 'Brackets', stock: 200, minStock: 50 },
      { name: 'Arcos de nitinol', category: 'Arcos', stock: 30, minStock: 10 },
      { name: 'Ligas elásticas', category: 'Ligas', stock: 500, minStock: 100 },
    ],
  });

  console.log('\n✅ Seed ejecutado correctamente');
  console.log('🔑 Contraseña general: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
