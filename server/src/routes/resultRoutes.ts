import express from 'express';
import {
  getResultsForClass,
  getEnrolledResults,
  getPublishedResults,
  publishResult,
  unpublishResult,
  updateGrade,
} from '../controllers/resultController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/class/:classId', getResultsForClass);
router.get('/my-feed', getEnrolledResults);
router.get('/published', authorize('Admin'), getPublishedResults); // Admin-only: all published results
router.put('/grade', authorize('Faculty', 'Admin'), updateGrade);
router.post('/published', authorize('Faculty', 'Admin'), publishResult);
router.delete('/published/:id', authorize('Faculty', 'Admin'), unpublishResult);

export default router;
