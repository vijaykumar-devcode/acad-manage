import express from 'express';
import {
  linkAccount,
  verifyAccount,
  getMyAccounts,
  unlinkAccount,
} from '../controllers/codingAccountController';
import { protect, authorize } from '../middleware/authMiddleware';
import { globalLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.use(globalLimiter);

// All account linking endpoints are restricted to Students
router.use(protect, authorize('Student'));

router.post('/', linkAccount);
router.get('/', getMyAccounts);
router.post('/:id/verify', verifyAccount);
router.delete('/:id', unlinkAccount);

export default router;
