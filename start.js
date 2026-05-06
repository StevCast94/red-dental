const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');
const distDir = path.join(backendDir, 'dist');
const dbUrl = process.env.DATABASE_URL || '';
const PORT = process.env.PORT || 5000;

console.log('🚀 RED DENTAL - Starting up...');

// ─── Build Backend si es necesario ───────────────────────────
if (!fs.existsSync(path.join(distDir, 'server.js'))) {
  console.log('🔄 Compilando backend...');
  execSync('npm install', { stdio: 'inherit', cwd: backendDir });
  execSync('npm run build', { stdio: 'inherit', cwd: backendDir });
  console.log('✅ Backend compilado');
}

// ─── Build Frontend si es necesario ──────────────────────────
if (!fs.existsSync(path.join(frontendDir, 'dist', 'index.html'))) {
  console.log('🔄 Compilando frontend...');
  execSync('npm install', { stdio: 'inherit', cwd: frontendDir });
  execSync('npm run build', { stdio: 'inherit', cwd: frontendDir });
  console.log('✅ Frontend compilado');
}

// ─── Cambiar esquema si es PostgreSQL ────────────────────────
if (dbUrl.startsWith('postgresql://')) {
  console.log('🔄 PostgreSQL detectado, cambiando schema...');
  try {
    fs.copyFileSync(
      path.join(backendDir, 'prisma', 'schema.railway.prisma'),
      path.join(backendDir, 'prisma', 'schema.prisma')
    );
    console.log('✅ Schema cambiado a PostgreSQL');
  } catch (err) {
    console.error('❌ Error al cambiar schema:', err.message);
    process.exit(1);
  }
} else {
  console.log('⚠️ Sin DATABASE_URL de PostgreSQL, usando SQLite');
}

// ─── Generar Prisma Client ──────────────────────────────────
console.log('🔄 Generando Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit', cwd: backendDir });
  console.log('✅ Prisma client generado');
} catch (err) {
  console.error('❌ Prisma generate falló:', err.message);
  process.exit(1);
}

// ─── Push schema a DB ────────────────────────────────────────
console.log('🔄 Subiendo schema a la base de datos...');
try {
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: backendDir });
  console.log('✅ Schema subido');
} catch (err) {
  console.error('❌ Prisma db push falló:', err.message);
  process.exit(1);
}

// ─── Seed (solo si no hay datos) ─────────────────────────────
console.log('🌱 Verificando seed...');
try {
  const { PrismaClient } = require(path.join(backendDir, 'node_modules', '@prisma', 'client'));
  const p = new PrismaClient();
  Promise.race([
    p.clinic.count().then(c => { if (c === 0) throw new Error('no-data'); }),
    new Promise((_, r) => setTimeout(() => r('timeout'), 5000))
  ]).then(() => {
    console.log('✅ DB ya tiene datos, saltando seed');
    p.$disconnect();
  }).catch(() => {
    p.$disconnect();
    console.log('🌱 DB vacía, ejecutando seed...');
    try {
      execSync('npx ts-node src/utils/seed.ts', { stdio: 'inherit', cwd: backendDir });
    } catch {
      try { require('./backend/dist/utils/seed.js'); } catch {}
    }
    console.log('✅ Seed completado');
  });
} catch (e) {
  console.log('⚠️ No se pudo verificar seed, continuando...');
}

// ─── Arrancar servidor ───────────────────────────────────────
console.log(`🚀 Iniciando servidor en puerto ${PORT}...`);
try {
  require('./backend/dist/server.js');
} catch (err) {
  console.error('❌ Error al iniciar servidor:', err.message);
  process.exit(1);
}
