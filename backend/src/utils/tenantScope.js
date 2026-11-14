const prisma = require('../config/prisma');
const {
  isTeknisUser,
  toBigIntSafe,
  getTeknisWorkspaceWhere,
  isWorkspaceInTeknisScope,
  resolveTeknisTargetWorkspaceId,
} = require('./teknisScope');

const normalizeRoleName = (role) => String(role || '').trim().toLowerCase();

const isTeknisRole = (user) => isTeknisUser(user);

const isSuperAdminRole = (user) => normalizeRoleName(user?.role) === 'super admin';

const isAdminRole = (user) => {
  const r = normalizeRoleName(user?.role);
  return r === 'admin' || r === 'area admin';
};

const isStaffRole = (user) => {
  const r = normalizeRoleName(user?.role);
  return r === 'staff' || r === 'auditor lapangan' || r.includes('staff') || r.includes('auditor');
};

/**
 * Mengembalikan respons error terstandar tanpa membocorkan detail internal / stack SQL pada error 500
 */
const sendSafeError = (res, err, publicMessage = 'Terjadi kesalahan internal pada server.', statusCode = 500) => {
  console.error('❌ [API Error]:', err);

  if (err && err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      status: 'error',
      message: 'Data dengan identitas/nilai unik tersebut sudah terdaftar di sistem.',
    });
  }

  return res.status(statusCode).json({
    success: false,
    status: 'error',
    message: publicMessage,
  });
};

/**
 * Memastikan user yang terautentikasi berhak mengakses workspace target tertentu.
 * Menghasilkan { ok: true, workspaceId, workspace } atau { ok: false, status, message }.
 */
const assertWorkspaceAccess = async (user, targetWorkspaceId) => {
  if (!user) {
    return { ok: false, status: 401, message: 'Autentikasi diperlukan.' };
  }

  const cleanWsId = toBigIntSafe(targetWorkspaceId, ['ws-']);
  if (!cleanWsId) {
    return { ok: false, status: 400, message: 'Workspace ID tidak valid.' };
  }

  if (isTeknisRole(user)) {
    const ws = await prisma.workspace.findUnique({
      where: { workspace_id: cleanWsId },
      select: { workspace_id: true, super_admin_id: true, company_name: true, status: true, category: true },
    });
    if (!ws) {
      return { ok: false, status: 404, message: 'Workspace tidak ditemukan.' };
    }
    const allowed = await isWorkspaceInTeknisScope(cleanWsId);
    if (!allowed) {
      return {
        ok: false,
        status: 403,
        message: 'Akses ditolak: Divisi Teknis hanya dapat mengakses workspace di lingkungan Sandbox Teknis.',
      };
    }
    return { ok: true, workspaceId: cleanWsId, workspace: ws };
  }

  const ws = await prisma.workspace.findUnique({
    where: { workspace_id: cleanWsId },
    select: { workspace_id: true, super_admin_id: true, company_name: true, status: true, category: true },
  });

  if (!ws) {
    return { ok: false, status: 404, message: 'Workspace tidak ditemukan.' };
  }

  if (isSuperAdminRole(user)) {
    const saId = toBigIntSafe(user.rawId, ['sa-']);
    if (!saId || ws.super_admin_id !== saId) {
      return { ok: false, status: 403, message: 'Anda tidak memiliki hak akses ke workspace ini.' };
    }
    return { ok: true, workspaceId: cleanWsId, workspace: ws };
  }

  if (isAdminRole(user) || isStaffRole(user)) {
    const ownWsId = toBigIntSafe(user.workspaceId, ['ws-']);
    if (!ownWsId || ownWsId !== cleanWsId) {
      return { ok: false, status: 403, message: 'Anda tidak memiliki hak akses ke workspace lain.' };
    }
    return { ok: true, workspaceId: cleanWsId, workspace: ws };
  }

  return { ok: false, status: 403, message: 'Peran pengguna tidak memiliki otorisasi workspace.' };
};

/**
 * Resolusi filter workspace aman untuk query list/monitoring/stats berdasarkan peran user & requestedWsId opsional.
 * Tidak pernah mengizinkan lintas-tenant maupun fallback global ke tenant lain.
 */
