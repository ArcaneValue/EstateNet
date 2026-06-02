import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import * as cron from 'node-cron';
import { identityRoutes } from './routes/identities';
import { authRoutes } from './routes/auth';
import { propertyRoutes } from './routes/properties';
import { tenantRoutes } from './routes/tenants';
import { leaseRoutes } from './routes/leases';
import { reportRoutes } from './routes/reports';
import { paymentRoutes } from './routes/payments';
import { paymentCollectionRoutes } from './routes/paymentCollection';
import paymentClaimRoutes from './routes/paymentClaims';
import { tenantMeRoutes } from './routes/tenantMe';
import { managerFinanceRoutes } from './routes/managerFinance';
import { tenantFinanceRoutes } from './routes/tenantFinance';
import { messageRoutes } from './routes/messages';
import { notificationRoutes } from './routes/notifications';
import { userRoutes } from './routes/users';
import managerRoutes from './routes/manager';
import { unitRoutes } from './routes/units';
import { ownerInvitationRoutes } from './routes/ownerInvitations';
import { activityRoutes } from './routes/activity';
import { managerTermsRoutes } from './routes/managerTerms';
import { billingRoutes } from './routes/billing';
import { webhookPaymentRoutes } from './routes/webhookPayments';
import { ownerBillingRoutes } from './routes/ownerBilling';
import feedbackRoutes from './routes/feedback';
import adminFeedbackRoutes from './routes/adminFeedback';
import imageRoutes from './routes/images';
import { legalRoutes } from './routes/legal';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { PrismaClient } from '@prisma/client';
import { cleanupDuplicateInvoices } from './scripts/cleanupDuplicateInvoices';
import { runDailyBillingTasks } from './services/billingScheduler';
import { timeoutStalePendingPayments } from './services/servicePaymentService';
import { prisma } from './utils/database';
import { initializeDatabase } from './utils/waitForDatabase';

// Load environment variables
dotenv.config();

// Force TypeScript recompilation for new Prisma types

// Server restart trigger

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - required when behind Nginx reverse proxy
app.set('trust proxy', 1);

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

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
    // Production domain
    'https://estatenet-production.up.railway.app',
    // Local web development
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:19006',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:19006',
    // Honour FRONTEND_URL env var if set
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

// CORS origin resolver — supports browser clients, Expo Go (exp://), and
// native mobile apps that send no Origin header at all.
const corsOriginHandler = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean | string) => void
) => {
    // No Origin header → native mobile / curl / server-to-server request.
    // Allow it so Expo Go and React Native fetch() work without issues.
    if (!origin) {
        return callback(null, true);
    }

    // Explicitly listed origins
    if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
    }

    // Expo Go uses exp:// scheme (e.g. exp://192.168.x.x:8081)
    if (origin.startsWith('exp://')) {
        return callback(null, true);
    }

    // Temporary: allow all origins so mobile testing is unblocked.
    // TODO: remove the line below once the production domain is stable.
    if (process.env.CORS_ALLOW_ALL === 'true' || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
    }

    // Rejected — log for debugging
    console.warn(`[CORS] Blocked request from disallowed origin: ${origin}`);
    return callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
};

