// Test-specific app configuration without background processes
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// Import routes
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

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
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
app.use('/api/webhook', webhookPaymentRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

export default app;
