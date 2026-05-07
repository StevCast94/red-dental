import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Obtener perfil del usuario autenticado
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, username: true, email: true, role: true, active: true, clinicId: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar perfil
router.put('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
      data.email = email;
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, clinicId: true },
    });
    // Generar nuevo token con datos actualizados
    const jwt = require('../utils/jwt');
    const token = jwt.generateToken(user);
    res.json({ user, token });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Cambiar contraseña
router.put('/password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Contraseña actual incorrecta' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed },
    });
    res.json({ message: 'Contraseña actualizada' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
