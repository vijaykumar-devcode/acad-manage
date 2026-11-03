import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import {
  getStudentNotices,
  getClassNotices,
  createNotice,
  updateNotice,
  deleteNotice,
} from '../controllers/noticeController';

const router = express.Router();

router.use(protect);

router.route('/student').get(getStudentNotices);

router.route('/class/:classId').get(getClassNotices);

router.route('/').post(authorize('Faculty'), createNotice);

router
  .route('/:id')
  .put(authorize('Faculty'), updateNotice)
  .delete(authorize('Faculty'), deleteNotice);

export default router;
