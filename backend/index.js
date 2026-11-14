const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.set('trust proxy', 1);

// HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(self)');
  res.setHeader('X-XSS-Protection', '0');
  next();
});

// Strict CORS Allowlist
const buildAllowedOrigins = () => {
  const list = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ];
  if (process.env.FRONTEND_URL) {
    list.push(process.env.FRONTEND_URL.trim());
  }
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((origin) => list.push(origin));
  }
  return new Set(list.map((u) => u.replace(/\/+$/, '')));
};

const allowedOrigins = buildAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      // Izinkan server-to-server requests (Next.js rewrites, curl, internal probes) tanpa Origin header
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/+$/, '');
      if (allowedOrigins.has(normalized)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'x-workspace-id',
      'x-store-id',
    ],
  })
);

// Bounded In-Memory Rate Limiter untuk proteksi endpoint sensitif (login, register, AI)
const createRateLimiter = ({ windowMs = 60000, max = 20, message = 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }) => {
  const hits = new Map();
  let lastCleanup = Date.now();

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastCleanup > windowMs || hits.size > 5000) {
      for (const [key, entry] of hits.entries()) {
        if (entry.resetAt <= now) {
          hits.delete(key);
        }
      }
      lastCleanup = now;
    }

    const clientIp = (req.ip || req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/, '');
    const current = hits.get(clientIp);
    if (!current || current.resetAt <= now) {
      hits.set(clientIp, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        status: 'error',
        code: 'RATE_LIMITED',
        message,
      });
    }

    return next();
  };
};

app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Rate limiters untuk endpoint autentikasi dan AI
app.use(
  '/api/auth/login',
  createRateLimiter({
    windowMs: 60 * 1000,
    max: 15,
    message: 'Terlalu banyak percobaan login. Silakan coba kembali dalam 1 menit.',
  })
);
app.use(
  '/api/auth/register',
  createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Terlalu banyak percobaan registrasi. Silakan coba kembali dalam 1 menit.',
  })
);
app.use(
  '/api/auth/refresh',
  createRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: 'Terlalu banyak permintaan pembaruan sesi. Silakan tunggu sebentar.',
  })
);
app.use(
  '/api/ai',
  createRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: 'Batas penggunaan AI sementara tercapai. Silakan coba kembali dalam 1 menit.',
  })
);

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
const attachmentRoutes = require('./src/routes/attachment.routes');
const realtimeRoutes = require('./src/routes/realtime.routes');
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
app.use('/api/attachments', attachmentRoutes);
app.use('/api/attachment', attachmentRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/events', realtimeRoutes);
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

// Global error handler agar stack trace tidak pernah bocor ke client
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      status: 'error',
      message: 'Format JSON pada request tidak valid.',
    });
  }
  console.error('❌ [Unhandled Express Error]:', err);
  return res.status(err?.status || 500).json({
    success: false,
    status: 'error',
    message: 'Terjadi kesalahan internal pada server.',
  });
});

// Start Server (Bind to 0.0.0.0 for public & tunnel connectivity)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server is running on port ${PORT}`);
});  
