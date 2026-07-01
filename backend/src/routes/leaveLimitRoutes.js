import express from 'express';
import {
  getEmployeeLeaveLimits,
  upsertEmployeeLeaveLimit
} from '../controllers/leaveLimitController.js';
import { protect, checkPermission } from '../middlewares/auth.js';

const router = express.Router();

// Fetch summary dashboard (any authenticated user can read if they have permissions)
router.get('/', protect, getEmployeeLeaveLimits);

// Update/upsert custom employee limit override (restricted by leave_allowances permission)
router.post('/', protect, checkPermission('leave_allowances'), upsertEmployeeLeaveLimit);

export default router;
