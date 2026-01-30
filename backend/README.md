# EstateNet Backend

A clean, professional Node.js + TypeScript backend for the EstateNet property management application.

## Architecture

This backend follows an **identity-first architecture** where tenant identities exist independently of authentication.

## Features

- ✅ **Identity-First Design**: Tenant identities created independently
- ✅ **TypeScript**: Full type safety
- ✅ **Express.js**: RESTful API framework
- ✅ **Prisma ORM**: Type-safe database access
- ✅ **JWT Authentication**: Secure token-based auth
- ✅ **Input Validation**: Comprehensive request validation
- ✅ **Error Handling**: Centralized error management
- ✅ **Rate Limiting**: API protection
- ✅ **CORS Support**: Cross-origin requests
- ✅ **Health Checks**: Service monitoring

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main application entry point
│   ├── controllers/          # Request handlers
│   │   ├── authController.ts
│   │   └── tenantIdentityController.ts
│   ├── services/             # Business logic
│   │   ├── authService.ts
│   │   └── tenantIdentityService.ts
│   ├── middlewares/          # Express middleware
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── validation.ts
│   ├── routes/               # API routes
│   │   ├── auth.ts
│   │   └── identities.ts
│   └── utils/                # Utility functions
│       ├── database.ts
│       ├── jwt.ts
│       ├── password.ts
│       └── tenantId.ts
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts              # Sample data
├── package.json
├── tsconfig.json
└── .env
```

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Setup
Copy `.env` file and configure your database:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/estatenet?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3001
```

### 3. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Seed with sample data
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## API Endpoints

### Health & Info
- `GET /health` - Health check
- `GET /api` - API information

### Tenant Identities
- `POST /api/identities/create` - Create tenant identity
- `GET /api/identities/:tenantId` - Get tenant by ID
- `GET /api/identities/search/:query` - Search tenants
- `GET /api/identities` - Get all tenants (paginated)

### Authentication
- `POST /api/auth/setup` - Setup authentication for tenant
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (protected)

## Sample API Usage

### Create Tenant Identity
```bash
curl -X POST http://localhost:3001/api/identities/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+256700123456"
  }'
```

### Setup Authentication
```bash
curl -X POST http://localhost:3001/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "XY12AB34CD",
    "email": "john@example.com",
    "password": "Password123",
    "name": "John Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123"
  }'
```

## Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:19006` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `TENANT_ID_LENGTH` | Length of generated tenant IDs | `10` |

## Database Schema

### Tables
- **users**: Authentication records
- **tenant_identities**: Independent tenant profiles

### Relationships
- `users` → `tenant_identities` (1:1, optional)

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Controlled cross-origin access
- **Helmet.js**: Security headers

## Error Handling

All errors return consistent format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

## Frontend Integration

The backend is designed to work seamlessly with the Expo frontend running on `http://localhost:19006`.

## Next Steps

1. **Properties Module**: Add property management
2. **Payments Module**: Integrate payment processing
3. **Notifications**: Add email/SMS notifications
4. **File Upload**: Add document/image uploads
5. **Analytics**: Add reporting and analytics

## License

MIT
