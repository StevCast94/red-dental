import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

export const login = async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || null;

  const logLogin = async (username: string, clinicId: string | null, success: boolean) => {
    try {
      await prisma.loginLog.create({
        data: { username, clinicId, success, ip },
      });
    } catch { /* silent */ }
  };

  try {
    const { username, password } = req.body;
    console.log('Login attempt:', { username });

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      console.log('User not found');
      await logLogin(username, null, false);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log('Invalid password');
      await logLogin(username, user.clinicId, false);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.active) {
      console.log('Inactive account');
      await logLogin(username, user.clinicId, false);
      return res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
    }

    await logLogin(username, user.clinicId, true);

    const token = generateToken(
      { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, clinicId: user.clinicId }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        clinicId: user.clinicId,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    await logLogin(req.body?.username || 'unknown', null, false);
    res.status(500).json({ error: 'Error al iniciar sesión: ' + error.message });
  }
};
