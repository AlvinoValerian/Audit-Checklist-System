const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const AUTH_COOKIE_NAME = 'audit_pro_token';
const getJwtSecret = () =>
  process.env.JWT_SECRET || 'audit_checklist_system_jwt_secret_key_2024';

const getStaffExtras = async (staffId) => {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT position, deleted_at, COALESCE(token_version, 0) AS token_version FROM staff WHERE staff_id = $1 LIMIT 1`,
      staffId
    );
    return rows && rows[0] ? rows[0] : {};
  } catch (e) {
    return {};
  }
};

let tokenVersionColumnsEnsured = false;
let tokenVersionColumnsEnsuringPromise = null;

/**
 * Self-healing: Pastikan kolom token_version tersedia di tabel super_admin, admin, staff
 * Dijalankan sekali saat bootstrap server agar tidak mengakibatkan AccessExclusiveLock
 * di PostgreSQL pada setiap request masuk.
 */
const ensureTokenVersionColumns = async () => {
  if (tokenVersionColumnsEnsured) return;
  if (tokenVersionColumnsEnsuringPromise) return tokenVersionColumnsEnsuringPromise;

  tokenVersionColumnsEnsuringPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE super_admin ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE admin ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;
      `);
      tokenVersionColumnsEnsured = true;
    } catch (err) {
      console.warn('⚠️ [ensureTokenVersionColumns]:', err.message);
    } finally {
      tokenVersionColumnsEnsuringPromise = null;
    }
  })();

  return tokenVersionColumnsEnsuringPromise;
};

const getRecordTokenVersion = async (tableName, pkCol, pkVal) => {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(token_version, 0) AS token_version FROM ${tableName} WHERE ${pkCol} = $1 LIMIT 1`,
      pkVal
    );
    if (rows && rows.length > 0 && rows[0].token_version !== undefined) {
      return Number(rows[0].token_version);
    }
    return 0;
  } catch (err) {
    console.warn(`⚠️ [getRecordTokenVersion] Gagal membaca token_version ${tableName}:`, err.message);
    return null; // Return null agar transient database error tidak memicu pencabutan palsu
  }
};

const bumpTokenVersion = async (user) => {
  if (!user || !user.rawId || !/^\d+$/.test(String(user.rawId))) return;
  await ensureTokenVersionColumns();
  const idBigInt = BigInt(user.rawId);
  const roleLower = String(user.role || '').toLowerCase();

  try {
    if (roleLower === 'super admin') {
      await prisma.$executeRawUnsafe(
        `UPDATE super_admin SET token_version = COALESCE(token_version, 0) + 1 WHERE super_admin_id = $1`,
        idBigInt
      );
    } else if (roleLower === 'staff' || roleLower === 'auditor lapangan') {
      await prisma.$executeRawUnsafe(
        `UPDATE staff SET token_version = COALESCE(token_version, 0) + 1 WHERE staff_id = $1`,
        idBigInt
      );
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE admin SET token_version = COALESCE(token_version, 0) + 1 WHERE admin_id = $1`,
        idBigInt
      );
    }
  } catch (err) {
    console.warn('⚠️ [bumpTokenVersion]:', err.message);
  }
};

/**
 * Ekstrak token mentah secara ketat hanya dari Authorization Bearer header atau HttpOnly cookie
 */
const extractRawToken = (req) => {
  const authHeader = req.headers?.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer && bearer !== 'null' && bearer !== 'undefined') {
      return bearer;
    }
  }

  if (req.cookies && typeof req.cookies[AUTH_COOKIE_NAME] === 'string') {
    const cookieToken = req.cookies[AUTH_COOKIE_NAME].trim();
    if (cookieToken) return cookieToken;
  }

  if (req.query && typeof req.query.token === 'string') {
    const queryToken = req.query.token.trim();
    if (queryToken && queryToken !== 'null' && queryToken !== 'undefined') {
      return queryToken;
    }
  }

  return null;
};

/**
 * Ekstraksi & verifikasi ketat identitas user dari JWT + status aktif & token_version database.
 * TIDAK PERNAH mempercayai header x-user-role, x-user-id, x-super-admin-id, atau query/body spoofing.
 */
