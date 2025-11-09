import cron from 'node-cron';
import Alert from '../models/Alert.js';
import ruleEngine from './ruleEngine.js';
import { logger } from '../utils/logger.js';
import cacheManager from '../utils/cache.js';

/**
 * Background Jobs Service
 * Implements periodic tasks for alert evaluation and auto-closure
 * 
 * Jobs:
 * 1. Auto-close job - Scans and closes eligible alerts
 * 2. Rule evaluation job - Evaluates alerts against rules
 * 
 * Time Complexity: O(n) where n is number of alerts to process
 * Space Complexity: O(1) - processes in batches
 * 
 * Trade-offs:
 * - Frequency vs Load: More frequent = more responsive but higher load
 * - Batch size vs Memory: Larger batches = more memory but fewer DB calls
 */
class BackgroundJobs {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
    this.stats = {
      autoCloseRuns: 0,
      ruleEvaluationRuns: 0,
      lastAutoCloseRun: null,
      lastRuleEvaluationRun: null
    };
  }

  /**
   * Start all background jobs
   */
  start() {
    if (this.isRunning) {
      logger.warn('Background jobs already running');
      return;
    }

    this.isRunning = true;
    
    // Auto-close job - runs every 5 minutes by default
    const autoCloseSchedule = process.env.AUTO_CLOSE_JOB_INTERVAL || '*/5 * * * *';
    const autoCloseJob = cron.schedule(autoCloseSchedule, async () => {
      await this.runAutoCloseJob();
    });
    this.jobs.push(autoCloseJob);
    logger.info(`Auto-close job scheduled: ${autoCloseSchedule}`);

    // Rule evaluation job - runs every 2 minutes by default
    const ruleEvalSchedule = process.env.RULE_EVALUATION_INTERVAL || '*/2 * * * *';
    const ruleEvalJob = cron.schedule(ruleEvalSchedule, async () => {
      await this.runRuleEvaluationJob();
    });
    this.jobs.push(ruleEvalJob);
    logger.info(`Rule evaluation job scheduled: ${ruleEvalSchedule}`);

    logger.info('Background jobs started successfully');
  }

  /**
   * Stop all background jobs
   */
  stop() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.isRunning = false;
    logger.info('Background jobs stopped');
  }

  /**
   * Auto-close job implementation
   * Scans alerts and auto-closes based on conditions
   * 
   * Time Complexity: O(n) where n is number of open/escalated alerts
   * 
   * Idempotent: Safe to re-run, won't close already closed alerts
   */
  async runAutoCloseJob() {
    const startTime = Date.now();
    logger.info('Starting auto-close job');

    try {
      // Get all open and escalated alerts that haven't expired
      const alerts = await Alert.find({
        status: { $in: ['OPEN', 'ESCALATED'] },
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      }).limit(100); // Process in batches of 100

      if (alerts.length === 0) {
        logger.info('No alerts to process in auto-close job');
        return;
      }

      logger.info(`Processing ${alerts.length} alerts in auto-close job`);

      // Process through rule engine
      const results = await ruleEngine.processBatch(alerts);

      // Update stats
      this.stats.autoCloseRuns++;
      this.stats.lastAutoCloseRun = new Date();

      const duration = Date.now() - startTime;
      logger.info(`Auto-close job completed in ${duration}ms`, results);

      // Invalidate relevant caches
      cacheManager.invalidatePattern('dashboard:');
      cacheManager.invalidatePattern('alerts:');

    } catch (error) {
      logger.error('Error in auto-close job:', error);
    }
  }

  /**
   * Rule evaluation job implementation
   * Evaluates alerts against rules for escalation
   * 
   * Time Complexity: O(n * r) where n is alerts, r is rules
   * 
   * Idempotent: Won't escalate already escalated alerts (unless conditions change)
   */
  async runRuleEvaluationJob() {
    const startTime = Date.now();
    logger.info('Starting rule evaluation job');

    try {
      // Reload rules to ensure latest configuration
      await ruleEngine.reloadRules();

      // Get alerts that need evaluation (only OPEN alerts)
      const alerts = await Alert.find({
        status: 'OPEN',
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      }).sort({ timestamp: 1 }).limit(100);

      if (alerts.length === 0) {
        logger.info('No alerts to evaluate in rule evaluation job');
        return;
      }

      logger.info(`Evaluating ${alerts.length} alerts in rule evaluation job`);

      // Process through rule engine
      const results = await ruleEngine.processBatch(alerts);

      // Update stats
      this.stats.ruleEvaluationRuns++;
      this.stats.lastRuleEvaluationRun = new Date();

      const duration = Date.now() - startTime;
      logger.info(`Rule evaluation job completed in ${duration}ms`, results);

      // Invalidate relevant caches
      cacheManager.invalidatePattern('dashboard:');
      cacheManager.invalidatePattern('alerts:');

    } catch (error) {
      logger.error('Error in rule evaluation job:', error);
    }
  }

  /**
   * Get job statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      activeJobs: this.jobs.length
    };
  }

  /**
   * Manually trigger auto-close job (for testing)
   */
  async triggerAutoClose() {
    logger.info('Manually triggering auto-close job');
    await this.runAutoCloseJob();
  }

  /**
   * Manually trigger rule evaluation job (for testing)
   */
  async triggerRuleEvaluation() {
    logger.info('Manually triggering rule evaluation job');
    await this.runRuleEvaluationJob();
  }
}

// Export singleton instance
const backgroundJobs = new BackgroundJobs();
export default backgroundJobs;
