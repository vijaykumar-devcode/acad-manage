import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import { getPYQs, createPYQ, deletePYQ } from '../controllers/pyqController';

const router = express.Router();

router.use(protect);

router.route('/').get(getPYQs).post(authorize('Faculty'), createPYQ);

router.route('/:id').delete(authorize('Faculty', 'Admin'), deletePYQ);

export default router;
