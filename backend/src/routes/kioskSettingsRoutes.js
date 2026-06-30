import express from 'express';
import { getKioskSettings, updateKioskSettings } from '../controllers/kioskSettingsController.js';
import { protect, checkRole } from '../middlewares/auth.js';

const router = express.Router();

// Fetch settings (any authenticated user can read, e.g. Kiosk page)
router.get('/', protect, getKioskSettings);

// Update settings (Only Admin role can configure)
router.put('/', protect, checkRole(['Admin']), updateKioskSettings);

export default router;
