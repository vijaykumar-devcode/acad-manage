import express from 'express';
import {
  createClass,
  getClasses,
  getClassById,
  joinClass,
  getClassRoster,
  updateClassMaxMarks,
  updateClass,
  deleteClass,
  deleteAllClasses,
} from '../controllers/classController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, authorize('Faculty', 'Admin'), createClass);
router.get('/', protect, getClasses);
router.get('/:id', protect, getClassById);
router.post('/join', protect, authorize('Student'), joinClass);
router.get('/:id/roster', protect, authorize('Faculty', 'Admin'), getClassRoster);
router.put('/:id/max-marks', protect, authorize('Faculty', 'Admin'), updateClassMaxMarks);
router.patch('/:id', protect, authorize('Faculty', 'Admin'), updateClass);
router.delete('/:id', protect, authorize('Faculty', 'Admin'), deleteClass);
router.delete('/', protect, authorize('Faculty', 'Admin'), deleteAllClasses);

export default router;
