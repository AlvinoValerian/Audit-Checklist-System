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
  const roleHeader = req.headers['x-user-role'];
  const saHeader = req.headers['x-super-admin-id'] || req.query.superAdminId || req.body?.superAdminId;
  const rawUserId = req.headers['x-user-id'];

  if (!user && (roleHeader === 'Staff' || (rawUserId && rawUserId.toString().startsWith('staff-')))) {
    const cleanId = (rawUserId || '').toString().replace(/^staff-/, '');
    user = {
      rawId: cleanId,
      id: `staff-${cleanId}`,
      role: 'Staff',
    };
  } else if (!user && saHeader) {
    const cleanId = saHeader.toString().replace(/^sa-/, '');
    user = {
      rawId: cleanId,
      id: `sa-${cleanId}`,
      role: 'Super Admin',
    };
  } else if (!user && rawUserId) {
    const str = rawUserId.toString();
    if (str.startsWith('staff-')) {
      const cleanId = str.replace(/^staff-/, '');
      user = {
        rawId: cleanId,
        id: `staff-${cleanId}`,
        role: 'Staff',
      };
    } else if (str.startsWith('adm-')) {
      const cleanId = str.replace(/^adm-/, '');
      user = {
        rawId: cleanId,
        id: `adm-${cleanId}`,
        role: 'Admin',
      };
    } else if (str.startsWith('sa-')) {
      const cleanId = str.replace(/^sa-/, '');
      user = {
        rawId: cleanId,
        id: `sa-${cleanId}`,
        role: 'Super Admin',
      };
    }
  }

  // 3. Fallback jika ada email (dari token atau request header/query)
  const candidateEmail =
    user?.email ||
    req.headers['x-user-email'] ||
    req.query.email;

  if (candidateEmail || (user && user.role === 'Staff')) {
    const cleanEmail = candidateEmail ? candidateEmail.trim().toLowerCase() : '';
    try {
      // Prioritaskan Staf jika user sudah teridentifikasi sebagai Staff atau ada header staff
      if (roleHeader === 'Staff' || (user && user.role === 'Staff')) {
        let st = null;
        if (cleanEmail) {
          st = await prisma.staff.findUnique({
            where: { email: cleanEmail },
            include: { store: true },
          });
        }
        if (!st && user?.rawId && !isNaN(Number(user.rawId))) {
          st = await prisma.staff.findUnique({
            where: { staff_id: BigInt(user.rawId) },
            include: { store: true },
          });
        }
        if (st) {
          user = {
            ...(user || {}),
            rawId: st.staff_id.toString(),
            id: `staff-${st.staff_id.toString()}`,
            role: 'Staff',
            email: st.email,
            fullName: st.name,
            storeId: st.store_id ? st.store_id.toString() : null,
            storeName: st.store ? st.store.store_name : null,
            storeLocation: st.store ? (st.store.address || st.store.city || 'Cabang') : 'Cabang',
            storeCode: st.store ? `ST-${st.store.store_id.toString()}` : 'ST-01',
            workspaceId: st.store?.workspace_id?.toString() || '',
          };
          return user;
        }
      }

      if (cleanEmail) {
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
          } else {
            const st = await prisma.staff.findUnique({
              where: { email: cleanEmail },
              include: { store: true },
            });
            if (st) {
              user = {
                ...(user || {}),
                rawId: st.staff_id.toString(),
                id: `staff-${st.staff_id.toString()}`,
                role: 'Staff',
                email: st.email,
                fullName: st.name,
                storeId: st.store_id ? st.store_id.toString() : null,
                storeName: st.store ? st.store.store_name : null,
                storeLocation: st.store ? (st.store.address || st.store.city || 'Cabang') : 'Cabang',
                storeCode: st.store ? `ST-${st.store.store_id.toString()}` : 'ST-01',
                workspaceId: st.store?.workspace_id?.toString() || '',
              };
            }
          }
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
