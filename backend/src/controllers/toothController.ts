import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { clinicFilter } from '../utils/clinicFilter';

const prisma = new PrismaClient();

export const getToothRecords = async (req: AuthRequest, res: Response) => {
  try {
    const cf: any = clinicFilter(req.user);
    const records = await prisma.toothRecord.findMany({
      where: { patientId: req.params.patientId, patient: cf },
      orderBy: [{ number: 'asc' }, { face: 'asc' }],
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener registros dentales' });
  }
};

export const upsertSingleFace = async (req: AuthRequest, res: Response) => {
  try {
    const { number, face, status, notes } = req.body;
    const record = await prisma.toothRecord.upsert({
      where: {
        patientId_number_face: {
          patientId: req.params.patientId,
          number,
          face: face || 'vestibular',
        },
      },
      update: { status, notes: notes || null },
      create: {
        patientId: req.params.patientId,
        number,
        face: face || 'vestibular',
        status: status || 'HEALTHY',
        notes: notes || null,
      },
    });
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar cara del diente' });
  }
};

export const updateAllTeeth = async (req: AuthRequest, res: Response) => {
  try {
    const { teeth } = req.body; // Array de { number, face, status, notes? }
    const results = await Promise.all(
      teeth.map((t: { number: number; face?: string; status: string; notes?: string }) =>
        prisma.toothRecord.upsert({
          where: {
            patientId_number_face: {
              patientId: req.params.patientId,
              number: t.number,
              face: t.face || 'vestibular',
            },
          },
          update: { status: t.status, notes: t.notes || null },
          create: {
            patientId: req.params.patientId,
            number: t.number,
            face: t.face || 'vestibular',
            status: t.status || 'HEALTHY',
            notes: t.notes || null,
          },
        })
      )
    );
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar odontograma' });
  }
};
