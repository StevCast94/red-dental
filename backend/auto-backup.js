/**
 * Script de backup automático para RED Dental.
 * Uso: node auto-backup.js [production_url] [admin_token]
 * 
 * Si se ejecuta sin argumentos, usa configuración local.
 * 
 * Ejecución programada (openclaw cron):
 *   - Diario a las 23:00 (América/Guayaquil)
 *   - Guarda en C:\Users\Admin\.openclaw\workspace\OrtodonciaPlus\backend\backups\
 * 
 * Ejemplo manual:
 *   node auto-backup.js https://red-dental-production.up.railway.app <token_admin>
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.argv[2] || 'http://localhost:5000';
const ADMIN_TOKEN = process.argv[3];
const BACKUP_DIR = path.join(__dirname, 'backups');

function httpGet(url, token) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const options = { headers: {} };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    client.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        } else {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log(`🔄 Iniciando backup desde ${BASE_URL}...`);
  console.log(`📁 Destino: ${BACKUP_DIR}`);

  // Crear directorio si no existe
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('📁 Directorio de backups creado');
  }

  // 1. Obtener token si no se proporcionó
  let token = ADMIN_TOKEN;
  if (!token && BASE_URL.includes('localhost')) {
    try {
      const login = await httpGet(`${BASE_URL}/api/auth/login`, null);
      // No podemos hacer login sin token, mejor pedir token
      console.log('⚠️  Proporciona un token de admin como segundo argumento.');
      console.log('   Ej: node auto-backup.js https://red-dental-production.up.railway.app <token>');
      console.log('   Obten el token haciendo login en la app o usando el endpoint de impersonación.');
      process.exit(1);
    } catch (e) {
      console.log('⚠️  No se pudo hacer login automático. Proporciona token manualmente.');
      process.exit(1);
    }
  }

  if (!token) {
    console.log('❌ Token de administrador requerido.');
    console.log('   Uso: node auto-backup.js <url> <token_admin>');
    process.exit(1);
  }

  // 2. Ejecutar backup global
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  console.log(`⏳ Ejecutando backup global...`);

  const backup = await httpGet(`${BASE_URL}/api/admin/backup-all`, token);
  
  // 3. Guardar archivo
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');
  const stats = fs.statSync(filepath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`✅ Backup completado: ${filename}`);
  console.log(`   Tamaño: ${sizeMB} MB`);
  console.log(`   Clínicas: ${backup.clinics?.length || 0}`);
  console.log(`   Pacientes: ${backup.patients?.length || 0}`);
  console.log(`   Tratamientos: ${backup.treatments?.length || 0}`);

  // 4. Limpiar backups antiguos (más de 30 días)
  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  let deleted = 0;
  for (const file of files) {
    if (!file.startsWith('backup-')) continue;
    const fpath = path.join(BACKUP_DIR, file);
    const age = now - fs.statSync(fpath).mtimeMs;
    if (age > 30 * 24 * 60 * 60 * 1000) {
      fs.unlinkSync(fpath);
      deleted++;
    }
  }
  if (deleted > 0) console.log(`🧹 Backups antiguos eliminados: ${deleted}`);

  console.log(`\n🎉 Backup automático finalizado.`);
}

main().catch(err => {
  console.error(`❌ Error en backup automático:`, err.message);
  process.exit(1);
});
