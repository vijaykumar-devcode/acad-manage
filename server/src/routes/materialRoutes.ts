import express from 'express';
import {
  createMaterial,
  getEnrolledMaterials,
  getClassMaterials,
  getMaterialById,
  deleteMaterial,
} from '../controllers/materialController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, authorize('Faculty', 'Admin'), createMaterial);
router.get('/my-feed', protect, getEnrolledMaterials);
router.get('/class/:classId', protect, getClassMaterials);
router.get('/:id', protect, getMaterialById);
router.delete('/:id', protect, authorize('Faculty', 'Admin'), deleteMaterial);

export default router;