const resolveScopedWorkspaceContext = async (user, requestedWsId, options = {}) => {
  const { teknisUseSingleDefaultOnAll = false } = options;

  if (!user) {
    return { ok: false, status: 401, message: 'Autentikasi diperlukan.' };
  }

  const hasSpecificWs = requestedWsId !== undefined && requestedWsId !== null && String(requestedWsId).trim() !== '' && String(requestedWsId).trim() !== 'all';

  if (isTeknisRole(user)) {
    if (hasSpecificWs) {
      const check = await assertWorkspaceAccess(user, requestedWsId);
      if (!check.ok) return check;
      return {
        ok: true,
        targetWorkspaceId: check.workspaceId,
        workspaceIds: [check.workspaceId],
        prismaWorkspaceWhere: { workspace_id: check.workspaceId },
      };
    }

    const teknisWhere = await getTeknisWorkspaceWhere();
    if (teknisUseSingleDefaultOnAll) {
      const resolvedWs = await resolveTeknisTargetWorkspaceId('all', user.workspaceId);
      return {
        ok: true,
        targetWorkspaceId: resolvedWs || null,
        workspaceIds: resolvedWs ? [resolvedWs] : [],
        prismaWorkspaceWhere: resolvedWs ? { workspace_id: resolvedWs } : teknisWhere,
      };
    }

    const wsRows = await prisma.workspace.findMany({
      where: teknisWhere,
      select: { workspace_id: true },
      orderBy: { workspace_id: 'asc' },
    });
    const workspaceIds = wsRows.map((w) => w.workspace_id);
    return {
      ok: true,
      targetWorkspaceId: workspaceIds[0] || null,
      workspaceIds,
      prismaWorkspaceWhere: teknisWhere,
    };
  }

  if (isSuperAdminRole(user)) {
    const saId = toBigIntSafe(user.rawId, ['sa-']);
    if (!saId) {
      return { ok: false, status: 403, message: 'Identitas Super Admin tidak valid.' };
    }

    if (hasSpecificWs) {
      const check = await assertWorkspaceAccess(user, requestedWsId);
      if (!check.ok) return check;
      return {
        ok: true,
        targetWorkspaceId: check.workspaceId,
        workspaceIds: [check.workspaceId],
        prismaWorkspaceWhere: { workspace_id: check.workspaceId },
      };
    }

    const wsRows = await prisma.workspace.findMany({
      where: { super_admin_id: saId },
      select: { workspace_id: true },
      orderBy: { workspace_id: 'asc' },
    });
    const workspaceIds = wsRows.map((w) => w.workspace_id);
    return {
      ok: true,
      targetWorkspaceId: workspaceIds[0] || null,
      workspaceIds,
      prismaWorkspaceWhere: { super_admin_id: saId },
    };
  }

  if (isAdminRole(user)) {
    const ownWsId = toBigIntSafe(user.workspaceId, ['ws-']);
    if (!ownWsId) {
      return { ok: false, status: 403, message: 'Akun Admin belum terhubung ke workspace mana pun.' };
    }

    if (hasSpecificWs) {
      const cleanReq = toBigIntSafe(requestedWsId, ['ws-']);
      if (!cleanReq || cleanReq !== ownWsId) {
        return { ok: false, status: 403, message: 'Akses ditolak: Admin hanya dapat mengakses workspace miliknya.' };
      }
    }

    return {
      ok: true,
      targetWorkspaceId: ownWsId,
      workspaceIds: [ownWsId],
      prismaWorkspaceWhere: { workspace_id: ownWsId },
    };
  }

  if (isStaffRole(user)) {
    const ownWsId = toBigIntSafe(user.workspaceId, ['ws-']);
    if (!ownWsId) {
      return { ok: false, status: 403, message: 'Akun Staff belum terhubung ke workspace.' };
    }
    if (hasSpecificWs) {
      const cleanReq = toBigIntSafe(requestedWsId, ['ws-']);
      if (!cleanReq || cleanReq !== ownWsId) {
        return { ok: false, status: 403, message: 'Akses ditolak.' };
      }
    }
    return {
      ok: true,
      targetWorkspaceId: ownWsId,
      workspaceIds: [ownWsId],
      prismaWorkspaceWhere: { workspace_id: ownWsId },
    };
  }

  return { ok: false, status: 403, message: 'Akses tidak diizinkan.' };
};

/**
 * Memastikan user yang terautentikasi berhak mengakses toko target (termasuk isolasi Staff hanya ke tokonya)
 */
const assertStoreAccess = async (user, targetStoreId) => {
  if (!user) {
    return { ok: false, status: 401, message: 'Autentikasi diperlukan.' };
  }

  const cleanStoreId = toBigIntSafe(targetStoreId, ['st-', 'toko-', 'str-']);
  if (!cleanStoreId) {
    return { ok: false, status: 400, message: 'Store ID tidak valid.' };
  }

  const store = await prisma.store.findUnique({
    where: { store_id: cleanStoreId },
    include: {
      workspace: {
        select: { workspace_id: true, super_admin_id: true, company_name: true, status: true, category: true },
      },
    },
  });

  if (!store) {
    return { ok: false, status: 404, message: 'Toko tidak ditemukan.' };
  }

  if (isStaffRole(user)) {
    const ownStoreId = toBigIntSafe(user.storeId, ['st-', 'toko-', 'str-']);
    if (!ownStoreId || ownStoreId !== store.store_id) {
      return { ok: false, status: 403, message: 'Staff hanya diperbolehkan mengakses data tokonya sendiri.' };
    }
    return { ok: true, storeId: store.store_id, store };
  }

  const wsCheck = await assertWorkspaceAccess(user, store.workspace_id);
  if (!wsCheck.ok) {
    return { ok: false, status: wsCheck.status, message: 'Anda tidak memiliki hak akses ke toko di workspace ini.' };
  }

  return { ok: true, storeId: store.store_id, store };
};

module.exports = {
  normalizeRoleName,
  isTeknisRole,
  isSuperAdminRole,
  isAdminRole,
  isStaffRole,
  sendSafeError,
  assertWorkspaceAccess,
  resolveScopedWorkspaceContext,
  assertStoreAccess,
};