const extractUser = async (req) => {
  if (req && req._verifiedUserResolved) {
    return req.user || null;
  }

  const token = extractRawToken(req);
  if (!token) {
    if (req) {
      req._verifiedUserResolved = true;
      req._authError = 'MISSING_TOKEN';
      req.user = null;
    }
    return null;
  }

  let decoded = null;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (err) {
    if (req) {
      req._verifiedUserResolved = true;
      req._authError = err?.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      req.user = null;
    }
    return null;
  }

  if (!decoded || !decoded.id) {
    if (req) {
      req._verifiedUserResolved = true;
      req._authError = 'INVALID_TOKEN_PAYLOAD';
      req.user = null;
    }
    return null;
  }

  const tokenRole = String(decoded.role || '').trim();
  const rawIdCandidate = decoded.rawId
    ? String(decoded.rawId)
    : String(decoded.id).replace(/^(sa-|adm-|staff-|tek-)/, '').trim();

  if (!/^\d+$/.test(rawIdCandidate)) {
    if (req) {
      req._verifiedUserResolved = true;
      req._authError = 'INVALID_USER_ID';
      req.user = null;
    }
    return null;
  }

  const idBigInt = BigInt(rawIdCandidate);
  const tokenVersion = typeof decoded.tv === 'number' ? decoded.tv : null;
  let verifiedUser = null;

  try {
    if (tokenRole === 'Super Admin' || String(decoded.id).startsWith('sa-')) {
      const saRows = await prisma.$queryRawUnsafe(
        `SELECT super_admin_id, name, email, phone_number, company_name, COALESCE(token_version, 0) AS token_version
         FROM super_admin WHERE super_admin_id = $1 LIMIT 1`,
        idBigInt
      );
      const sa = saRows && saRows[0] ? saRows[0] : null;

      if (!sa) {
        if (req) req._authError = 'USER_NOT_FOUND';
      } else {
        const dbTv = Number(sa.token_version ?? 0);
        // Token revocation: hanya batalkan jika tokenVersion lebih kecil dari dbTv (sesi dicabut via logout sebelumnya)
        if (tokenVersion !== null && tokenVersion < dbTv) {
          if (req) req._authError = 'TOKEN_REVOKED';
        } else {
          verifiedUser = {
            rawId: sa.super_admin_id.toString(),
            id: `sa-${sa.super_admin_id.toString()}`,
            role: 'Super Admin',
            email: sa.email,
            fullName: sa.name,
            companyName: sa.company_name || '',
            tokenVersion: dbTv,
          };
        }
      }
    } else if (
      tokenRole === 'Staff' ||
      tokenRole === 'Auditor Lapangan' ||
      String(decoded.id).startsWith('staff-')
    ) {
      const stRows = await prisma.$queryRawUnsafe(
        `SELECT s.staff_id, s.name, s.email, s.phone_number, s.status, s.store_id, s.position, s.deleted_at,
                COALESCE(s.token_version, 0) AS token_version,
                st.store_name, st.address, st.city, st.workspace_id
         FROM staff s
         LEFT JOIN store st ON s.store_id = st.store_id
         WHERE s.staff_id = $1 LIMIT 1`,
        idBigInt
      );
      const st = stRows && stRows[0] ? stRows[0] : null;

      if (!st) {
        if (req) req._authError = 'USER_NOT_FOUND';
      } else {
        const stStatus = String(st.status || '').toLowerCase();
        if (stStatus === 'inactive' || stStatus === 'nonaktif' || st.deleted_at) {
          if (req) req._authError = 'ACCOUNT_INACTIVE';
        } else {
          const dbTv = Number(st.token_version ?? 0);
          if (tokenVersion !== null && tokenVersion < dbTv) {
            if (req) req._authError = 'TOKEN_REVOKED';
          } else {
            verifiedUser = {
              rawId: st.staff_id.toString(),
              id: `staff-${st.staff_id.toString()}`,
              role: 'Staff',
              position: st.position || 'Auditor Lapangan',
              email: st.email,
              fullName: st.name,
              status: st.status,
              deletedAt: st.deleted_at || null,
              storeId: st.store_id ? st.store_id.toString() : null,
              storeName: st.store_name || null,
              storeLocation: st.address || st.city || 'Cabang',
              storeCode: st.store_id ? `ST-${st.store_id.toString()}` : 'ST-01',
              workspaceId: st.workspace_id ? st.workspace_id.toString() : '',
              tokenVersion: dbTv,
            };
          }
        }
      }
    } else {
      const admRows = await prisma.$queryRawUnsafe(
        `SELECT admin_id, name, email, role, status, deleted_at, workspace_id,
                COALESCE(token_version, 0) AS token_version
         FROM admin WHERE admin_id = $1 LIMIT 1`,
        idBigInt
      );
      const adm = admRows && admRows[0] ? admRows[0] : null;

      if (!adm) {
        if (req) req._authError = 'USER_NOT_FOUND';
      } else {
        const admStatus = String(adm.status || '').toLowerCase();
        if (admStatus === 'inactive' || admStatus === 'nonaktif' || adm.deleted_at) {
          if (req) req._authError = 'ACCOUNT_INACTIVE';
        } else {
          const dbTv = Number(adm.token_version ?? 0);
          if (tokenVersion !== null && tokenVersion < dbTv) {
            if (req) req._authError = 'TOKEN_REVOKED';
          } else {
            verifiedUser = {
              rawId: adm.admin_id.toString(),
              id: `adm-${adm.admin_id.toString()}`,
              role: adm.role || tokenRole || 'Admin',
              email: adm.email,
              fullName: adm.name,
              status: adm.status,
              workspaceId: adm.workspace_id ? adm.workspace_id.toString() : '',
              tokenVersion: dbTv,
            };
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ [extractUser] Database check error:', err.message);
    if (req) req._authError = 'AUTH_VERIFICATION_FAILED';
    verifiedUser = null;
  }

  if (req) {
    req._verifiedUserResolved = true;
    req.user = verifiedUser;
  }

  return verifiedUser;
};

/**
 * Express middleware: Mewajibkan sesi autentikasi JWT/Cookie yang sah & masih aktif.
 */
const requireAuth = async (req, res, next) => {
  const user = await extractUser(req);
  if (!user) {
    if (req._authError === 'ACCOUNT_INACTIVE') {
      res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
      return res.status(403).json({
        success: false,
        status: 'error',
        code: 'ACCOUNT_INACTIVE',
        message: 'Akun Anda berstatus Nonaktif atau telah dinonaktifkan. Hubungi administrator.',
      });
    }

    if (req._authError === 'AUTH_VERIFICATION_FAILED') {
      return res.status(503).json({
        success: false,
        status: 'error',
        code: 'SERVICE_UNAVAILABLE',
        message: 'Layanan verifikasi sesi sementara tidak dapat menghubungi database. Silakan coba kembali.',
      });
    }

    return res.status(401).json({
      success: false,
      status: 'error',
      code: req._authError || 'UNAUTHORIZED',
      message: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.',
    });
  }

  return next();
};

/**
 * Express middleware factory: Mewajibkan peran user termasuk dalam daftar allowedRoles.
 * Otomatis memverifikasi autentikasi terlebih dahulu jika requireAuth belum dijalankan.
 */
const requireRole = (...allowedRoles) => {
  const normalizedAllowed = new Set(allowedRoles.map((r) => String(r).trim().toLowerCase()));

  return async (req, res, next) => {
    const user = req.user || (await extractUser(req));
    if (!user) {
      if (req._authError === 'ACCOUNT_INACTIVE') {
        res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
        return res.status(403).json({
          success: false,
          status: 'error',
          code: 'ACCOUNT_INACTIVE',
          message: 'Akun Anda berstatus Nonaktif atau telah dinonaktifkan.',
        });
      }

      if (req._authError === 'AUTH_VERIFICATION_FAILED') {
        return res.status(503).json({
          success: false,
          status: 'error',
          code: 'SERVICE_UNAVAILABLE',
          message: 'Layanan verifikasi sesi sementara tidak dapat menghubungi database. Silakan coba kembali.',
        });
      }

      return res.status(401).json({
        success: false,
        status: 'error',
        code: req._authError || 'UNAUTHORIZED',
        message: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.',
      });
    }

    const roleNormalized = String(user.role || '').trim().toLowerCase();
    // Samakan Auditor Lapangan dengan Staff saat mengecek role Staff, jika 'Staff' ada di allowedRoles
    const effectiveMatch =
      normalizedAllowed.has(roleNormalized) ||
      (roleNormalized === 'auditor lapangan' && normalizedAllowed.has('staff'));

    if (!effectiveMatch) {
      return res.status(403).json({
        success: false,
        status: 'error',
        code: 'FORBIDDEN_ROLE',
        message: 'Akses ditolak: Anda tidak memiliki izin untuk mengakses fitur atau resource ini.',
      });
    }

    return next();
  };
};

module.exports = {
  AUTH_COOKIE_NAME,
  getJwtSecret,
  ensureTokenVersionColumns,
  getRecordTokenVersion,
  bumpTokenVersion,
  extractUser,
  requireAuth,
  requireRole,
};
