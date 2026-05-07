import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate, requireRole } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();
const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Dropdown de usuarios activos — solo de la clínica del usuario autenticado
router.get('/dropdown', async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.query;
    const where: any = { active: true };
    if (role) where.role = String(role);
    // Filtrar por clínica, excepto SUPER_ADMIN
    if (req.user?.role !== 'SUPER_ADMIN') {
      where.clinicId = req.user?.clinicId;
    }
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Listar usuarios — ADMIN ve los de su clínica, SUPER_ADMIN ve todos
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.user?.role !== 'SUPER_ADMIN') {
      where.clinicId = req.user?.clinicId;
    }
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, username: true, email: true, role: true, active: true, clinicId: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear usuario (ADMIN de clínica o SUPER_ADMIN)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, username, email, password, role } = req.body;
    if (!name || !username || !password || !role) {
      return res.status(400).json({ error: 'name, username, password y role son requeridos' });
    }
    // Solo ADMIN/SUPER_ADMIN pueden crear usuarios
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });
    if (existing) return res.status(400).json({ error: 'El email o username ya está registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        username,
        email: email || `${username}@reddental.com`,
        password: hashed,
        role,
        clinicId: req.user?.role === 'SUPER_ADMIN' ? (req.body.clinicId || null) : req.user?.clinicId,
      },
      select: { id: true, name: true, username: true, email: true, role: true, active: true, clinicId: true },
    });
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Actualizar usuario
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, username, email, role, active, clinicId } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (username !== undefined) data.username = username;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (active !== undefined) data.active = active;
    if (clinicId !== undefined && req.user?.role === 'SUPER_ADMIN') data.clinicId = clinicId;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, username: true, email: true, role: true, active: true, clinicId: true },
    });
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Cambiar contraseña (el propio usuario o ADMIN/SUPER_ADMIN)
router.put('/:id/password', async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
    }
    if (req.user?.id !== req.params.id && req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashed },
    });
    res.json({ message: 'Contraseña actualizada' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint para listar clínicas (SUPER_ADMIN)
router.get('/clinics', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const clinics = await prisma.clinic.findMany({
      include: { _count: { select: { users: true, patients: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(clinics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
