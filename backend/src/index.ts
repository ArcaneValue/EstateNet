import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { identityRoutes } from './routes/identities';
import { authRoutes } from './routes/auth';
import { propertyRoutes } from './routes/properties';
import { tenantRoutes } from './routes/tenants';
import { leaseRoutes } from './routes/leases';
import { reportRoutes } from './routes/reports';
import { paymentRoutes } from './routes/payments';
import { tenantMeRoutes } from './routes/tenantMe';
import { messageRoutes } from './routes/messages';
import { notificationRoutes } from './routes/notifications';
import { userRoutes } from './routes/users';
import managerRoutes from './routes/manager';
import { unitRoutes } from './routes/units';
import { ownerInvitationRoutes } from './routes/ownerInvitations';
import { activityRoutes } from './routes/activity';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    }
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:19006',
        'http://localhost:8081',
        'http://localhost:19006',
        'http://127.0.0.1:8081',
        'http://127.0.0.1:19006'
    ],
    credentials: true
}));
app.use(limiter);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/identities', identityRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/tenant', tenantMeRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/owner', ownerInvitationRoutes);
app.use('/api/activity', activityRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        architecture: 'identity-first',
        version: '1.0.0'
    });
});

// API info
app.get('/api', (req, res) => {
    res.json({
        name: 'EstateNet Backend API',
        version: '1.0.0',
        description: 'Backend API for EstateNet property management',
        endpoints: {
            identities: '/api/identities',
            auth: '/api/auth',
            properties: '/api/properties',
            tenants: '/api/tenants',
            leases: '/api/leases',
            reports: '/api/reports',
            payments: '/api/payments',
            health: '/health'
        }
    });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Process-level safety net
process.on('uncaughtException', (error) => {
    console.error('FATAL: Uncaught Exception:', error);
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('FATAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 EstateNet Backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API docs: http://localhost:${PORT}/api`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
