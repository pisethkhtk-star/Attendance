import express from 'express';
import { getAllRules, createRule, deleteRule } from '../controllers/leaveApprovalController.js';
import { protect, checkRole } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', protect, getAllRules);
router.post('/', protect, checkRole(['Admin', 'HR']), createRule);
router.delete('/:id', protect, checkRole(['Admin', 'HR']), deleteRule);

export default router;
