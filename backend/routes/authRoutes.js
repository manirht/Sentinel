import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getMe,
  updateProfile
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';

const router = express.Router();

/**
 * Authentication Routes
 */

// @route   POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    validate
  ],
  register
);

// @route   POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  login
);

// @route   GET /api/auth/me
router.get('/me', protect, getMe);

// @route   PUT /api/auth/profile
router.put(
  '/profile',
  protect,
  [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
    validate
  ],
  updateProfile
);

export default router;
