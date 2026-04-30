import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Limpiar datos existentes
  await prisma.inventoryUsage.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.evolution.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  // Crear usuarios
  const password = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      name: 'Dr. Admin',
      email: 'admin@ortodoncia.com',
      password,
      role: 'ADMIN',
    },
  });

  const orthodontist = await prisma.user.create({
    data: {
      name: 'Dr. García',
      email: 'garcia@ortodoncia.com',
      password,
      role: 'ORTHODONTIST',
    },
  });

  const receptionist = await prisma.user.create({
    data: {
      name: 'María Pérez',
      email: 'maria@ortodoncia.com',
      password,
      role: 'RECEPTIONIST',
    },
  });

  // Crear pacientes
  const patient1 = await prisma.patient.create({
    data: {
      firstName: 'Juan',
      lastName: 'Pérez',
      birthDate: new Date('1990-05-15'),
      phone: '0991234567',
      email: 'juan@email.com',
      address: 'Av. Principal 123',
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
      orthodontistId: orthodontist.id,
    },
  });

  // Crear tratamientos
  await prisma.treatment.create({
    data: {
      type: 'METAL_BRACES',
      startDate: new Date('2025-01-15'),
      estimatedMonths: 24,
      active: true,
      patientId: patient1.id,
      phases: JSON.stringify(['Colocación', 'Alineación', 'Cierre de espacios', 'Detalles finales', 'Retiro']),
    },
  });

  await prisma.treatment.create({
    data: {
      type: 'INVISIBLE_ALIGNERS',
      startDate: new Date('2025-03-01'),
      estimatedMonths: 12,
      active: true,
      patientId: patient2.id,
      phases: JSON.stringify(['Escaneo inicial', 'Primer set de aligners', 'Control mensual']),
    },
  });

  // Crear citas
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

  // Crear inventario
  await prisma.inventoryItem.create({
    data: {
      name: 'Brackets metálicos',
      category: 'Brackets',
      stock: 200,
      minStock: 50,
    },
  });

  await prisma.inventoryItem.create({
    data: {
      name: 'Arcos de nitinol',
      category: 'Arcos',
      stock: 30,
      minStock: 10,
    },
  });

  await prisma.inventoryItem.create({
    data: {
      name: 'Ligas elásticas',
      category: 'Ligas',
      stock: 500,
      minStock: 100,
    },
  });

  console.log('✅ Seed ejecutado correctamente');
  console.log('📧 Credenciales de prueba:');
  console.log('   admin@ortodoncia.com / admin123');
  console.log('   garcia@ortodoncia.com / admin123');
  console.log('   maria@ortodoncia.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
