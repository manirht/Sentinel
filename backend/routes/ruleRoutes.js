import express from 'express';
import { body } from 'express-validator';
import {
  getRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  toggleRule
} from '../controllers/ruleController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';

const router = express.Router();

/**
 * Rule Routes
 */

// @route   GET /api/rules
router.get('/', protect, getRules);

// @route   GET /api/rules/:id
router.get('/:id', protect, getRule);

// @route   POST /api/rules
router.post(
  '/',
  protect,
  authorize('admin'),
  [
    body('ruleId').trim().notEmpty().withMessage('Rule ID is required'),
    body('sourceType')
      .isIn(['overspeed', 'compliance', 'feedback_negative', 'maintenance', 'other'])
      .withMessage('Invalid source type'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('conditions').isObject().withMessage('Conditions must be an object'),
    validate
  ],
  createRule
);

// @route   PUT /api/rules/:id
router.put(
  '/:id',
  protect,
  authorize('admin'),
  [
    body('conditions').optional().isObject(),
    body('actions').optional().isObject(),
    validate
  ],
  updateRule
);

// @route   DELETE /api/rules/:id
router.delete('/:id', protect, authorize('admin'), deleteRule);

// @route   PATCH /api/rules/:id/toggle
router.patch('/:id/toggle', protect, authorize('admin'), toggleRule);

export default router;
