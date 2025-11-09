import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Rule from './models/Rule.js';
import Alert from './models/Alert.js';
import { logger } from './utils/logger.js';

dotenv.config();

/**
 * Seed Database with Initial Data
 * Run: node seed.js
 */

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Rule.deleteMany();
    await Alert.deleteMany();
    
    console.log('Existing data cleared...');

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@sentinel.com',
      password: 'admin123',
      role: 'admin'
    });

    console.log('Admin user created:', adminUser.email);

    // Create operator user
    const operatorUser = await User.create({
      name: 'Operator User',
      email: 'operator@sentinel.com',
      password: 'operator123',
      role: 'operator'
    });

    console.log('Operator user created:', operatorUser.email);

    // Create default rules
    const rules = [
      {
        ruleId: 'RULE_OVERSPEED_001',
        sourceType: 'overspeed',
        name: 'Overspeed Escalation Rule',
        description: 'Escalate to Critical if 3 overspeed events within 1 hour',
        enabled: true,
        priority: 10,
        conditions: {
          escalate_if_count: 3,
          window_mins: 60,
          auto_close_after_mins: 1440 // 24 hours
        },
        actions: {
          escalate_to_severity: 'CRITICAL',
          notify: true,
          notificationChannels: ['email', 'sms']
        },
        createdBy: adminUser._id
      },
      {
        ruleId: 'RULE_COMPLIANCE_001',
        sourceType: 'compliance',
        name: 'Document Compliance Rule',
        description: 'Auto-close when document is renewed',
        enabled: true,
        priority: 8,
        conditions: {
          auto_close_if: 'document_valid',
          auto_close_after_mins: 10080 // 7 days if not resolved
        },
        actions: {
          notify: true,
          notificationChannels: ['email']
        },
        createdBy: adminUser._id
      },
      {
        ruleId: 'RULE_FEEDBACK_001',
        sourceType: 'feedback_negative',
        name: 'Negative Feedback Escalation',
        description: 'Escalate if 2 negative feedbacks within 24 hours',
        enabled: true,
        priority: 7,
        conditions: {
          escalate_if_count: 2,
          window_mins: 1440, // 24 hours
          auto_close_if: 'feedback_improved'
        },
        actions: {
          escalate_to_severity: 'WARNING',
          notify: true,
          notificationChannels: ['email']
        },
        createdBy: adminUser._id
      },
      {
        ruleId: 'RULE_MAINTENANCE_001',
        sourceType: 'maintenance',
        name: 'Maintenance Alert Rule',
        description: 'Auto-close after 30 days or when maintenance completed',
        enabled: true,
        priority: 5,
        conditions: {
          auto_close_if: 'maintenance_completed',
          auto_close_after_mins: 43200 // 30 days
        },
        actions: {
          notify: false
        },
        createdBy: adminUser._id
      }
    ];

    await Rule.insertMany(rules);
    console.log(`${rules.length} rules created`);

    // Create sample alerts for demonstration
    const sampleAlerts = [
      {
        alertId: `ALT-${Date.now()}-001`,
        sourceType: 'overspeed',
        severity: 'WARNING',
        status: 'OPEN',
        metadata: {
          driverId: 'DRV001',
          driverName: 'John Smith',
          vehicleId: 'VEH001',
          vehicleNumber: 'MH-01-AB-1234',
          speed: 85,
          speedLimit: 60,
          location: 'Highway NH-48',
          eventCount: 1
        },
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        alertId: `ALT-${Date.now()}-002`,
        sourceType: 'compliance',
        severity: 'CRITICAL',
        status: 'ESCALATED',
        metadata: {
          driverId: 'DRV002',
          driverName: 'Jane Doe',
          vehicleId: 'VEH002',
          vehicleNumber: 'KA-05-CD-5678',
          documentType: 'Driving License',
          expiryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Expired 5 days ago
          eventCount: 1
        },
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        escalatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000)
      },
      {
        alertId: `ALT-${Date.now()}-003`,
        sourceType: 'feedback_negative',
        severity: 'WARNING',
        status: 'OPEN',
        metadata: {
          driverId: 'DRV003',
          driverName: 'Bob Johnson',
          vehicleId: 'VEH003',
          vehicleNumber: 'DL-12-EF-9012',
          feedbackRating: 2,
          feedbackComment: 'Rude behavior with passenger',
          eventCount: 1
        },
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        alertId: `ALT-${Date.now()}-004`,
        sourceType: 'overspeed',
        severity: 'INFO',
        status: 'AUTO_CLOSED',
        metadata: {
          driverId: 'DRV001',
          driverName: 'John Smith',
          vehicleId: 'VEH001',
          vehicleNumber: 'MH-01-AB-1234',
          speed: 70,
          speedLimit: 60,
          location: 'City Road',
          eventCount: 1
        },
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
        autoClosedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        closureReason: 'Alert aged beyond 1440 minutes',
        expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000)
      },
      {
        alertId: `ALT-${Date.now()}-005`,
        sourceType: 'maintenance',
        severity: 'WARNING',
        status: 'OPEN',
        metadata: {
          driverId: 'DRV004',
          driverName: 'Alice Williams',
          vehicleId: 'VEH004',
          vehicleNumber: 'TN-09-GH-3456',
          maintenanceType: 'Oil Change Due',
          lastMaintenance: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          eventCount: 1
        },
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
      }
    ];

    await Alert.insertMany(sampleAlerts);
    console.log(`${sampleAlerts.length} sample alerts created`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nDefault Credentials:');
    console.log('Admin: admin@sentinel.com / admin123');
    console.log('Operator: operator@sentinel.com / operator123');
    
  } catch (error) {
    console.error('Seeding error:', error);
  }
};

const run = async () => {
  await connectDB();
  await seedData();
  mongoose.connection.close();
  console.log('\nDatabase connection closed.');
};

run();
