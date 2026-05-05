const { execSync } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, 'backend');
const dbUrl = process.env.DATABASE_URL || '';
const PORT = process.env.PORT || 5000;

console.log('🚀 RED DENTAL - Starting up...');
console.log(`📌 PORT env: ${process.env.PORT}`);
console.log(`📌 DATABASE_URL present: ${!!dbUrl}`);
console.log(`📌 DATABASE_URL prefix: ${dbUrl.substring(0, 20)}...`);

// 👇 Cambiar esquema si es PostgreSQL
if (dbUrl.startsWith('postgresql://')) {
  console.log('🔄 PostgreSQL detected, switching schema...');
  const fs = require('fs');
  try {
    fs.copyFileSync(
      path.join(backendDir, 'prisma', 'schema.railway.prisma'),
      path.join(backendDir, 'prisma', 'schema.prisma')
    );
    console.log('✅ Schema switched to PostgreSQL');
  } catch (err) {
    console.error('❌ Failed to switch schema:', err.message);
    process.exit(1);
  }
} else {
  console.log('⚠️ No PostgreSQL DATABASE_URL found, using default schema (SQLite)');
}

// 👇 Generar Prisma client
console.log('🔄 Generating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit', cwd: backendDir });
  console.log('✅ Prisma client generated');
} catch (err) {
  console.error('❌ Prisma generate failed:', err.message);
  process.exit(1);
}

// 👇 Push schema
console.log('🔄 Pushing schema to database...');
try {
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: backendDir });
  console.log('✅ Schema pushed');
} catch (err) {
  console.error('❌ Prisma db push failed:', err.message);
  process.exit(1);
}

// Si no hay DB, hacemos seed rápido inline
const fs = require('fs');
const seedPath = path.join(backendDir, 'prisma', 'dev.db');
if (!fs.existsSync(seedPath) || fs.statSync(seedPath).size < 1000) {
  console.log('🌱 Running seed...');
  try {
    execSync('npx ts-node src/utils/seed.ts', { stdio: 'inherit', cwd: backendDir });
    console.log('✅ Seed complete');
  } catch (err) {
    // Si ts-node no funciona, intentar con el seed compilado
    try { require('./backend/dist/utils/seed.js'); } catch {}
  }
}

console.log(`🚀 Starting server on PORT ${PORT}...`);
try {
  require('./backend/dist/server.js');
} catch (err) {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
}
