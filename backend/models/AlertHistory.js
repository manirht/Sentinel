import mongoose from 'mongoose';

/**
 * AlertHistory Model - Tracks all state transitions
 * Provides audit trail for alert lifecycle
 * 
 * Time Complexity: O(log n) for inserts due to indexes
 * Space Complexity: O(1) per document
 */
const alertHistorySchema = new mongoose.Schema({
  alertId: {
    type: String,
    required: true,
    index: true
  },
  alert: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert',
    required: true
  },
  fromStatus: {
    type: String,
    enum: ['OPEN', 'ESCALATED', 'AUTO_CLOSED', 'RESOLVED', null],
    default: null
  },
  toStatus: {
    type: String,
    required: true,
    enum: ['OPEN', 'ESCALATED', 'AUTO_CLOSED', 'RESOLVED']
  },
  reason: String,
  triggeredBy: {
    type: String,
    enum: ['SYSTEM', 'USER', 'RULE_ENGINE', 'AUTO_CLOSE_JOB'],
    default: 'SYSTEM'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
alertHistorySchema.index({ alertId: 1, timestamp: -1 });
alertHistorySchema.index({ timestamp: -1 });

/**
 * Static method to log state transition
 * Time Complexity: O(log n)
 */
alertHistorySchema.statics.logTransition = async function(alertId, alert, fromStatus, toStatus, reason, triggeredBy, userId, metadata) {
  return await this.create({
    alertId,
    alert: alert._id,
    fromStatus,
    toStatus,
    reason,
    triggeredBy,
    userId,
    metadata
  });
};

const AlertHistory = mongoose.model('AlertHistory', alertHistorySchema);

export default AlertHistory;
