const prisma = require('../config/prisma');

/**
 * Mengecek apakah alamat email sudah digunakan di salah satu dari 3 tabel akun sistem:
 * super_admin, admin (Admin & Divisi Teknis), atau staff.
 *
 * @param {string} email
 * @param {{ superAdminId?: bigint | number | string | null, adminId?: bigint | number | string | null, staffId?: bigint | number | string | null }} [exclude]
 * @returns {Promise<{ table: 'super_admin' | 'admin' | 'staff', role: string, email: string } | null>}
 */
const findEmailConflict = async (email, exclude = {}) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  const [saConflict, adminConflict, staffConflict] = await Promise.all([
    prisma.super_admin.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        ...(exclude.superAdminId != null
          ? { NOT: { super_admin_id: BigInt(exclude.superAdminId) } }
          : {}),
      },
      select: { super_admin_id: true, email: true },
    }),
    prisma.admin.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        ...(exclude.adminId != null
          ? { NOT: { admin_id: BigInt(exclude.adminId) } }
          : {}),
      },
      select: { admin_id: true, email: true, role: true },
    }),
    prisma.staff.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        ...(exclude.staffId != null
          ? { NOT: { staff_id: BigInt(exclude.staffId) } }
          : {}),
      },
      select: { staff_id: true, email: true },
    }),
  ]);

  if (saConflict) {
    return {
      table: 'super_admin',
      role: 'Super Admin',
      email: saConflict.email,
    };
  }

  if (adminConflict) {
    return {
      table: 'admin',
      role: adminConflict.role || 'Admin',
      email: adminConflict.email,
    };
  }

  if (staffConflict) {
    return {
      table: 'staff',
      role: 'Staff',
      email: staffConflict.email,
    };
  }

  return null;
};

module.exports = {
  findEmailConflict,
};
