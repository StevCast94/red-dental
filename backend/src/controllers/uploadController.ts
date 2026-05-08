import { Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { AuthRequest } from '../middlewares/authMiddleware';

// Inicializar Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BUCKET = 'evolutions';

// Multer: guardar en memoria (no en disco)
const storage = multer.memoryStorage();

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato no permitido: ${file.mimetype}. Usa JPG, PNG, GIF o WebP.`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const uploadPhoto = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se seleccionó ningún archivo' });
    }

    const originalBuffer = req.file.buffer;
    const ext = req.file.mimetype === 'image/jpeg' ? 'jpg'
              : req.file.mimetype === 'image/png' ? 'png'
              : req.file.mimetype === 'image/webp' ? 'webp'
              : 'jpg'; // fallback

    let processedBuffer: Buffer;
    const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `evo-${uniqueId}.${ext}`;

    if (req.file.mimetype === 'image/gif') {
      // GIF no se procesa con sharp
      processedBuffer = originalBuffer;
    } else {
      try {
        let pipeline = sharp(originalBuffer);
        const metadata = await pipeline.metadata();

        // Redimensionar si el ancho supera 1200px
        if (metadata.width && metadata.width > 1200) {
          pipeline = pipeline.resize(1200);
        }

        // Convertir a JPEG con calidad 80 para optimizar
        processedBuffer = await pipeline.jpeg({ quality: 80 }).toBuffer();
        // Actualizar extensión porque sharp convierte a JPEG
        filename.replace(`.${ext}`, '.jpg');
      } catch (sharpError: any) {
        console.warn('Sharp processing failed, uploading original:', sharpError.message);
        processedBuffer = originalBuffer;
      }
    }

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, processedBuffer, {
        contentType: req.file.mimetype === 'image/gif' ? 'image/gif' : 'image/jpeg',
        cacheControl: '31536000', // 1 año
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: 'Error al subir archivo al almacenamiento' });
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filename);

    res.json({ url: urlData.publicUrl, filename });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Error al subir archivo' });
  }
};
