import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Server Configuration
  PORT: z.string().transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BASE_URL: z.string().url().default('http://localhost:3001'),

  // JWT Configuration
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_ALGORITHM: z.enum(['HS256', 'HS384', 'HS512']).default('HS256'),

  // Supabase Configuration
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: z.string().transform((val) => val === 'true').default('true'),
  CORS_METHODS: z.string().default('GET,POST,PUT,PATCH,DELETE,OPTIONS'),

  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_DIR: z.string().default('logs'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),

  // Rate Limiting Configuration
  RATE_LIMIT_AUTH: z.string().transform(Number).default('5'),
  RATE_LIMIT_GENERAL: z.string().transform(Number).default('100'),
  RATE_LIMIT_HEALTH: z.string().transform(Number).default('1000'),
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('1'),

  // Frontend Configuration
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  LOGIN_REDIRECT_URL: z.string().url().default('http://localhost:3000/dashboard'),
  LOGOUT_REDIRECT_URL: z.string().url().default('http://localhost:3000/login'),

  // HTTP Client Configuration
  HTTP_TIMEOUT: z.string().transform(Number).default('10000'),
  HTTP_RETRY_ATTEMPTS: z.string().transform(Number).default('3'),
  HTTP_RETRY_DELAY: z.string().transform(Number).default('1000'),
  HTTP_CACHE_TTL: z.string().transform(Number).default('300000'),
});

// Validate environment variables
const validateEnvironment = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
};

const env = validateEnvironment();

// Configuration object
export const config = {
  // Server
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  baseUrl: env.BASE_URL,

  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: env.JWT_ALGORITHM as 'HS256' | 'HS384' | 'HS512',
  },

  // Supabase
  supabase: {
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: env.SUPABASE_ANON_KEY,
  },

  // CORS
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: env.CORS_CREDENTIALS,
    methods: env.CORS_METHODS.split(',').map(method => method.trim()),
  },

  // Logging
  logging: {
    level: env.LOG_LEVEL,
    dir: env.LOG_DIR,
    format: env.LOG_FORMAT,
  },

  // Rate Limiting
  rateLimit: {
    auth: env.RATE_LIMIT_AUTH,
    general: env.RATE_LIMIT_GENERAL,
    health: env.RATE_LIMIT_HEALTH,
    window: env.RATE_LIMIT_WINDOW,
  },

  // Frontend
  frontend: {
    url: env.FRONTEND_URL,
    loginRedirectUrl: env.LOGIN_REDIRECT_URL,
    logoutRedirectUrl: env.LOGOUT_REDIRECT_URL,
  },

  // HTTP Client
  httpClient: {
    timeout: env.HTTP_TIMEOUT,
    retryAttempts: env.HTTP_RETRY_ATTEMPTS,
    retryDelay: env.HTTP_RETRY_DELAY,
    cacheTtl: env.HTTP_CACHE_TTL,
  },
};

export default config;