import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Boilerplate with Supabase Auth',
      version: '1.0.0',
      description: 'A comprehensive API boilerplate with Supabase authentication, rate limiting, and project management',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: config.baseUrl,
        description: `${config.nodeEnv.charAt(0).toUpperCase() + config.nodeEnv.slice(1)} server`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    example: 'error',
                  },
                  message: {
                    type: 'string',
                    example: 'Authorization token required',
                  },
                  data: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        example: 'MISSING_TOKEN',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    example: 'error',
                  },
                  message: {
                    type: 'string',
                    example: 'Validation failed',
                  },
                  data: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        example: 'VALIDATION_ERROR',
                      },
                      errors: {
                        type: 'array',
                        items: {
                          type: 'string',
                        },
                        example: ['body.email: Invalid email format'],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    example: 'error',
                  },
                  message: {
                    type: 'string',
                    example: 'Too many requests, please try again later',
                  },
                  data: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        example: 'RATE_LIMIT_EXCEEDED',
                      },
                      retryAfter: {
                        type: 'integer',
                        example: 60,
                      },
                      limit: {
                        type: 'integer',
                        example: 100,
                      },
                      window: {
                        type: 'integer',
                        example: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and management operations',
      },
      {
        name: 'Projects',
        description: 'Project management operations',
      },
      {
        name: 'Health',
        description: 'API health check operations',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/server.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);