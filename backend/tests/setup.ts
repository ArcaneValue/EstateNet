// Jest setup file to configure test environment
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

// Ensure required environment variables are set for tests
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-secret-key-for-financial-statements-testing';
}

if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/estatenet_test';
}

if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
}

// Set test-specific configurations
process.env.DISABLE_BACKGROUND_JOBS = 'true';
process.env.DISABLE_WEBHOOKS = 'true';
process.env.PORT = '3001';
process.env.FRONTEND_URL = 'http://localhost:3000';

console.log('Test environment configured with JWT_SECRET and DATABASE_URL');
