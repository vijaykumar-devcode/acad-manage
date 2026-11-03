import express from 'express';
import {
  createAssignment,
  getEnrolledAssignments,
  getClassAssignments,
  submitAssignment,
  evaluateSubmission,
  updateAssignment,
  deleteAssignment,
  getEvaluations,
  evaluateOfflineSubmission,
  bulkEvaluateSubmissions,
} from '../controllers/assignmentController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, authorize('Faculty', 'Admin'), createAssignment);
router.get('/my-feed', protect, getEnrolledAssignments);
router.get('/class/:classId', protect, getClassAssignments);
router.get('/evaluations', protect, authorize('Faculty', 'Admin'), getEvaluations);
router.post('/submit', protect, authorize('Student'), submitAssignment);
router.post(
  '/:id/offline-submit',
  protect,
  authorize('Faculty', 'Admin'),
  evaluateOfflineSubmission
);
router.post('/bulk-evaluate', protect, authorize('Faculty', 'Admin'), bulkEvaluateSubmissions);
router.put('/:id/evaluate', protect, authorize('Faculty', 'Admin'), evaluateSubmission);
router.put('/:id', protect, authorize('Faculty', 'Admin'), updateAssignment);
router.delete('/:id', protect, authorize('Faculty', 'Admin'), deleteAssignment);

export default router;
