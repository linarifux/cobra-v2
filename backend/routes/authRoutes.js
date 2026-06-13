import express from 'express';
import { login, getMe } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', login);

// Protected routes
router.use(protect);
router.get('/me', getMe);

export default router;