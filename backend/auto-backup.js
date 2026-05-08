/**
 * Script de backup automático para RED Dental.
 * Uso: node auto-backup.js [production_url] [username] [password]
 * 
 * Si se ejecuta sin argumentos, usa configuración local (localhost:5000, stevens/admin123).
 * 
 * Ejecución programada (openclaw cron):
 *   Diario a las 23:00 (América/Guayaquil)
 *   node auto-backup.js https://red-dental-production.up.railway.app stevens admin123
 * 
 * Ejemplo manual (local):
 *   node auto-backup.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.argv[2] || 'http://localhost:5000';
const ADMIN_USER = process.argv[3] || 'stevens';
const ADMIN_PASS = process.argv[4] || 'admin123';
const BACKUP_DIR = path.join(__dirname, 'backups');

function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    if (body) {
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
        } else {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
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

  // 1. Hacer login
  console.log(`🔑 Iniciando sesión como ${ADMIN_USER}...`);
  const loginBody = JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS });
  const login = await httpRequest(`${BASE_URL}/api/auth/login`, { method: 'POST' }, loginBody);
  const token = login.token;
  if (!token) throw new Error('No se pudo obtener token de autenticación');
  console.log('✅ Login exitoso');

  // 2. Ejecutar backup global
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  console.log('⏳ Ejecutando backup global...');
  const backup = await httpRequest(`${BASE_URL}/api/admin/backup-all`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // 3. Guardar archivo
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');
  const stats = fs.statSync(filepath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  const totalPatients = backup.patients?.length || 0;
  const totalTreatments = backup.treatments?.length || 0;
  
  console.log(`✅ Backup completado: ${filename}`);
  console.log(`   Tamaño: ${sizeMB} MB`);
  console.log(`   Clínicas: ${backup.clinics?.length || 0}`);
  console.log(`   Pacientes: ${totalPatients}`);
  console.log(`   Tratamientos: ${totalTreatments}`);

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
  
  // Output para consumo por script (JSON en última línea)
  const resultLine = JSON.stringify({ success: true, filename, sizeMB, clinics: backup.clinics?.length, patients: totalPatients, treatments: totalTreatments, timestamp });
  console.log(`RESULT:${resultLine}`);
}

main().catch(err => {
  console.error(`❌ Error en backup automático:`, err.message);
  const resultLine = JSON.stringify({ success: false, error: err.message });
  console.log(`RESULT:${resultLine}`);
  process.exit(1);
});
