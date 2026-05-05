import { Router, Response } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { AuthRequest } from '../middlewares/authMiddleware';
import { sendTomorrowReminders } from '../services/reminderService';

const router = Router();

router.use(authenticate);

// POST /api/reminders/send-tomorrow
router.post('/send-tomorrow', async (req: AuthRequest, res: Response) => {
  try {
    const sent = await sendTomorrowReminders();
    res.json({ sent, message: `${sent} recordatorios generados` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
