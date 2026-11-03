import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getProfile, updateProfile, uploadAvatar } from '../controllers/userController';

const router = express.Router();

router.use(protect); // All profile routes require authentication

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/profile/avatar', uploadAvatar);

export default router;
