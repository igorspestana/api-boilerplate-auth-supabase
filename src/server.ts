import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { logger } from './utils/logger';
import { swaggerSpec } from './config/swagger';
import { healthRateLimit } from './middlewares/rateLimiting';
import apiRoutes from './routes';
import { ApiResponse } from './utils/types';

const app = express();

// Trust proxy for rate limiting and security
app.set('trust proxy', 1);

// CORS configuration
const corsOptions = {
  origin: config.cors.origin.split(',').map(origin => origin.trim()),
  credentials: config.cors.credentials,
  methods: config.cors.methods,
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400, // Cache preflight for 24 hours
};

app.use(cors(corsOptions));

// Security middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running normally
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: API running normally
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     environment:
 *                       type: string
 *                     version:
 *                       type: string
 *                     uptime:
 *                       type: number
 */
app.get('/health', healthRateLimit, (req, res) => {
  const response: ApiResponse = {
    status: 'success',
    message: 'API running normally',
    data: {
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
    },
  };

  res.status(200).json(response);
});

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API Boilerplate Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
  },
}));

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  const response: ApiResponse = {
    status: 'success',
    message: 'API Boilerplate with Supabase Auth',
    data: {
      version: '1.0.0',
      documentation: `${config.baseUrl}/docs`,
      health: `${config.baseUrl}/health`,
      environment: config.nodeEnv,
    },
  };

  res.status(200).json(response);
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 - Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  const response: ApiResponse = {
    status: 'error',
    message: 'Route not found',
    data: {
      code: 'ROUTE_NOT_FOUND',
      method: req.method,
      path: req.originalUrl,
    },
  };

  res.status(404).json(response);
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle CORS errors
  if (error.message === 'Not allowed by CORS') {
    logger.warn('CORS violation detected', {
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    const response: ApiResponse = {
      status: 'error',
      message: 'CORS policy violation',
      data: {
        code: 'CORS_ERROR',
      },
    };

    res.status(403).json(response);
    return;
  }

  const response: ApiResponse = {
    status: 'error',
    message: config.nodeEnv === 'production' ? 'Internal server error' : error.message,
    data: {
      code: 'INTERNAL_SERVER_ERROR',
      ...(config.nodeEnv !== 'production' && { stack: error.stack }),
    },
  };

  res.status(500).json(response);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason,
  });
});

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  const baseUrl = `http://localhost:${PORT}`;
  
  // Server startup banner
  console.log('\n' + '='.repeat(60));
  console.log('🚀 API BOILERPLATE');
  console.log('='.repeat(60));
  console.log(`🌍 Environment: ${config.nodeEnv.toUpperCase()}`);
  console.log(`📡 Server running on: ${baseUrl}`);
  console.log(`🕐 Started at: ${new Date().toLocaleString()}`);
  console.log('');
  console.log('📍 AVAILABLE ENDPOINTS:');
  console.log(`   🏥 Health Check: ${baseUrl}/health`);
  console.log(`   📚 API Documentation: ${baseUrl}/docs`);
  console.log(`   🔧 API Base: ${baseUrl}/api`);
  console.log('');
  console.log('🛡️  SECURITY SETTINGS:');
  console.log(`   🌐 CORS Origin: ${config.cors.origin}`);
  console.log(`   🔒 JWT Expires: ${config.jwt.expiresIn}`);
  console.log('');
  
  // Environment warnings
  const warnings = [];
  if (config.supabase.url.includes('your-project')) {
    warnings.push('⚠️  Supabase URL not configured');
  }
  if (config.supabase.serviceRoleKey.includes('your-supabase')) {
    warnings.push('⚠️  Supabase Service Role Key not configured');
  }
  if (config.jwt.secret.includes('your-super-secret')) {
    warnings.push('⚠️  JWT Secret is using default value');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  CONFIGURATION WARNINGS:');
    warnings.forEach(warning => console.log(`   ${warning}`));
    console.log('   💡 Create .env file with your actual credentials');
    console.log('');
  }
  
  console.log('💡 QUICK COMMANDS:');
  console.log('   • Test API: curl ' + baseUrl + '/health');
  console.log('   • View Docs: open ' + baseUrl + '/docs');
  console.log('   • Stop Server: Ctrl+C');
  console.log('='.repeat(60) + '\n');
  
  // Also log to winston
  logger.info('='.repeat(60));
  logger.info(`🌍 Environment: ${config.nodeEnv.toUpperCase()}`);
  logger.info(`🚀 API Boilerplate server started on port ${PORT}`);
  logger.info(`📚 API Documentation available at: ${baseUrl}/docs`);
  logger.info(`🏥 Health check available at: ${baseUrl}/health`);
  logger.info(`🛡️  SECURITY SETTINGS:
   🌐 CORS Origin: ${config.cors.origin}
   🔒 JWT Expires: ${config.jwt.expiresIn}`); 
  logger.info('='.repeat(60));
});

export default app;