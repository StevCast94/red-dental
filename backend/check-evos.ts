import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const evos = await p.evolution.findMany({
    include: { treatment: { include: { patient: true } } }
  });
  for (const e of evos) {
    console.log('Evo:', e.id);
    console.log('  date:', e.date);
    console.log('  observations:', JSON.stringify(e.observations));
    console.log('  photoBefore:', JSON.stringify(e.photoBefore));
    console.log('  photoAfter:', JSON.stringify(e.photoAfter));
    console.log('  keys:', Object.keys(e).join(', '));
    console.log('  Paciente:', e.treatment?.patient?.firstName, e.treatment?.patient?.lastName);
    console.log('---');
  }
  await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); });
