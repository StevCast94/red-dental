import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log('Invalid password');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.active) {
      console.log('Inactive account');
      return res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
    }

    const token = generateToken(
      { id: user.id, name: user.name, email: user.email, role: user.role }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión: ' + error.message });
  }
};