app.use(cors({
    origin: corsOriginHandler,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
app.use('/api/tenant', tenantFinanceRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payments', paymentCollectionRoutes);
app.use('/api', paymentClaimRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/manager/finance', managerFinanceRoutes);
app.use('/api/owner', ownerInvitationRoutes);
app.use('/api/owner', ownerBillingRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/manager', managerTermsRoutes);
app.use('/api/manager', billingRoutes);
app.use('/api/payments/webhook', webhookPaymentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin/feedback', adminFeedbackRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/legal', legalRoutes);

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
    console.error('FATAL: Stack trace:', error instanceof Error ? error.stack : String(error));
    // Flush logs then exit — staying alive after an uncaught exception is unsafe
    setTimeout(() => process.exit(1), 500);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('FATAL: Unhandled Promise Rejection');
    console.error('FATAL: Promise:', promise);
    console.error('FATAL: Reason:', reason);
    if (reason instanceof Error) {
        console.error('FATAL: Stack trace:', reason.stack);
    }
    // Exit so Railway restarts the container and we get a visible crash
    setTimeout(() => process.exit(1), 500);
});

process.on('exit', (code) => {
    console.log(`[Process] Exiting with code ${code} at ${new Date().toISOString()}`);
});

process.on('SIGTERM', () => {
    console.log('[Process] Received SIGTERM — shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[Process] Received SIGINT — shutting down gracefully');
    process.exit(0);
});

// Start server with retry logic
const startServer = (port: number) => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 EstateNet Backend running on port ${port}`);
        console.log(`📊 Health check: http://localhost:${port}/health`);
        console.log(`📚 API docs: http://localhost:${port}/api`);
        console.log(`🌍 Network access: http://10.79.234.41:${port}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    }).on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${port} is already in use`);
            if (port === PORT) {
                console.log(`🔄 Trying alternative port ${PORT + 1}...`);
                startServer(PORT + 1);
            } else {
                console.error('❌ Could not start server - all ports in use');
                process.exit(1);
            }
        } else {
            console.error('❌ Server error:', err);
            process.exit(1);
        }
    });
};

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
    startServer(Number(PORT));
} else {
    console.log('[Server] Skipping server startup in test environment');
}

