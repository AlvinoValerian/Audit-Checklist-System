const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'audit_checklist_system_jwt_secret_key_2024';

/**
 * Ekstraksi informasi user dari request (Bearer Token, Header khusus, atau Query/Body)
 * Mendukung resolusi cerdas berdasarkan Token, ID, maupun Email
 */
const extractUser = async (req) => {
  let user = null;

  // 1. Ekstraksi dari Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      user = decoded;
    } catch (err) {
      // Token expired atau invalid
    }
  }

  // 2. Fallback jika token tidak dikirim: cari dari custom header atau query/body
  const fallbackId =
    req.headers['x-super-admin-id'] ||
    req.headers['x-user-id'] ||
    req.query.superAdminId ||
    req.body?.superAdminId;

  if (!user && fallbackId && !fallbackId.toString().startsWith('adm-')) {
    const cleanId = fallbackId.toString().replace(/^sa-/, '');
    user = {
      rawId: cleanId,
      id: `sa-${cleanId}`,
      role: 'Super Admin',
    };
  }

  // 3. Fallback jika ada email (dari token atau request header/query)
  const candidateEmail =
    user?.email ||
    req.headers['x-user-email'] ||
    req.query.email;

  if (candidateEmail) {
    const cleanEmail = candidateEmail.trim().toLowerCase();
    try {
      const sa = await prisma.super_admin.findUnique({
        where: { email: cleanEmail },
      });
      if (sa) {
        user = {
          ...(user || {}),
          rawId: sa.super_admin_id.toString(),
          id: `sa-${sa.super_admin_id.toString()}`,
          role: 'Super Admin',
          email: sa.email,
          fullName: sa.name,
        };
      } else {
        const adm = await prisma.admin.findUnique({
          where: { email: cleanEmail },
        });
        if (adm) {
          let admRole = user?.role || 'Admin';
          try {
            const roleRes = await prisma.$queryRaw`SELECT role FROM admin WHERE admin_id = ${adm.admin_id} LIMIT 1`;
            if (roleRes && roleRes[0]?.role) {
              admRole = roleRes[0].role;
            }
          } catch (e) {}

          user = {
            ...(user || {}),
            rawId: adm.admin_id.toString(),
            id: `adm-${adm.admin_id.toString()}`,
            role: admRole,
            email: adm.email,
            fullName: adm.name,
            workspaceId: adm.workspace_id.toString(),
          };
        }
      }
    } catch (err) {
      // Abaikan jika database query gagal di middleware
    }
  }

  // 4. Pastikan rawId bersih dari prefix 'sa-'
  if (user && user.id && !user.rawId) {
    user.rawId = user.id.toString().replace(/^sa-/, '');
  }

  return user;
};

module.exports = {
  extractUser,
};
