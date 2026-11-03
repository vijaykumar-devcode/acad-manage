import express from 'express';
import {
  createQuiz,
  getEnrolledQuizzes,
  getClassQuizzes,
  getQuizById,
  submitQuiz,
  getQuizResult,
  getAttempts,
  getQuizAttempts,
  deleteQuiz,
  rescheduleQuiz,
} from '../controllers/quizController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, authorize('Faculty', 'Admin'), createQuiz);
router.get('/my-feed', protect, getEnrolledQuizzes);
router.get('/class/:classId', protect, getClassQuizzes);
router.get('/:id', protect, authorize('Student'), getQuizById);
router.post('/:id/submit', protect, authorize('Student'), submitQuiz);
router.get('/:id/result', protect, getQuizResult);
router.get('/attempts/all', protect, getAttempts);
router.get('/:id/attempts', protect, authorize('Faculty', 'Admin'), getQuizAttempts);

router.delete('/:id', protect, authorize('Faculty', 'Admin'), deleteQuiz);
router.patch('/:id/reschedule', protect, authorize('Faculty', 'Admin'), rescheduleQuiz);

export default router;
