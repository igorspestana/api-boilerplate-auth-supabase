# API Boilerplate with Supabase Authentication

A comprehensive Node.js API boilerplate with TypeScript, Supabase authentication, rate limiting, and comprehensive documentation.

## Features

- 🔐 **Hybrid Authentication**: Supabase Auth + Custom JWT
- 🛡️ **Security**: Rate limiting, CORS, Helmet, input validation
- 📚 **API Documentation**: Auto-generated Swagger/OpenAPI docs
- 🏗️ **Architecture**: Clean layered architecture (routes → controllers → services)
- 📝 **Logging**: Structured logging with Winston
- ✅ **Validation**: Zod schemas for request validation  
- 🚀 **Performance**: Compression, caching, connection pooling
- 🌍 **Environment**: Multiple environment support
- 📊 **Monitoring**: Health checks and error tracking

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth + JWT
- **Validation**: Zod
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd api-boilerplate-auth-supabase
npm install
```

### 2. Environment Setup

Create a `.env` file based on `docs/env.example`:

```bash
cp docs/env.example .env
```

### 3. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Update `.env` with your Supabase credentials
3. Run the database setup from `docs/deployment.mdc`

### 4. Start Development

```bash
npm run dev
```

The API will be available at:
- **API**: http://localhost:3001
- **Documentation**: http://localhost:3001/docs
- **Health Check**: http://localhost:3001/health

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── middlewares/     # Authentication, validation, rate limiting
├── routes/          # API route definitions
├── services/        # Business logic
├── utils/           # Utilities and helpers
└── server.ts        # Express server setup
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/reset-password` - Request password reset
- `GET /api/auth/me` - Get current user data
- `GET /api/auth/validate` - Validate JWT token

### Admin Only
- `POST /api/auth/users` - Create user
- `PATCH /api/auth/users/:id/status` - Update user status
- `POST /api/auth/change-password` - Change user password
- `POST /api/auth/check-sync` - Check user synchronization

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects` - List user projects
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

## Rate Limiting

- **Auth endpoints**: 5 requests/minute per IP
- **General endpoints**: 100 requests/minute per user
- **Health check**: 1000 requests/minute per IP
- **Admin endpoints**: 50 requests/minute per admin

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run lint         # Lint code
npm run format       # Format code
```

## Environment Variables

See `docs/env.example` for all available environment variables:

- **Server**: PORT, NODE_ENV, BASE_URL
- **JWT**: JWT_SECRET, JWT_EXPIRES_IN, JWT_ALGORITHM
- **Supabase**: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
- **CORS**: CORS_ORIGIN, CORS_CREDENTIALS, CORS_METHODS
- **Logging**: LOG_LEVEL, LOG_DIR, LOG_FORMAT
- **Rate Limiting**: RATE_LIMIT_AUTH, RATE_LIMIT_GENERAL, RATE_LIMIT_WINDOW

## Database Schema

### profiles
- `id` (UUID, PK)
- `name` (TEXT, UNIQUE) - "admin" or "user"
- `created_at` (TIMESTAMP)

### users
- `id` (UUID, PK)
- `name` (TEXT)
- `email` (TEXT, UNIQUE)
- `status` (TEXT) - "active" or "inactive"
- `profile_id` (UUID, FK → profiles)
- `created_at` (TIMESTAMP)

### projects
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `name` (TEXT)
- `status` (TEXT) - "pending", "active", "completed", "cancelled"
- `created_at` (TIMESTAMP)

## Security Features

- **Authentication**: JWT with profile-based access control
- **Rate Limiting**: Configurable limits per endpoint type
- **CORS**: Configurable origin whitelist
- **Input Validation**: Zod schemas for all inputs
- **Security Headers**: Helmet middleware
- **Logging**: Structured security event logging

## Documentation

- **API Docs**: Available at `/docs` in development
- **Architecture**: See `docs/architecture.mdc`
- **Authentication**: See `docs/auth.mdc`
- **Deployment**: See `docs/deployment.mdc`
- **Endpoints**: See `docs/endpoints.mdc`
- **Entities**: See `docs/entities.mdc`
- **Security**: See `docs/guardrails.mdc`

## Deployment

### Railway
1. Connect your GitHub repository
2. Configure environment variables
3. Deploy automatically

### Docker
```bash
docker build -t api-boilerplate .
docker run -p 3001:3001 api-boilerplate
```

### Manual Deployment
```bash
npm run build
npm start
```

## Health Monitoring

- **Health Check**: `GET /health`
- **Logs**: `logs/combined.log` and `logs/error.log`
- **Metrics**: Response times, error rates, rate limit hits

## Contributing

1. Follow TypeScript strict mode
2. Use meaningful commit messages
3. Add tests for new features
4. Update documentation
5. Follow existing code patterns

## License

MIT License - see LICENSE file for details