const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  
  const user = await prisma.user.create({
    data: {
      name: 'Stevens (Super Admin)',
      username: 'stevens',
      email: 'stevens@reddental.com',
      password,
      role: 'SUPER_ADMIN',
      clinicId: null,
    },
  });
  
  console.log('Super Admin creado:', user.username, '/ admin123');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