// Only run background jobs if not disabled (e.g., in test environment)
if (process.env.DISABLE_BACKGROUND_JOBS !== 'true') {
    // Schedule daily billing tasks at 00:05 server time
    cron.schedule('5 0 * * *', async () => {
        console.log(`[BillingScheduler] Starting daily billing tasks at ${new Date().toISOString()}...`);
        try {
            const results = await runDailyBillingTasks();
            console.log('[BillingScheduler] Daily tasks completed:', {
                invoicesCreatedCount: results.invoicesCreatedCount,
                invoicesMarkedOverdueCount: results.invoicesMarkedOverdueCount,
                managersUpdatedCount: results.managersUpdatedCount
            });
        } catch (error) {
            console.error('[BillingScheduler] Daily tasks failed:', error);
            if (error instanceof Error) {
                console.error('[BillingScheduler] Error message:', error.message);
                console.error('[BillingScheduler] Error stack:', error.stack);
            }
        }
    }, {
        scheduled: true,
        timezone: 'Africa/Kampala' // Use server timezone
    });

    // Schedule pending payment cleanup every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
        try {
            const count = await timeoutStalePendingPayments();
            if (count > 0) {
                console.log(`[PaymentCleanup] Timed out ${count} stale pending payment(s)`);
            }
        } catch (error) {
            console.error('[PaymentCleanup] Cleanup failed:', error);
            if (error instanceof Error) {
                console.error('[PaymentCleanup] Error message:', error.message);
                console.error('[PaymentCleanup] Error stack:', error.stack);
            }
        }
    });

    // Run catch-up on startup after server is ready
    let startupRetryCount = 0;
    const MAX_STARTUP_RETRIES = 5;
    const STARTUP_RETRY_DELAY_MS = 30000;
    // Hard cap: if startup tasks haven't finished within 10 minutes, log and move on
    const STARTUP_TIMEOUT_MS = 10 * 60 * 1000;

    const runStartupTasks = async () => {
        const startTime = Date.now();
        console.log(`[Startup] ===== BEGIN STARTUP TASKS (attempt ${startupRetryCount + 1}/${MAX_STARTUP_RETRIES}) at ${new Date().toISOString()} =====`);

        // Wrap everything in a timeout so a hung DB call can't stall the process forever
        const timeoutHandle = setTimeout(() => {
            console.error(`[Startup] TIMEOUT: Startup tasks exceeded ${STARTUP_TIMEOUT_MS / 1000}s limit — giving up to keep server alive`);
        }, STARTUP_TIMEOUT_MS);

        try {
            // Step 1: Wait for database
            console.log(`[Startup] Step 1/3: Waiting for database connection... (${new Date().toISOString()})`);
            const dbReady = await initializeDatabase();
            if (!dbReady) {
                clearTimeout(timeoutHandle);
                startupRetryCount++;
                if (startupRetryCount < MAX_STARTUP_RETRIES) {
                    console.error(`[Startup] Database not ready after full retry cycle. Will retry startup tasks in ${STARTUP_RETRY_DELAY_MS / 1000}s (attempt ${startupRetryCount}/${MAX_STARTUP_RETRIES})`);
                    setTimeout(runStartupTasks, STARTUP_RETRY_DELAY_MS);
                } else {
                    console.error(`[Startup] FATAL: Database unreachable after ${MAX_STARTUP_RETRIES} startup attempts. Server is running but billing tasks were skipped.`);
                }
                return;
            }
            console.log(`[Startup] Step 1/3: Database ready (${Date.now() - startTime}ms elapsed)`);

            // Step 2: Clean up duplicate invoices
            console.log(`[Startup] Step 2/3: Checking for duplicate invoices... (${new Date().toISOString()})`);
            try {
                const cleanupResult = await cleanupDuplicateInvoices();
                if (cleanupResult.deletedCount > 0) {
                    console.log(`[Startup] Step 2/3: Cleaned up ${cleanupResult.deletedCount} duplicate invoices (${Date.now() - startTime}ms elapsed)`);
                } else {
                    console.log(`[Startup] Step 2/3: No duplicate invoices found (${Date.now() - startTime}ms elapsed)`);
                }
            } catch (cleanupError) {
                // Non-fatal: log and continue — duplicate cleanup failure should not block billing
                console.error(`[Startup] Step 2/3: Duplicate invoice cleanup failed (non-fatal, continuing):`, cleanupError);
                if (cleanupError instanceof Error) {
                    console.error(`[Startup] Cleanup error details — message: ${cleanupError.message} | stack: ${cleanupError.stack}`);
                }
            }

            // Step 3: Run daily billing tasks
            console.log(`[Startup] Step 3/3: Running daily billing catch-up... (${new Date().toISOString()})`);
            try {
                const results = await runDailyBillingTasks();
                console.log(`[Startup] Step 3/3: Daily billing catch-up completed in ${Date.now() - startTime}ms:`, {
                    invoicesCreatedCount: results.invoicesCreatedCount,
                    invoicesMarkedOverdueCount: results.invoicesMarkedOverdueCount,
                    managersUpdatedCount: results.managersUpdatedCount
                });
            } catch (billingError) {
                console.error(`[Startup] Step 3/3: Daily billing tasks failed:`, billingError);
                if (billingError instanceof Error) {
                    console.error(`[Startup] Billing error details — message: ${billingError.message} | stack: ${billingError.stack}`);
                }
                // Retry the whole startup sequence if billing fails
                startupRetryCount++;
                if (startupRetryCount < MAX_STARTUP_RETRIES) {
                    clearTimeout(timeoutHandle);
                    console.error(`[Startup] Scheduling retry in ${STARTUP_RETRY_DELAY_MS / 1000}s (attempt ${startupRetryCount}/${MAX_STARTUP_RETRIES})`);
                    setTimeout(runStartupTasks, STARTUP_RETRY_DELAY_MS);
                    return;
                } else {
                    console.error(`[Startup] Billing tasks failed after ${MAX_STARTUP_RETRIES} attempts — giving up. Server remains running.`);
                }
            }

            clearTimeout(timeoutHandle);
            console.log(`[Startup] ===== STARTUP TASKS COMPLETE in ${Date.now() - startTime}ms at ${new Date().toISOString()} =====`);

        } catch (error) {
            clearTimeout(timeoutHandle);
            // Catch-all for any unexpected error in the startup sequence
            console.error(`[Startup] UNEXPECTED ERROR in startup tasks:`, error);
            if (error instanceof Error) {
                console.error(`[Startup] Error message: ${error.message}`);
                console.error(`[Startup] Error stack: ${error.stack}`);
            }
            startupRetryCount++;
            if (startupRetryCount < MAX_STARTUP_RETRIES) {
                console.error(`[Startup] Scheduling retry in ${STARTUP_RETRY_DELAY_MS / 1000}s (attempt ${startupRetryCount}/${MAX_STARTUP_RETRIES})`);
                setTimeout(runStartupTasks, STARTUP_RETRY_DELAY_MS);
            } else {
                console.error(`[Startup] Startup tasks abandoned after ${MAX_STARTUP_RETRIES} attempts. Server remains running.`);
            }
        }
    };

    // Start startup tasks after a short delay to let server initialize
    setTimeout(runStartupTasks, 1000);
} else {
    console.log('[BillingScheduler] Background jobs disabled for test environment');
}

export default app;
