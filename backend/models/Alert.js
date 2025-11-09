import mongoose from 'mongoose';

/**
 * Alert Model - Central alert management
 * Supports multiple source types and dynamic state transitions
 * 
 * State Machine: OPEN → ESCALATED → AUTO_CLOSED/RESOLVED
 * 
 * Time Complexity for queries:
 * - Insert: O(log n) due to indexes
 * - Find by ID: O(log n)
 * - Find by driver/status: O(log n) with proper indexes
 * 
 * Space Complexity: O(1) per document
 */
const alertSchema = new mongoose.Schema({
  alertId: {
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
  severity: {
    type: String,
    required: true,
    enum: ['INFO', 'WARNING', 'CRITICAL'],
    default: 'INFO',
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['OPEN', 'ESCALATED', 'AUTO_CLOSED', 'RESOLVED'],
    default: 'OPEN',
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  metadata: {
    driverId: {
      type: String,
      index: true
    },
    driverName: String,
    vehicleId: String,
    vehicleNumber: String,
    location: String,
    speed: Number,
    speedLimit: Number,
    documentType: String,
    expiryDate: Date,
    feedbackRating: Number,
    feedbackComment: String,
    eventCount: {
      type: Number,
      default: 1
    },
    additionalInfo: mongoose.Schema.Types.Mixed
  },
  escalatedAt: Date,
  autoClosedAt: Date,
  resolvedAt: Date,
  closureReason: String,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  expiresAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
alertSchema.index({ status: 1, timestamp: -1 });
alertSchema.index({ 'metadata.driverId': 1, status: 1 });
alertSchema.index({ sourceType: 1, status: 1, timestamp: -1 });
alertSchema.index({ severity: 1, status: 1 });

// TTL index for automatic document expiration
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Virtual field for alert age in hours
 */
alertSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.timestamp) / (1000 * 60 * 60));
});

/**
 * Method to escalate alert
 * Time Complexity: O(1)
 */
alertSchema.methods.escalate = function(reason) {
  if (this.status === 'OPEN') {
    this.status = 'ESCALATED';
    this.severity = 'CRITICAL';
    this.escalatedAt = new Date();
    this.notes = reason || 'Auto-escalated by rule engine';
  }
  return this;
};

/**
 * Method to auto-close alert
 * Time Complexity: O(1)
 */
alertSchema.methods.autoClose = function(reason) {
  if (this.status === 'OPEN' || this.status === 'ESCALATED') {
    this.status = 'AUTO_CLOSED';
    this.autoClosedAt = new Date();
    this.closureReason = reason;
  }
  return this;
};

/**
 * Method to manually resolve alert
 * Time Complexity: O(1)
 */
alertSchema.methods.resolve = function(userId, notes) {
  this.status = 'RESOLVED';
  this.resolvedAt = new Date();
  this.resolvedBy = userId;
  this.notes = notes;
  return this;
};

/**
 * Static method to get alerts needing evaluation
 * Time Complexity: O(log n + k) where k is result count
 */
alertSchema.statics.getNeedingEvaluation = function() {
  return this.find({
    status: { $in: ['OPEN', 'ESCALATED'] },
    expiresAt: { $gt: new Date() }
  }).sort({ timestamp: 1 });
};

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
