const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

const TEKNIS_INTERNAL_EMAIL = 'teknis.internal@auditcorp.system';
const MAX_TEKNIS_MANUAL_SUPER_ADMINS = 2;

const isTeknisUser = (user) =>
  Boolean(user && (user.role === 'Divisi Teknis' || user.role === 'Teknis'));

/**
 * Konversi string/angka menjadi BigInt secara aman tanpa melempar SyntaxError (HTTP 500)
 * @param {string|number|bigint|null|undefined} val
 * @param {string[]} prefixes - Prefix opsional yang dilepas sebelum parsing (misal ['sa-', 'ws-'])
 * @returns {bigint|null}
 */
const toBigIntSafe = (val, prefixes = []) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'bigint') return val;
  let str = String(val).trim();
  for (const prefix of prefixes) {
    if (str.startsWith(prefix)) {
      str = str.slice(prefix.length);
    }
  }
  if (!/^\d+$/.test(str)) return null;
  try {
    return BigInt(str);
  } catch {
    return null;
  }
};

let ensureSuperAdminColumnPromise = null;

/**
 * Self-healing: Pastikan kolom created_by_teknis tersedia pada tabel super_admin
 */
const ensureSuperAdminTeknisColumn = async () => {
  if (!ensureSuperAdminColumnPromise) {
    ensureSuperAdminColumnPromise = (async () => {
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE super_admin ADD COLUMN IF NOT EXISTS created_by_teknis BOOLEAN DEFAULT FALSE;
        `);
      } catch (err) {
        ensureSuperAdminColumnPromise = null;
        console.warn('⚠️ [ensureSuperAdminTeknisColumn]:', err.message);
      }
    })();
  }
  return ensureSuperAdminColumnPromise;
};

/**
 * Mendapatkan atau menginisialisasi akun Super Admin internal khusus Divisi Teknis
 * (teknis.internal@auditcorp.system)
 */
const getOrCreateTeknisInternalSuperAdmin = async () => {
  let systemSa = await prisma.super_admin.findFirst({
    where: { email: TEKNIS_INTERNAL_EMAIL },
  });

  if (!systemSa) {
    const randomPassword = crypto.randomBytes(24).toString('hex');
    const hashed = await bcrypt.hash(randomPassword, 10);
    systemSa = await prisma.super_admin.create({
      data: {
        name: 'System Divisi Teknis',
        email: TEKNIS_INTERNAL_EMAIL,
        phone_number: '081100000000',
        company_name: 'Divisi Teknis Internal',
        password: hashed,
      },
    });
  }

  return systemSa;
};

/**
 * Filter Prisma `where` untuk Opsi A:
 * Workspace yang tampak & dapat dikelola Divisi Teknis tersinkronisasi dengan
 * Super Admin internal Teknis (teknis.internal@auditcorp.system) + Sandbox Testing,
 * tetap terisolasi dari tenant/klien umum.
 */
const getTeknisWorkspaceWhere = async () => {
  const systemSa = await getOrCreateTeknisInternalSuperAdmin();
  return {
    OR: [
      { super_admin_id: systemSa.super_admin_id },
      { category: 'Sandbox Testing' },
      { company_name: { contains: 'Divisi Teknis', mode: 'insensitive' } },
    ],
  };
};

/**
 * Memeriksa apakah workspace tertentu masuk dalam lingkup Opsi A Divisi Teknis
 */
const isWorkspaceInTeknisScope = async (workspaceId) => {
  const cleanWsId = toBigIntSafe(workspaceId, ['ws-']);
  if (!cleanWsId) return false;

  const teknisWhere = await getTeknisWorkspaceWhere();
  const matched = await prisma.workspace.findFirst({
    where: {
      AND: [{ workspace_id: cleanWsId }, teknisWhere],
    },
    select: { workspace_id: true },
  });

  return Boolean(matched);
};

/**
 * Resolusi target workspaceId untuk user Divisi Teknis (Opsi A):
 * Jika user memilih / masuk ke salah satu workspace milik Teknis, izinkan akses ke workspace tersebut.
 * Jika requestedWsId menunjuk tenant di luar lingkup Teknis, tolak & fallback ke sandbox Teknis.
 */
const resolveTeknisTargetWorkspaceId = async (requestedWsId, fallbackWsId) => {
  if (requestedWsId && requestedWsId !== 'all') {
    const cleanReqWsId = toBigIntSafe(requestedWsId, ['ws-']);
    if (cleanReqWsId && (await isWorkspaceInTeknisScope(cleanReqWsId))) {
      return cleanReqWsId;
    }
  }

  const cleanFallback = toBigIntSafe(fallbackWsId, ['ws-']);
  if (cleanFallback && (await isWorkspaceInTeknisScope(cleanFallback))) {
    return cleanFallback;
  }

  const teknisWhere = await getTeknisWorkspaceWhere();
  const defaultWs = await prisma.workspace.findFirst({
    where: teknisWhere,
    orderBy: { workspace_id: 'asc' },
    select: { workspace_id: true },
  });

  return defaultWs ? defaultWs.workspace_id : cleanFallback;
};

/**
 * Mengambil daftar ID Super Admin yang dibuat manual dari menu Kelola Admin Divisi Teknis
 */
const getTeknisManualSuperAdminIdSet = async () => {
  await ensureSuperAdminTeknisColumn();
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT super_admin_id FROM super_admin WHERE created_by_teknis = TRUE
    `);
    return new Set(
      (rows || [])
        .map((r) => (r.super_admin_id != null ? r.super_admin_id.toString() : null))
        .filter(Boolean)
    );
  } catch (err) {
    console.warn('⚠️ [getTeknisManualSuperAdminIdSet]:', err.message);
    return new Set();
  }
};

module.exports = {
  TEKNIS_INTERNAL_EMAIL,
  MAX_TEKNIS_MANUAL_SUPER_ADMINS,
  isTeknisUser,
  toBigIntSafe,
  ensureSuperAdminTeknisColumn,
  getOrCreateTeknisInternalSuperAdmin,
  getTeknisWorkspaceWhere,
  isWorkspaceInTeknisScope,
  resolveTeknisTargetWorkspaceId,
  getTeknisManualSuperAdminIdSet,
};
