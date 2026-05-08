import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import patientRoutes from './routes/patientRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import treatmentRoutes from './routes/treatmentRoutes';
import evolutionRoutes from './routes/evolutionRoutes';
import paymentRoutes from './routes/paymentRoutes';
import toothRoutes from './routes/toothRoutes';
import exportRoutes from './routes/exportRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import uploadRoutes from './routes/uploadRoutes';
import profileRoutes from './routes/profileRoutes';
import reminderRoutes from './routes/reminderRoutes';
import reportsRoutes from './routes/reportsRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;
export const prisma = new PrismaClient();

// ─── Trust proxy para rate limiter detrás de Railway ──────
app.set('trust proxy', 1);

// ─── Seguridad ───────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());

// ─── Rate Limiting ───────────────────────────────────────────
// Rate limit estricto para login (evita fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
});
app.use('/api/auth', authLimiter);

// Rate limit generoso para rutas admin (backups, impersonación)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes administrativas. Intenta de nuevo en 15 minutos.' },
});
app.use('/api/admin', adminLimiter);

// Rate limit general para el resto de API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
});
app.use('/api', apiLimiter);

// ─── Logging ─────────────────────────────────────────────────
app.use(morgan('short'));

// ─── Parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ─── Servir archivos subidos (deprecated: ahora se usa Supabase Storage) ──
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Rutas API ───────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/evolutions', evolutionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/odontogram', toothRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/reports', reportsRoutes);

// ─── Frontend estático ───────────────────────────────────────
const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    }
  });
  console.log(`📦 Sirviendo frontend estático desde ${frontendBuildPath}`);
} else {
  console.log('⚠️ No hay build de frontend. Usa: cd frontend && npm run build');
}

// ─── Error handler global ────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Error no controlado:', err.message);
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// ─── Graceful shutdown ───────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});

function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Recibida señal ${signal}. Cerrando conexiones...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('👋 Conexiones cerradas. Hasta luego!');
    process.exit(0);
  });
  // Forzar cierre después de 10s
  setTimeout(() => {
    console.error('💥 Forzando cierre después de timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
