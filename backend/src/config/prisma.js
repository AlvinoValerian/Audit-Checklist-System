const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Handle BigInt serialization for Express res.json()
BigInt.prototype.toJSON = function () {
  const num = Number(this);
  return Number.isSafeInteger(num) ? num : this.toString();
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000, // Daftarkan koneksi idle mati setelah 30 detik agar selalu fresh
  connectionTimeoutMillis: 20000, // Batas waktu koneksi maksimal 20 detik untuk koneksi DB remote
  keepAlive: true, // Kirim TCP keepalive agar tidak diputus firewall/router
  keepAliveInitialDelayMillis: 10000,
});

// Tangani error koneksi tak terduga agar Express tidak freeze
pool.on('error', (err) => {
  console.warn('⚠️ [PostgreSQL Pool Auto-Recover]:', err.message);
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

module.exports = prisma;
