import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
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

app.use(cors());
app.use(express.json());

// Routes
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

// Forzar charset UTF-8 en todas las respuestas
// Servir archivos subidos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Servir frontend estático (build de producción si existe)
const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
const fs = require('fs');
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});
