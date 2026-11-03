import express from 'express';
import {
  createChallenge,
  publishChallenge,
  updateChallenge,
  deleteChallenge,
  listChallenges,
  getChallengeById,
  registerForChallenge,
  syncChallengeAPI,
  getLeaderboardAPI,
  getAnalyticsAPI,
  resetChallenge,
} from '../controllers/challengeController';
import { protect, authorize } from '../middleware/authMiddleware';
import { globalLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Apply global rate limiter to all challenge routes
router.use(globalLimiter);

// Publicly readable endpoints (filtered by role internally)
router.get('/', protect, listChallenges);
router.get('/:id', protect, getChallengeById);

// Student registration endpoint
router.post('/:id/register', protect, authorize('Student'), registerForChallenge);

// Faculty / Admin management endpoints
router.post('/', protect, authorize('Faculty', 'Admin'), createChallenge);
router.patch('/:id/publish', protect, authorize('Faculty', 'Admin'), publishChallenge);
router.patch('/:id', protect, authorize('Faculty', 'Admin'), updateChallenge);
router.delete('/:id', protect, authorize('Faculty', 'Admin'), deleteChallenge);
router.post('/:id/sync', protect, authorize('Faculty', 'Admin'), syncChallengeAPI);
router.post('/:id/reset', protect, authorize('Faculty', 'Admin'), resetChallenge);
router.get('/:id/analytics', protect, authorize('Faculty', 'Admin'), getAnalyticsAPI);

// Leaderboard can be viewed by anyone authenticated (further protection in the controller if needed, but per specs any authenticated user)
router.get('/:id/leaderboard', protect, getLeaderboardAPI);

export default router;
