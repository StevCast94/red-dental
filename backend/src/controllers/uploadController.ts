import { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { AuthRequest } from '../middlewares/authMiddleware';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const PHOTOS_DIR = path.join(UPLOADS_DIR, 'photos');

// Asegurar que existe el directorio
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PHOTOS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `evo-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato no permitido: ${ext}. Usa JPG, PNG, GIF o WebP.`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (para fotos de cámara)
});

export const uploadPhoto = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se seleccionó ningún archivo' });
    }

    const absolutePath = req.file.path;
    const ext = path.extname(absolutePath).toLowerCase();

    // Procesar con sharp excepto GIF (formato no soportado por sharp)
    if (ext !== '.gif') {
      try {
        let pipeline = sharp(absolutePath);
        const metadata = await pipeline.metadata();

        // Redimensionar si el ancho supera 1200px (manteniendo aspect ratio)
        if (metadata.width && metadata.width > 1200) {
          pipeline = pipeline.resize(1200);
        }

        if (ext === '.png') {
          await pipeline.png({ quality: 80 }).toFile(absolutePath + '.tmp');
        } else if (ext === '.webp') {
          await pipeline.webp({ quality: 80 }).toFile(absolutePath + '.tmp');
        } else {
          // jpg, jpeg u otros — convertir a JPEG con calidad 80
          await pipeline.jpeg({ quality: 80 }).toFile(absolutePath + '.tmp');
        }

        // Sobrescribir original
        fs.copyFileSync(absolutePath + '.tmp', absolutePath);
        fs.unlinkSync(absolutePath + '.tmp');
      } catch (sharpError: any) {
        console.warn('Sharp processing failed, saving original:', sharpError.message);
        // Si sharp falla, guardamos el archivo original sin procesar
      }
    }

    const filePath = `/uploads/photos/${req.file.filename}`;
    res.json({ url: filePath, filename: req.file.filename });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al subir archivo' });
  }
};
