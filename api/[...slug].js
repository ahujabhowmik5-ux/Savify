import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import expenseRoutes from '../server/routes/expenses.js';
import feedbackRoutes from '../server/routes/feedback.js';
import inviteRoutes from '../server/routes/invites.js';
import profileRoutes from '../server/routes/profile.js';
import paymentRoutes from '../server/routes/payment.js';
import commerceRoutes from '../server/routes/commerce.js';
import notificationRoutes from '../server/routes/notifications.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
// Capture raw body for Cashfree webhook signature verification
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

// Routes
app.use('/api/expenses', expenseRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/commerce', commerceRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'vercel-zero-config' });
});

export default app;
