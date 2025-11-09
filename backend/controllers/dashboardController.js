import Alert from '../models/Alert.js';
import AlertHistory from '../models/AlertHistory.js';
import { logger } from '../utils/logger.js';
import cacheManager from '../utils/cache.js';

/**
 * Dashboard Controller
 * Provides aggregated data and analytics for the dashboard
 */

/**
 * @desc    Get dashboard overview
 * @route   GET /api/dashboard/overview
 * @access  Private
 * 
 * Time Complexity: O(n) for aggregations
 * Space Complexity: O(1)
 */
export const getOverview = async (req, res, next) => {
  try {
    const cacheKey = 'dashboard:overview';
    const cached = cacheManager.get(cacheKey);
    
    if (cached) {
      return res.status(200).json(cached);
    }

    // Get counts by severity and status in parallel
    const [
      severityCounts,
      statusCounts,
      totalAlerts,
      recentEscalations
    ] = await Promise.all([
      // Severity breakdown
      Alert.aggregate([
        {
          $match: { status: { $in: ['OPEN', 'ESCALATED'] } }
        },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Status breakdown
      Alert.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Total alerts
      Alert.countDocuments(),
      
      // Recent escalations (last 24 hours)
      Alert.countDocuments({
        status: 'ESCALATED',
        escalatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    // Format severity data
    const severity = {
      CRITICAL: 0,
      WARNING: 0,
      INFO: 0
    };
    severityCounts.forEach(item => {
      severity[item._id] = item.count;
    });

    // Format status data
    const status = {
      OPEN: 0,
      ESCALATED: 0,
      AUTO_CLOSED: 0,
      RESOLVED: 0
    };
    statusCounts.forEach(item => {
      status[item._id] = item.count;
    });

    const response = {
      success: true,
      data: {
        severity,
        status,
        totalAlerts,
        activeAlerts: status.OPEN + status.ESCALATED,
        recentEscalations
      }
    };

    // Cache for 2 minutes
    cacheManager.set(cacheKey, response, 120);

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get dashboard overview error:', error);
    next(error);
  }
};

/**
 * @desc    Get top offenders (drivers with most alerts)
 * @route   GET /api/dashboard/top-offenders
 * @access  Private
 * 
 * Time Complexity: O(n log n) for sorting
 * Space Complexity: O(k) where k is number of unique drivers
 */
export const getTopOffenders = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    const cacheKey = `dashboard:top-offenders:${limit}`;
    const cached = cacheManager.get(cacheKey);
    
    if (cached) {
      return res.status(200).json(cached);
    }

    // Aggregate alerts by driver
    const topOffenders = await Alert.aggregate([
      {
        $match: {
          status: { $in: ['OPEN', 'ESCALATED'] },
          'metadata.driverId': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$metadata.driverId',
          driverName: { $first: '$metadata.driverName' },
          totalAlerts: { $sum: 1 },
          criticalAlerts: {
            $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] }
          },
          warningAlerts: {
            $sum: { $cond: [{ $eq: ['$severity', 'WARNING'] }, 1, 0] }
          },
          openAlerts: {
            $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] }
          },
          escalatedAlerts: {
            $sum: { $cond: [{ $eq: ['$status', 'ESCALATED'] }, 1, 0] }
          },
          lastAlert: { $max: '$timestamp' }
        }
      },
      {
        $sort: { totalAlerts: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          driverId: '$_id',
          driverName: 1,
          totalAlerts: 1,
          criticalAlerts: 1,
          warningAlerts: 1,
          openAlerts: 1,
          escalatedAlerts: 1,
          lastAlert: 1,
          _id: 0
        }
      }
    ]);

    const response = {
      success: true,
      data: { topOffenders }
    };

    // Cache for 3 minutes
    cacheManager.set(cacheKey, response, 180);

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get top offenders error:', error);
    next(error);
  }
};

/**
 * @desc    Get recent alert events
 * @route   GET /api/dashboard/recent-events
 * @access  Private
 * 
 * Time Complexity: O(log n + k) where k is limit
 * Space Complexity: O(k)
 */
export const getRecentEvents = async (req, res, next) => {
  try {
    const { limit = 10, hours = 24 } = req.query;
    const cacheKey = `dashboard:recent-events:${limit}:${hours}`;
    const cached = cacheManager.get(cacheKey);
    
    if (cached) {
      return res.status(200).json(cached);
    }

    const timeThreshold = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);

    const recentEvents = await AlertHistory.find({
      timestamp: { $gte: timeThreshold }
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'name email')
      .populate('alert', 'sourceType severity metadata')
      .lean();

    const response = {
      success: true,
      data: { recentEvents }
    };

    // Cache for 1 minute
    cacheManager.set(cacheKey, response, 60);

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get recent events error:', error);
    next(error);
  }
};

/**
 * @desc    Get auto-closed alerts
 * @route   GET /api/dashboard/auto-closed
 * @access  Private
 * 
 * Time Complexity: O(log n + k)
 * Space Complexity: O(k)
 */
export const getAutoClosedAlerts = async (req, res, next) => {
  try {
    const { limit = 10, days = 7 } = req.query;
    const cacheKey = `dashboard:auto-closed:${limit}:${days}`;
    const cached = cacheManager.get(cacheKey);
    
    if (cached) {
      return res.status(200).json(cached);
    }

    const timeThreshold = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const autoClosedAlerts = await Alert.find({
      status: 'AUTO_CLOSED',
      autoClosedAt: { $gte: timeThreshold }
    })
      .sort({ autoClosedAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const response = {
      success: true,
      data: { autoClosedAlerts }
    };

    // Cache for 2 minutes
    cacheManager.set(cacheKey, response, 120);

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get auto-closed alerts error:', error);
    next(error);
  }
};

/**
 * @desc    Get alert trends over time
 * @route   GET /api/dashboard/trends
 * @access  Private
 * 
 * Time Complexity: O(n)
 * Space Complexity: O(d) where d is number of days
 */
export const getTrends = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const cacheKey = `dashboard:trends:${days}`;
    const cached = cacheManager.get(cacheKey);
    
    if (cached) {
      return res.status(200).json(cached);
    }

    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    // Aggregate by day
    const trends = await Alert.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
            },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const response = {
      success: true,
      data: { trends }
    };

    // Cache for 5 minutes
    cacheManager.set(cacheKey, response, 300);

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get trends error:', error);
    next(error);
  }
};

/**
 * @desc    Get alerts by source type
 * @route   GET /api/dashboard/by-source
 * @access  Private
 * 
 * Time Complexity: O(n)
 * Space Complexity: O(s) where s is number of source types
 */
export const getAlertsBySource = async (req, res, next) => {
  try {
    const cacheKey = 'dashboard:by-source';
    const cached = cacheManager.get(cacheKey);
    
    if (cached) {
      return res.status(200).json(cached);
    }

    const bySource = await Alert.aggregate([
      {
        $match: {
          status: { $in: ['OPEN', 'ESCALATED'] }
        }
      },
      {
        $group: {
          _id: '$sourceType',
          count: { $sum: 1 },
          critical: {
            $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] }
          },
          warning: {
            $sum: { $cond: [{ $eq: ['$severity', 'WARNING'] }, 1, 0] }
          },
          info: {
            $sum: { $cond: [{ $eq: ['$severity', 'INFO'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const response = {
      success: true,
      data: { bySource }
    };

    // Cache for 3 minutes
    cacheManager.set(cacheKey, response, 180);

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get alerts by source error:', error);
    next(error);
  }
};
