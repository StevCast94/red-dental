/**
 * Script para migrar imágenes de evoluciones desde archivos locales
 * o URLs rotas hacia Supabase Storage.
 * 
 * Uso: npx ts-node migrate-images.ts
 * 
 * Requiere SUPABASE_URL y SUPABASE_SERVICE_KEY en .env
 * y DATABASE_URL apuntando a la base de datos (local o producción)
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const prisma = new PrismaClient();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BUCKET = 'evolutions';

// Directorio local de imágenes legacy
const LEGACY_DIR = path.join(__dirname, '../uploads-legacy/photos');

async function downloadImage(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', () => resolve(null));
  });
}

async function uploadToSupabase(buffer: Buffer, filename: string, contentType: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType,
      cacheControl: '31536000',
      upsert: true,
    });

  if (error) {
    console.error(`  Error subiendo ${filename}: ${error.message}`);
    return null;
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return urlData.publicUrl;
}

async function main() {
  console.log('🔍 Buscando evoluciones con imágenes...\n');
  
  const evolutions = await prisma.evolution.findMany({
    where: {
      OR: [
        { photoBefore: { not: null } },
        { photoAfter: { not: null } },
      ],
    },
    include: {
      treatment: {
        include: { patient: { select: { firstName: true, lastName: true } } }
      }
    }
  });

  console.log(`📸 Total evoluciones con imágenes: ${evolutions.length}\n`);

  let migrated = 0;
  let failed = 0;

  for (const evo of evolutions) {
    const patientName = `${evo.treatment.patient.firstName} ${evo.treatment.patient.lastName}`;
    console.log(`\nPaciente: ${patientName} | Evo: ${evo.id.slice(0, 8)}...`);

    // Migrar photoBefore
    if (evo.photoBefore) {
      const url = evo.photoBefore;
      const isLocalPath = url.startsWith('/uploads/') || url.startsWith('uploads/');
      
      if (isLocalPath) {
        // Está en filesystem local
        const filename = path.basename(url);
        const localPath = path.join(LEGACY_DIR, filename);
        
        if (fs.existsSync(localPath)) {
          const buffer = fs.readFileSync(localPath);
          const contentType = filename.endsWith('.png') ? 'image/png' 
                           : filename.endsWith('.gif') ? 'image/gif'
                           : filename.endsWith('.webp') ? 'image/webp'
                           : 'image/jpeg';
          
          const newUrl = await uploadToSupabase(buffer, filename, contentType);
          if (newUrl) {
            await prisma.evolution.update({
              where: { id: evo.id },
              data: { photoBefore: newUrl },
            });
            console.log(`  ✅ Before: ${filename} → Supabase`);
            migrated++;
          } else {
            console.log(`  ❌ Before: ${filename} falló`);
            failed++;
          }
        } else {
          console.log(`  ⚠️ Before: ${filename} no encontrado en filesystem`);
          failed++;
        }
      } else if (url.startsWith('http')) {
        // Es URL remota - probar si funciona
        try {
          const buffer = await downloadImage(url);
          if (buffer) {
            const filename = `migrated-${evo.id.slice(0, 8)}-before.jpg`;
            const newUrl = await uploadToSupabase(buffer, filename, 'image/jpeg');
            if (newUrl) {
              await prisma.evolution.update({
                where: { id: evo.id },
                data: { photoBefore: newUrl },
              });
              console.log(`  ✅ Before remoto migrado a Supabase`);
              migrated++;
            } else {
              failed++;
            }
          } else {
            console.log(`  ⚠️ Before: URL remota inaccesible: ${url.slice(0, 60)}...`);
            failed++;
          }
        } catch {
          console.log(`  ⚠️ Before: Error descargando URL remota`);
          failed++;
        }
      } else {
        console.log(`  ⚠️ Before: URL desconocida: ${url}`);
        failed++;
      }
    }

    // Migrar photoAfter
    if (evo.photoAfter) {
      const url = evo.photoAfter;
      const isLocalPath = url.startsWith('/uploads/') || url.startsWith('uploads/');
      
      if (isLocalPath) {
        const filename = path.basename(url);
        const localPath = path.join(LEGACY_DIR, filename);
        
        if (fs.existsSync(localPath)) {
          const buffer = fs.readFileSync(localPath);
          const contentType = filename.endsWith('.png') ? 'image/png' 
                           : filename.endsWith('.gif') ? 'image/gif'
                           : filename.endsWith('.webp') ? 'image/webp'
                           : 'image/jpeg';
          
          const newUrl = await uploadToSupabase(buffer, filename, contentType);
          if (newUrl) {
            await prisma.evolution.update({
              where: { id: evo.id },
              data: { photoAfter: newUrl },
            });
            console.log(`  ✅ After: ${filename} → Supabase`);
            migrated++;
          } else {
            console.log(`  ❌ After: ${filename} falló`);
            failed++;
          }
        } else {
          console.log(`  ⚠️ After: ${filename} no encontrado en filesystem`);
          failed++;
        }
      } else if (url.startsWith('http')) {
        try {
          const buffer = await downloadImage(url);
          if (buffer) {
            const filename = `migrated-${evo.id.slice(0, 8)}-after.jpg`;
            const newUrl = await uploadToSupabase(buffer, filename, 'image/jpeg');
            if (newUrl) {
              await prisma.evolution.update({
                where: { id: evo.id },
                data: { photoAfter: newUrl },
              });
              console.log(`  ✅ After remoto migrado a Supabase`);
              migrated++;
            } else {
              failed++;
            }
          } else {
            console.log(`  ⚠️ After: URL remota inaccesible`);
            failed++;
          }
        } catch {
          console.log(`  ⚠️ After: Error descargando URL remota`);
          failed++;
        }
      } else {
        console.log(`  ⚠️ After: URL desconocida: ${url}`);
        failed++;
      }
    }
  }

  console.log(`\n📊 RESUMEN:`);
  console.log(`   ✅ Migradas: ${migrated}`);
  console.log(`   ❌ Fallaron: ${failed}`);
  console.log(`   📸 Total evoluciones procesadas: ${evolutions.length}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
