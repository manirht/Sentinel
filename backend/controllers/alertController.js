import Alert from '../models/Alert.js';
import AlertHistory from '../models/AlertHistory.js';
import { logger } from '../utils/logger.js';
import cacheManager from '../utils/cache.js';
import { v4 as uuidv4 } from 'uuid';
import ruleEngine from '../services/ruleEngine.js';

/**
 * Alert Controller
 * Handles all alert-related operations
 */

/**
 * @desc    Create new alert
 * @route   POST /api/alerts
 * @access  Private
 * 
 * Time Complexity: O(log n) for insert with indexes
 * Space Complexity: O(1)
 */
export const createAlert = async (req, res, next) => {
  try {
    const { sourceType, severity, metadata } = req.body;

    // Generate unique alert ID
    const alertId = `ALT-${Date.now()}-${uuidv4().split('-')[0]}`;

    // Set expiry date (30 days from now by default)
    const expiryDays = parseInt(process.env.ALERT_EXPIRY_DAYS) || 30;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    // Create alert
    const alert = await Alert.create({
      alertId,
      sourceType,
      severity: severity || 'INFO',
      status: 'OPEN',
      metadata: {
        ...metadata,
        eventCount: 1
      },
      expiresAt
    });

    // Log history
    await AlertHistory.logTransition(
      alertId,
      alert,
      null,
      'OPEN',
      'Alert created',
      'SYSTEM',
      req.user._id
    );

    // Process through rule engine immediately
    await ruleEngine.processAlert(alert);

    // Invalidate cache
    cacheManager.invalidatePattern('alerts:');
    cacheManager.invalidatePattern('dashboard:');

    logger.info(`Alert created: ${alertId}`);

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: { alert }
    });
  } catch (error) {
    logger.error('Create alert error:', error);
    next(error);
  }
};

/**
 * @desc    Get all alerts with filters
 * @route   GET /api/alerts
 * @access  Private
 * 
 * Time Complexity: O(log n + k) where k is result count
 * Space Complexity: O(k)
 */
export const getAlerts = async (req, res, next) => {
  try {
    const {
      status,
      severity,
      sourceType,
      driverId,
      page = 1,
      limit = 20,
      sortBy = 'timestamp',
      order = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (sourceType) filter.sourceType = sourceType;
    if (driverId) filter['metadata.driverId'] = driverId;

    // Build cache key
    const cacheKey = `alerts:list:${JSON.stringify(filter)}:${page}:${limit}:${sortBy}:${order}`;
    
    // Try cache first
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'desc' ? -1 : 1;

    // Query with pagination
    const [alerts, total] = await Promise.all([
      Alert.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Alert.countDocuments(filter)
    ]);

    const response = {
      success: true,
      data: {
        alerts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    };

    // Cache for 1 minute
    cacheManager.set(cacheKey, response, 60);

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get alerts error:', error);
    next(error);
  }
};

/**
 * @desc    Get single alert by ID
 * @route   GET /api/alerts/:id
 * @access  Private
 * 
 * Time Complexity: O(log n)
 * Space Complexity: O(1)
 */
export const getAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findOne({ alertId: req.params.id });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Get alert history
    const history = await AlertHistory.find({ alertId: req.params.id })
      .sort({ timestamp: -1 })
      .populate('userId', 'name email')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        alert,
        history
      }
    });
  } catch (error) {
    logger.error('Get alert error:', error);
    next(error);
  }
};

/**
 * @desc    Manually resolve alert
 * @route   PUT /api/alerts/:id/resolve
 * @access  Private
 * 
 * Time Complexity: O(log n)
 * Space Complexity: O(1)
 */
export const resolveAlert = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const alert = await Alert.findOne({ alertId: req.params.id });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    if (alert.status === 'RESOLVED' || alert.status === 'AUTO_CLOSED') {
      return res.status(400).json({
        success: false,
        message: 'Alert is already closed'
      });
    }

    const oldStatus = alert.status;
    alert.resolve(req.user._id, notes);
    await alert.save();

    // Log history
    await AlertHistory.logTransition(
      alert.alertId,
      alert,
      oldStatus,
      'RESOLVED',
      notes || 'Manually resolved',
      'USER',
      req.user._id
    );

    // Invalidate cache
    cacheManager.invalidatePattern('alerts:');
    cacheManager.invalidatePattern('dashboard:');

    logger.info(`Alert resolved: ${alert.alertId} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Alert resolved successfully',
      data: { alert }
    });
  } catch (error) {
    logger.error('Resolve alert error:', error);
    next(error);
  }
};

/**
 * @desc    Update alert metadata
 * @route   PUT /api/alerts/:id
 * @access  Private
 * 
 * Time Complexity: O(log n)
 * Space Complexity: O(1)
 */
export const updateAlert = async (req, res, next) => {
  try {
    const { metadata, notes } = req.body;
    const alert = await Alert.findOne({ alertId: req.params.id });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    if (metadata) {
      alert.metadata = { ...alert.metadata.toObject(), ...metadata };
    }
    if (notes) {
      alert.notes = notes;
    }

    await alert.save();

    // Re-evaluate with rule engine
    await ruleEngine.processAlert(alert);

    // Invalidate cache
    cacheManager.invalidatePattern('alerts:');

    logger.info(`Alert updated: ${alert.alertId}`);

    res.status(200).json({
      success: true,
      message: 'Alert updated successfully',
      data: { alert }
    });
  } catch (error) {
    logger.error('Update alert error:', error);
    next(error);
  }
};

/**
 * @desc    Delete alert
 * @route   DELETE /api/alerts/:id
 * @access  Private (Admin only)
 * 
 * Time Complexity: O(log n)
 * Space Complexity: O(1)
 */
export const deleteAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findOne({ alertId: req.params.id });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    await alert.deleteOne();

    // Invalidate cache
    cacheManager.invalidatePattern('alerts:');
    cacheManager.invalidatePattern('dashboard:');

    logger.info(`Alert deleted: ${req.params.id} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    logger.error('Delete alert error:', error);
    next(error);
  }
};
