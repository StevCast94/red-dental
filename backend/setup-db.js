const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Si DATABASE_URL comienza con postgresql, usar schema de PostgreSQL
const dbUrl = process.env.DATABASE_URL || '';
const schemaDir = path.join(__dirname, '..', 'prisma');

if (dbUrl.startsWith('postgresql://')) {
  console.log('🔄 PostgreSQL detected, switching schema...');
  fs.copyFileSync(
    path.join(schemaDir, 'schema.railway.prisma'),
    path.join(schemaDir, 'schema.prisma')
  );
  console.log('✅ Schema switched to PostgreSQL');
} else {
  console.log('🔄 SQLite detected, keeping current schema');
}

// Generate Prisma client
console.log('🔄 Generating Prisma client...');
execSync('npx prisma generate', { stdio: 'inherit', cwd: __dirname });

// Push schema to database
console.log('🔄 Pushing schema...');
execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: __dirname });

// Seed admin user if no users exist
console.log('🔄 Checking for seed data...');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function seed() {
  const count = await prisma.user.count();
  if (count === 0) {
    console.log('🌱 Seeding admin user...');
    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        name: 'Dr. Admin',
        email: 'admin@ortodoncia.com',
        password: hashed,
        role: 'ADMIN',
      },
    });
    await prisma.user.create({
      data: {
        name: 'Dr. García',
        email: 'garcia@ortodoncia.com',
        password: hashed,
        role: 'ORTHODONTIST',
      },
    });
    console.log('✅ Seed complete');
  } else {
    console.log(`✅ ${count} users already exist, skipping seed`);
  }
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});

console.log('✅ Database setup complete');
