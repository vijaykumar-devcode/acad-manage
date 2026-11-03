import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { adminAuth } from '../middleware/adminAuth';
import {
  createTicket,
  getTickets,
  getMyTickets,
  updateTicketStatus,
  deleteTicket,
} from '../controllers/supportController';

const router = express.Router();

router.post('/', protect, createTicket);
router.get('/my', protect, getMyTickets); // Any authenticated user — own tickets only
router.get('/', protect, adminAuth, getTickets); // Admin only — all tickets
router.put('/:id/status', protect, adminAuth, updateTicketStatus);
router.delete('/:id', protect, adminAuth, deleteTicket);

export default router;
