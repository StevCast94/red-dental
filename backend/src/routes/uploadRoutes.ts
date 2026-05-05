import { Router } from 'express';
import { upload, uploadPhoto } from '../controllers/uploadController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', authenticate, upload.single('photo'), uploadPhoto);

export default router;
