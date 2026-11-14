const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
    'x-super-admin-id',
    'x-user-id',
    'x-user-email',
    'x-user-role',
    'x-workspace-id',
  ],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Routes
const authRoutes = require('./src/routes/auth.routes');
const aiRoutes = require('./src/routes/ai.routes');
const workspaceRoutes = require('./src/routes/workspace.routes');
const adminRoutes = require('./src/routes/admin.routes');
const storeRoutes = require('./src/routes/store.routes');
const cryptoRoutes = require('./src/routes/crypto.routes');
const templateRoutes = require('./src/routes/template.routes');
const scheduleRoutes = require('./src/routes/schedule.routes');
const holidayRoutes = require('./src/routes/holiday.routes');
const staffRoutes = require('./src/routes/staff.routes');
const teknisRoutes = require('./src/routes/teknis.routes');
const galleryRoutes = require('./src/routes/gallery.routes');
const reportRoutes = require('./src/routes/report.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const sparkpayRoutes = require('./src/routes/sparkpay.routes');

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/template', templateRoutes);
app.use('/api/checklist-templates', templateRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/holiday', holidayRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/staffs', staffRoutes);
app.use('/api/teknis', teknisRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/galeri', galleryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/laporan', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/monitoring', dashboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api', paymentRoutes);

// SparkPay Gateway (Snap.js Sandbox & Webhooks)
app.use('/api', sparkpayRoutes);
app.use('/api/sparkpay', sparkpayRoutes);

// Base Route / Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Backend API is healthy and running!',
    timestamp: new Date().toISOString()
  });
});

// API Index Directory
const handleApiIndex = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Audit Checklist System API Directory',
    available_endpoints: {
      auth_register: '/api/auth/register',
      auth_login: '/api/auth/login',
      workspaces: '/api/workspaces',
      admins: '/api/admins',
      health: '/api/health',
      payment_links: '/api/payment-links',
      payment_callback: '/api/payment-callback',
      ai_ask: '/api/ai/ask'
    }
  });
};

app.get('/api', handleApiIndex);
app.get('/api/', handleApiIndex);

app.get('/', (req, res) => {
  res.send('API Audit Checklist System Running');
});

// Start Server (Bind to 0.0.0.0 for public & tunnel connectivity)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server is running on port ${PORT}`);
});
