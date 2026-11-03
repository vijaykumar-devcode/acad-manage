import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import { getMyNotes, createNote, deleteNote } from '../controllers/noteController';

const router = express.Router();

// All note routes are Student-only
router.use(protect);
router.use(authorize('Student'));

router.get('/class/:classId', getMyNotes);
router.post('/class/:classId', createNote);
router.delete('/:id', deleteNote);

export default router;
