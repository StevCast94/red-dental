import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function test() {
  const users = await p.user.findMany();
  console.log('Users found:', users.length);
  users.forEach(u => console.log(u.email, u.role));
}

test().catch(e => console.error('ERROR:', e)).finally(() => p.$disconnect());
