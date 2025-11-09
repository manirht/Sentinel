import express from 'express';
import {
  getOverview,
  getTopOffenders,
  getRecentEvents,
  getAutoClosedAlerts,
  getTrends,
  getAlertsBySource
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * Dashboard Routes
 */

// @route   GET /api/dashboard/overview
router.get('/overview', protect, getOverview);

// @route   GET /api/dashboard/top-offenders
router.get('/top-offenders', protect, getTopOffenders);

// @route   GET /api/dashboard/recent-events
router.get('/recent-events', protect, getRecentEvents);

// @route   GET /api/dashboard/auto-closed
router.get('/auto-closed', protect, getAutoClosedAlerts);

// @route   GET /api/dashboard/trends
router.get('/trends', protect, getTrends);

// @route   GET /api/dashboard/by-source
router.get('/by-source', protect, getAlertsBySource);

export default router;
