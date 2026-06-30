import express from 'express';
import rateLimit from 'express-rate-limit';
import { generateQRCode, scanQRCode } from '../controllers/qrController.js';

const router = express.Router();

// Define scan rate limit to prevent spamming/replay attacks
const scanLimiter = rateLimit({
  windowMs: 5 * 1000, // 5 seconds window
  max: 3, // limit each IP to 3 requests per windowMs
  message: { message: 'Too many scans from this device. Please wait a few seconds.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/generate/:staffId', generateQRCode);
router.post('/scan', scanLimiter, scanQRCode);

export default router;
