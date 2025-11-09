import Alert from '../models/Alert.js';
import Rule from '../models/Rule.js';
import AlertHistory from '../models/AlertHistory.js';
import { logger } from '../utils/logger.js';
import cacheManager from '../utils/cache.js';

/**
 * Rule Engine - Evaluates alerts against configurable rules
 * Implements DSL-like syntax for rule evaluation
 * 
 * Time Complexity:
 * - evaluateAlert: O(r * a) where r is number of rules, a is alerts in window
 * - Overall: O(n * r * a) where n is alerts to evaluate
 * 
 * Space Complexity: O(r + a) for storing rules and alert windows
 * 
 * Trade-offs:
 * - In-memory window calculation vs persistent storage: Performance vs accuracy
 * - Rule priority ordering: Complexity vs flexibility
 */
class RuleEngine {
  constructor() {
    this.rules = new Map();
    this.initialized = false;
  }

  /**
   * Initialize rule engine by loading rules
   * Time Complexity: O(n) where n is number of rules
   */
  async initialize() {
    try {
      // Try to get rules from cache first
      let rules = cacheManager.get('rules:all');
      
      if (!rules) {
        rules = await Rule.find({ enabled: true }).sort({ priority: -1 });
        // Cache rules for 5 minutes
        cacheManager.set('rules:all', rules, 300);
      }

      this.rules.clear();
      rules.forEach(rule => {
        this.rules.set(rule.sourceType, rule);
      });

      this.initialized = true;
      logger.info(`Rule engine initialized with ${this.rules.size} active rules`);
    } catch (error) {
      logger.error('Failed to initialize rule engine:', error);
      throw error;
    }
  }

  /**
   * Reload rules from database
   * Time Complexity: O(n)
   */
  async reloadRules() {
    cacheManager.delete('rules:all');
    await this.initialize();
  }

  /**
   * Get rule for source type
   * Time Complexity: O(1)
   */
  getRule(sourceType) {
    return this.rules.get(sourceType);
  }

  /**
   * Evaluate single alert against rules
   * Time Complexity: O(a) where a is alerts in time window
   */
  async evaluateAlert(alert) {
    if (!this.initialized) {
      await this.initialize();
    }

    const rule = this.getRule(alert.sourceType);
    if (!rule || !rule.enabled) {
      logger.debug(`No active rule found for ${alert.sourceType}`);
      return { shouldEscalate: false, shouldAutoClose: false };
    }

    const { conditions } = rule;
    let shouldEscalate = false;
    let shouldAutoClose = false;
    let reason = '';

    // Check escalation conditions
    if (conditions.escalate_if_count && conditions.window_mins) {
      const windowStart = new Date(Date.now() - conditions.window_mins * 60 * 1000);
      
      // Count similar alerts in time window for same driver
      const alertCount = await Alert.countDocuments({
        sourceType: alert.sourceType,
        'metadata.driverId': alert.metadata.driverId,
        timestamp: { $gte: windowStart },
        status: { $in: ['OPEN', 'ESCALATED'] }
      });

      if (alertCount >= conditions.escalate_if_count) {
        shouldEscalate = true;
        reason = `${alertCount} ${alert.sourceType} alerts detected within ${conditions.window_mins} minutes`;
        logger.info(`Alert ${alert.alertId} meets escalation criteria: ${reason}`);
      }
    }

    // Check auto-close conditions
    if (conditions.auto_close_if && alert.metadata) {
      const closeConditionMet = this.evaluateCloseCondition(
        conditions.auto_close_if,
        alert.metadata
      );

      if (closeConditionMet) {
        shouldAutoClose = true;
        reason = `Condition met: ${conditions.auto_close_if}`;
        logger.info(`Alert ${alert.alertId} meets auto-close criteria: ${reason}`);
      }
    }

    // Check time-based auto-close
    if (conditions.auto_close_after_mins) {
      const alertAge = (Date.now() - alert.timestamp) / (1000 * 60);
      if (alertAge >= conditions.auto_close_after_mins) {
        shouldAutoClose = true;
        reason = `Alert aged beyond ${conditions.auto_close_after_mins} minutes`;
      }
    }

    return { shouldEscalate, shouldAutoClose, reason, rule };
  }

  /**
   * Evaluate close condition against metadata
   * Time Complexity: O(1)
   */
  evaluateCloseCondition(condition, metadata) {
    // Support various condition types
    if (condition === 'document_valid') {
      return metadata.documentValid === true || 
             (metadata.expiryDate && new Date(metadata.expiryDate) > new Date());
    }

    if (condition === 'speed_normalized') {
      return metadata.speed <= metadata.speedLimit;
    }

    if (condition === 'feedback_improved') {
      return metadata.feedbackRating >= 3;
    }

    // Check if condition exists as boolean in metadata
    return metadata[condition] === true;
  }

  /**
   * Process alert through rule engine
   * Time Complexity: O(a) where a is alerts in window
   */
  async processAlert(alert) {
    try {
      const evaluation = await this.evaluateAlert(alert);
      let modified = false;

      if (evaluation.shouldEscalate && alert.status === 'OPEN') {
        const oldStatus = alert.status;
        alert.escalate(evaluation.reason);
        await alert.save();
        
        // Log history
        await AlertHistory.logTransition(
          alert.alertId,
          alert,
          oldStatus,
          'ESCALATED',
          evaluation.reason,
          'RULE_ENGINE',
          null,
          { rule: evaluation.rule?.ruleId }
        );

        modified = true;
        logger.info(`Alert ${alert.alertId} escalated by rule engine`);
      }

      if (evaluation.shouldAutoClose && 
          (alert.status === 'OPEN' || alert.status === 'ESCALATED')) {
        const oldStatus = alert.status;
        alert.autoClose(evaluation.reason);
        await alert.save();
        
        // Log history
        await AlertHistory.logTransition(
          alert.alertId,
          alert,
          oldStatus,
          'AUTO_CLOSED',
          evaluation.reason,
          'RULE_ENGINE',
          null,
          { rule: evaluation.rule?.ruleId }
        );

        modified = true;
        logger.info(`Alert ${alert.alertId} auto-closed by rule engine`);
      }

      return { success: true, modified, evaluation };
    } catch (error) {
      logger.error(`Error processing alert ${alert.alertId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch process multiple alerts
   * Time Complexity: O(n * a) where n is alerts to process, a is alerts in window
   */
  async processBatch(alerts) {
    const results = {
      processed: 0,
      escalated: 0,
      autoClosed: 0,
      errors: 0
    };

    for (const alert of alerts) {
      try {
        const result = await this.processAlert(alert);
        if (result.success) {
          results.processed++;
          if (result.modified) {
            if (alert.status === 'ESCALATED') results.escalated++;
            if (alert.status === 'AUTO_CLOSED') results.autoClosed++;
          }
        } else {
          results.errors++;
        }
      } catch (error) {
        logger.error(`Error in batch processing:`, error);
        results.errors++;
      }
    }

    return results;
  }
}

// Export singleton instance
const ruleEngine = new RuleEngine();
export default ruleEngine;
