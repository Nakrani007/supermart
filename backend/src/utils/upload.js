// upload.js — Multer config for product image uploads.
// In production (CLOUDINARY_CLOUD_NAME set) → uploads go to Cloudinary.
// In development (no Cloudinary config)      → uploads saved to local /uploads dir.

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync } from 'fs';
import { Readable } from 'stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Cloudinary (lazy init only when env vars are present) ─────────────────────
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let cloudinary;
if (useCloudinary) {
  // Dynamic import so the package is optional in pure-local dev
  const { v2 } = await import('cloudinary');
  cloudinary = v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ── Multer — always uses memory storage; saveFile() decides the destination ───
const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(Object.assign(new Error('Only image files allowed (jpg, png, webp, gif)'), { statusCode: 400 }));
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ── saveFile — uploads buffer to Cloudinary OR writes to local disk ───────────
/**
 * @param {import('multer').File} file  - req.file from multer memoryStorage
 * @param {string} baseUrl              - e.g. "https://api.yourdomain.com" (used for local URLs only)
 * @returns {Promise<string>}           - Public URL of the saved image
 */
export async function saveFile(file, baseUrl = '') {
  if (useCloudinary) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:        'supermart/products',
          resource_type: 'image',
          transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto:good' }],
        },
        (error, result) => {
          if (error) reject(Object.assign(new Error('Image upload failed'), { statusCode: 500 }));
          else resolve(result.secure_url);
        }
      );
      Readable.from(file.buffer).pipe(stream);
    });
  }

  // Local disk fallback (development)
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);
  return `${baseUrl}/uploads/${filename}`;
}
