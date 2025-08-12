import { Router } from 'express';
import authRoutes from './authRoutes';
import projectRoutes from './projectRoutes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);

export default router;