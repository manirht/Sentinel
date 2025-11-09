import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import connectDB from './config/database.js';
import { logger, morganStream } from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import backgroundJobs from './services/backgroundJobs.js';
import cacheManager from './utils/cache.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import ruleRoutes from './routes/ruleRoutes.js';

// Load env vars
dotenv.config();

// Initialize Express app
const app = express();

// Connect to database
connectDB();

/**
 * Security Middleware
 */

// Helmet for security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);

// Compression
app.use(compression());

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Logging Middleware
 */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: morganStream }));
}

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/rules', ruleRoutes);

/**
 * Health Check & Monitoring Routes
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

app.get('/api/monitoring/stats', (req, res) => {
  const cacheStats = cacheManager.getStats();
  const jobStats = backgroundJobs.getStats();
  
  res.status(200).json({
    success: true,
    data: {
      cache: cacheStats,
      backgroundJobs: jobStats,
      memory: {
        usage: process.memoryUsage(),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
      }
    }
  });
});

/**
 * Root route
 */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sentinel Alert Management System API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

/**
 * 404 Handler
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

/**
 * Global Error Handler
 */
app.use(errorHandler);

/**
 * Start Server
 */
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  
  // Start background jobs
  backgroundJobs.start();
  logger.info('Background jobs started');
});

/**
 * Handle Unhandled Promise Rejections
 */
process.on('unhandledRejection', (err, promise) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

/**
 * Handle Uncaught Exceptions
 */
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  backgroundJobs.stop();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
