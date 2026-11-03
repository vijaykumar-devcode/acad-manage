import express from 'express';
import {
  saveMarks,
  getClassMarks,
  togglePublishResult,
  getStudentPublishedResults,
  getMarksByClass,
  saveBulkMarks,
  importMarks,
} from '../controllers/markController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, authorize('Faculty', 'Admin'), getMarksByClass);
router.post('/bulk', protect, authorize('Faculty', 'Admin'), saveBulkMarks);
router.post('/import', protect, authorize('Faculty', 'Admin'), importMarks);
router.post('/save', protect, authorize('Faculty', 'Admin'), saveMarks);
router.get('/class/:classId', protect, authorize('Faculty', 'Admin'), getClassMarks);
router.post('/class/:classId/publish', protect, authorize('Faculty', 'Admin'), togglePublishResult);
router.get('/student/results', protect, authorize('Student'), getStudentPublishedResults);

export default router;
