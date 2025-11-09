import Rule from '../models/Rule.js';
import { logger } from '../utils/logger.js';
import cacheManager from '../utils/cache.js';
import ruleEngine from '../services/ruleEngine.js';

/**
 * Rule Controller
 * Manages escalation and auto-close rules
 */

/**
 * @desc    Get all rules
 * @route   GET /api/rules
 * @access  Private
 * 
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 */
export const getRules = async (req, res, next) => {
  try {
    const { sourceType, enabled } = req.query;
    
    const filter = {};
    if (sourceType) filter.sourceType = sourceType;
    if (enabled !== undefined) filter.enabled = enabled === 'true';

    const rules = await Rule.find(filter).sort({ priority: -1 });

    res.status(200).json({
      success: true,
      data: { rules }
    });
  } catch (error) {
    logger.error('Get rules error:', error);
    next(error);
  }
};

/**
 * @desc    Get single rule
 * @route   GET /api/rules/:id
 * @access  Private
 * 
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export const getRule = async (req, res, next) => {
  try {
    const rule = await Rule.findOne({ ruleId: req.params.id });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { rule }
    });
  } catch (error) {
    logger.error('Get rule error:', error);
    next(error);
  }
};

/**
 * @desc    Create new rule
 * @route   POST /api/rules
 * @access  Private (Admin only)
 * 
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export const createRule = async (req, res, next) => {
  try {
    const { ruleId, sourceType, name, description, enabled, priority, conditions, actions } = req.body;

    const rule = await Rule.create({
      ruleId,
      sourceType,
      name,
      description,
      enabled: enabled !== undefined ? enabled : true,
      priority: priority || 0,
      conditions,
      actions,
      createdBy: req.user._id
    });

    // Reload rule engine
    await ruleEngine.reloadRules();

    // Invalidate cache
    cacheManager.delete('rules:all');

    logger.info(`Rule created: ${ruleId} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Rule created successfully',
      data: { rule }
    });
  } catch (error) {
    logger.error('Create rule error:', error);
    next(error);
  }
};

/**
 * @desc    Update rule
 * @route   PUT /api/rules/:id
 * @access  Private (Admin only)
 * 
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export const updateRule = async (req, res, next) => {
  try {
    const { name, description, enabled, priority, conditions, actions } = req.body;

    const rule = await Rule.findOne({ ruleId: req.params.id });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }

    if (name) rule.name = name;
    if (description !== undefined) rule.description = description;
    if (enabled !== undefined) rule.enabled = enabled;
    if (priority !== undefined) rule.priority = priority;
    if (conditions) rule.conditions = { ...rule.conditions, ...conditions };
    if (actions) rule.actions = { ...rule.actions, ...actions };

    rule.lastModified = new Date();
    await rule.save();

    // Reload rule engine
    await ruleEngine.reloadRules();

    // Invalidate cache
    cacheManager.delete('rules:all');

    logger.info(`Rule updated: ${rule.ruleId} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Rule updated successfully',
      data: { rule }
    });
  } catch (error) {
    logger.error('Update rule error:', error);
    next(error);
  }
};

/**
 * @desc    Delete rule
 * @route   DELETE /api/rules/:id
 * @access  Private (Admin only)
 * 
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export const deleteRule = async (req, res, next) => {
  try {
    const rule = await Rule.findOne({ ruleId: req.params.id });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }

    await rule.deleteOne();

    // Reload rule engine
    await ruleEngine.reloadRules();

    // Invalidate cache
    cacheManager.delete('rules:all');

    logger.info(`Rule deleted: ${req.params.id} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Rule deleted successfully'
    });
  } catch (error) {
    logger.error('Delete rule error:', error);
    next(error);
  }
};

/**
 * @desc    Toggle rule enabled/disabled
 * @route   PATCH /api/rules/:id/toggle
 * @access  Private (Admin only)
 * 
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export const toggleRule = async (req, res, next) => {
  try {
    const rule = await Rule.findOne({ ruleId: req.params.id });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }

    rule.enabled = !rule.enabled;
    rule.lastModified = new Date();
    await rule.save();

    // Reload rule engine
    await ruleEngine.reloadRules();

    // Invalidate cache
    cacheManager.delete('rules:all');

    logger.info(`Rule toggled: ${rule.ruleId} to ${rule.enabled} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `Rule ${rule.enabled ? 'enabled' : 'disabled'} successfully`,
      data: { rule }
    });
  } catch (error) {
    logger.error('Toggle rule error:', error);
    next(error);
  }
};
