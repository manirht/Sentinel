import mongoose from 'mongoose';

/**
 * Rule Model - Configurable escalation rules
 * Supports dynamic rule evaluation without hardcoding
 * 
 * Time Complexity: O(1) for rule lookups with proper indexing
 * Space Complexity: O(1) per rule
 */
const ruleSchema = new mongoose.Schema({
  ruleId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  sourceType: {
    type: String,
    required: true,
    enum: ['overspeed', 'compliance', 'feedback_negative', 'maintenance', 'other'],
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  enabled: {
    type: Boolean,
    default: true,
    index: true
  },
  priority: {
    type: Number,
    default: 0
  },
  conditions: {
    // Escalation conditions
    escalate_if_count: Number,
    window_mins: Number,
    
    // Auto-close conditions
    auto_close_if: String,
    auto_close_after_mins: Number,
    
    // Custom conditions
    custom_conditions: mongoose.Schema.Types.Mixed
  },
  actions: {
    escalate_to_severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL']
    },
    notify: Boolean,
    notificationChannels: [String]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for quick rule retrieval
ruleSchema.index({ sourceType: 1, enabled: 1 });
ruleSchema.index({ priority: -1 });

/**
 * Method to evaluate if rule conditions are met
 * Time Complexity: O(1) for direct condition checks
 */
ruleSchema.methods.evaluate = function(alertData) {
  if (!this.enabled) return false;
  
  const { conditions } = this;
  
  // Check if alert meets escalation conditions
  if (conditions.escalate_if_count && conditions.window_mins) {
    return alertData.count >= conditions.escalate_if_count;
  }
  
  // Check auto-close conditions
  if (conditions.auto_close_if) {
    return alertData.metadata?.[conditions.auto_close_if] === true;
  }
  
  return false;
};

const Rule = mongoose.model('Rule', ruleSchema);

export default Rule;
