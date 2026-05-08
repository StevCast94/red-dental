// Configurar bucket de Supabase Storage para fotos de evoluciones
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env');
  console.log('Agrega al .env:');
  console.log('SUPABASE_URL=https://rkwbixidpaqweavghfea.supabase.co');
  console.log('SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd2JpeGlkcGFxd2VhdmdoZmVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc2NjE5OCwiZXhwIjoyMDkzMzQyMTk4fQ.YhuyGwW8qia858aqMfu3nhPkmLNoIRgdWpQ6AxSvI9U');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  // 1. Crear bucket 'evolutions' si no existe
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === 'evolutions');
  
  if (!exists) {
    const { data, error } = await supabase.storage.createBucket('evolutions', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    });
    if (error) {
      console.error('❌ Error creando bucket:', error.message);
      process.exit(1);
    }
    console.log('✅ Bucket "evolutions" creado');
  } else {
    console.log('✅ Bucket "evolutions" ya existe');
    
    // Actualizar para hacerlo público
    const { error } = await supabase.storage.updateBucket('evolutions', {
      public: true,
      fileSizeLimit: 10485760,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    });
    if (error) console.error('⚠️ Error actualizando bucket:', error.message);
    else console.log('✅ Bucket actualizado como público');
  }

  // 2. Verificar que está accesible
  const { data: test } = await supabase.storage.from('evolutions').list('', { limit: 1 });
  console.log(`✅ Bucket accesible. Archivos actuales: ${test?.length || 0}`);

  // 3. Mostrar URL pública de ejemplo
  const { data: urlData } = supabase.storage.from('evolutions').getPublicUrl('test.png');
  console.log(`📎 URL pública base: ${urlData.publicUrl.replace('/test.png', '/')}`);
}

setupStorage().catch(console.error);
