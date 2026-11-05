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
      auth_register: 'http://localhost:5000/api/auth/register',
      auth_login: 'http://localhost:5000/api/auth/login',
      workspaces: 'http://localhost:5000/api/workspaces',
      admins: 'http://localhost:5000/api/admins',
      health: 'http://localhost:5000/api/health',
      ai_ask: 'http://localhost:5000/api/ai/ask'
    }
  });
};

app.get('/api', handleApiIndex);
app.get('/api/', handleApiIndex);

app.get('/', (req, res) => {
  res.send('API Audit Checklist System Running');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Backend server is running on http://localhost:${PORT}`);
});

