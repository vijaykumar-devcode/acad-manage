import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { adminAuth } from '../middleware/adminAuth';
import {
  getPlatformStats,
  getAllUsers,
  createUser,
  deleteUser,
  getPendingFaculty,
  approveFaculty,
} from '../controllers/adminController';

const router = express.Router();

// All admin routes must be protected and restricted to admins
router.use(protect);
router.use(adminAuth);

router.route('/stats').get(getPlatformStats);
router.route('/users').get(getAllUsers).post(createUser);
router.route('/users/:id').delete(deleteUser);
router.route('/faculty/pending').get(getPendingFaculty);
router.route('/users/:id/approve').patch(approveFaculty);

export default router;
