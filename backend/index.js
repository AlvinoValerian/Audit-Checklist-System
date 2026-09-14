const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Base Route / Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Backend API is healthy and running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.send('API Audit Checklist System Running');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Backend server is running on http://localhost:${PORT}`);
});
