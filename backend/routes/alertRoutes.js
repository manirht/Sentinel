import express from 'express';
import { body } from 'express-validator';
import {
  createAlert,
  getAlerts,
  getAlert,
  resolveAlert,
  updateAlert,
  deleteAlert
} from '../controllers/alertController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';

const router = express.Router();

/**
 * Alert Routes
 */

// @route   POST /api/alerts
router.post(
  '/',
  protect,
  [
    body('sourceType')
      .isIn(['overspeed', 'compliance', 'feedback_negative', 'maintenance', 'other'])
      .withMessage('Invalid source type'),
    body('severity')
      .optional()
      .isIn(['INFO', 'WARNING', 'CRITICAL'])
      .withMessage('Invalid severity'),
    body('metadata').isObject().withMessage('Metadata must be an object'),
    validate
  ],
  createAlert
);

// @route   GET /api/alerts
router.get('/', protect, getAlerts);

// @route   GET /api/alerts/:id
router.get('/:id', protect, getAlert);

// @route   PUT /api/alerts/:id/resolve
router.put(
  '/:id/resolve',
  protect,
  [
    body('notes').optional().isString(),
    validate
  ],
  resolveAlert
);

// @route   PUT /api/alerts/:id
router.put(
  '/:id',
  protect,
  [
    body('metadata').optional().isObject(),
    body('notes').optional().isString(),
    validate
  ],
  updateAlert
);

// @route   DELETE /api/alerts/:id
router.delete('/:id', protect, authorize('admin'), deleteAlert);

export default router;
