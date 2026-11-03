import express from 'express';
import { getGradeScale, updateGradeScale } from '../controllers/gradeScaleController';
import { protect } from '../middleware/authMiddleware';
import { adminAuth } from '../middleware/adminAuth';

const router = express.Router();

router.get('/', protect, getGradeScale);
router.put('/', protect, adminAuth, updateGradeScale);

export default router;
