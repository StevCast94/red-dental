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

console.log('✅ Database setup complete');
