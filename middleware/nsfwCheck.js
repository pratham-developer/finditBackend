// middleware/nsfwCheck.js
import { checkNsfw, isNsfwReady } from '../nsfwDetection/nsfwProcess.js';
import fs from 'fs';
import path from 'path';

export async function nsfwCheckMiddleware(req, res, next) {
  if (!req.file) return next();

  // Strictly allow only image files (by extension and mimetype)
  const allowedExt = ['.jpg', '.jpeg', '.png']; // GIF removed
  const ext = path.extname(req.file.originalname).toLowerCase();
  const mime = req.file.mimetype || '';

  // Log extension and mimetype for debugging
  console.log('File extension:', ext, 'Mimetype:', mime);

  const isImage = allowedExt.includes(ext) && mime.startsWith('image/');

  if (!isImage) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ message: 'Only image files are allowed!' });
  }

  if (!isNsfwReady()) {
    fs.unlink(req.file.path, () => {});
    return res.status(503).json({ message: 'NSFW service not ready' });
  }

  try {
    const safe = await checkNsfw(req.file.path);
    if (!safe) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: 'Image is not safe for work' });
    }
    next();
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    // Log the error for debugging
    console.error('NSFW check error:', err);
    // Always return a 400 for image processing errors
    return res.status(400).json({ message: 'Image processing failed. Please upload a standard image file.' });
  }
}