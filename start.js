const { execSync } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, 'backend');
const dbUrl = process.env.DATABASE_URL || '';

if (dbUrl.startsWith('postgresql://')) {
  console.log('🔄 PostgreSQL detected, switching schema...');
  const fs = require('fs');
  fs.copyFileSync(
    path.join(backendDir, 'prisma', 'schema.railway.prisma'),
    path.join(backendDir, 'prisma', 'schema.prisma')
  );
  console.log('✅ Schema switched to PostgreSQL');
}

console.log('🔄 Generating Prisma client...');
execSync('npx prisma generate', { stdio: 'inherit', cwd: backendDir });

console.log('🔄 Pushing schema...');
execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: backendDir });

// Seed admin user if no users exist
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function seed() {
  const count = await prisma.user.count();
  if (count === 0) {
    console.log('🌱 Seeding admin user...');
    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: { name: 'Dr. Admin', email: 'admin@ortodoncia.com', password: hashed, role: 'ADMIN' },
    });
    await prisma.user.create({
      data: { name: 'Dr. García', email: 'garcia@ortodoncia.com', password: hashed, role: 'ORTHODONTIST' },
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
}).then(() => {
  // Start server
  console.log('🚀 Starting server...');
  require('./backend/dist/server.js');
});
