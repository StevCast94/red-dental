import { Router } from 'express';
import { getEvolutions, createEvolution, updateEvolution } from '../controllers/evolutionController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();
router.get('/', authenticate, getEvolutions);
router.post('/', authenticate, createEvolution);
router.put('/:id', authenticate, updateEvolution);

export default router;
