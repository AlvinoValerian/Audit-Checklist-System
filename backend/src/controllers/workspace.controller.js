const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');
const {
  isTeknisUser,
  toBigIntSafe,
  getOrCreateTeknisInternalSuperAdmin,
  getTeknisWorkspaceWhere,
} = require('../utils/teknisScope');
const {
  isSuperAdminRole,
  isAdminRole,
  assertWorkspaceAccess,
  sendSafeError,
} = require('../utils/tenantScope');

// Helper to format workspace data for frontend
const formatWorkspace = (ws) => {
  return {
    id: ws.workspace_id.toString(),
    workspace_id: ws.workspace_id.toString(),
    name: ws.company_name,
    companyName: ws.company_name,
    category: ws.category || 'Retail',
    companyCategory: ws.category || 'Retail',
    description: ws.description || '',
    companyDescription: ws.description || '',
    headquartersAddress: ws.head_office_address || '-',
    picName: ws.pic_name || '-',
    picPhone: ws.pic_contact || '-',
    status: ws.status === 'inactive' ? 'Nonaktif' : 'Aktif',
    rawStatus: ws.status,
    storeCount: ws.store ? ws.store.length : (ws._count ? ws._count.store : 0),
    createdAt: ws.created_at
      ? new Date(ws.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '-',
    adminEmail: ws.admin && ws.admin.length > 0 ? ws.admin[0].email : undefined,
    stores: ws.store ? ws.store.map((s) => s.store_name) : [],
  };
};

// GET /api/workspaces
// HANYA menampilkan workspace yang berelasi dengan user yang sedang login
exports.getAllWorkspaces = async (req, res) => {
  try {
    const user = req.user || (await extractUser(req));
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Autentikasi diperlukan.' });
    }

    let where = {};

    if (user && user.role === 'Super Admin' && user.rawId) {
      where.super_admin_id = BigInt(user.rawId);
    } else if (user && (user.role === 'Divisi Teknis' || user.role === 'Teknis')) {
      // Divisi Teknis memiliki akses ke workspace maintenance / testing internal (super_admin_id: 3)
      where.super_admin_id = BigInt(3);
    } else if (user && user.role === 'Admin' && user.workspaceId) {
      where.workspace_id = BigInt(user.workspaceId);
    } else if (req.query.superAdminId) {
      const sId = req.query.superAdminId.toString().replace(/^sa-/, '');
      where.super_admin_id = BigInt(sId);
    } else {
      return res.status(403).json({ status: 'error', message: 'Akses workspace ditolak.' });
    }

    const workspaces = await prisma.workspace.findMany({
      where,
      include: {
        store: {
          select: {
            store_name: true,
          },
        },
        admin: {
          select: {
            admin_id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: { store: true },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const formatted = workspaces.map(formatWorkspace);

    return res.status(200).json({
      status: 'success',
      data: formatted,
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengambil data workspace dari database');
  }
};

// GET /api/workspaces/:id
exports.getWorkspaceById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await extractUser(req);
    const where = { workspace_id: BigInt(id) };

    if (user && user.role === 'Super Admin' && user.rawId) {
      where.super_admin_id = BigInt(user.rawId);
    } else if (user && (user.role === 'Divisi Teknis' || user.role === 'Teknis')) {
      where.super_admin_id = BigInt(3);
    } else if (user && user.role === 'Admin' && user.workspaceId) {
      where.workspace_id = BigInt(user.workspaceId);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { workspace_id: access.workspaceId },
      include: {
        store: {
          select: {
            store_id: true,
            store_name: true,
            status: true,
            city: true,
            address: true,
          },
        },
        admin: true,
      },
    });

    if (!workspace) {
      return res.status(404).json({
        status: 'error',
        message: 'Workspace tidak ditemukan.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: formatWorkspace(workspace),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengambil detail workspace');
  }
};

// POST /api/workspaces
exports.createWorkspace = async (req, res) => {
  try {
    const user = req.user || (await extractUser(req));
    if (!user || (!isTeknisUser(user) && !isSuperAdminRole(user))) {
      return res.status(403).json({
        status: 'error',
        message: 'Hanya Super Admin atau Divisi Teknis yang dapat membuat workspace.',
      });
    }

    const {
      companyName,
      name,
      description,
      category,
      picName,
      picPhone,
      headquartersAddress,
      status,
    } = req.body;

    const user = await extractUser(req);
    let targetSuperAdminId = user?.rawId || superAdminId || req.query.superAdminId;
    if (user && (user.role === 'Divisi Teknis' || user.role === 'Teknis')) {
      targetSuperAdminId = '3';
    }

    if (!targetSuperAdminId) {
      return res.status(401).json({
        status: 'error',
        message: 'Otentikasi diperlukan. Akun Super Admin tidak teridentifikasi.',
      });
    }

    const finalCompanyName = companyName || name;
    if (!finalCompanyName || !finalCompanyName.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Nama perusahaan/workspace wajib diisi',
      });
    }

    let cleanSaId = null;
    if (isTeknisUser(user)) {
      const systemSa = await getOrCreateTeknisInternalSuperAdmin();
      cleanSaId = systemSa.super_admin_id;
    } else if (user.rawId) {
      cleanSaId = toBigIntSafe(user.rawId, ['sa-']);
    }

    if (!cleanSaId) {
      return res.status(403).json({
        status: 'error',
        message: 'Akun Super Admin tidak teridentifikasi.',
      });
    }

    const superAdmin = await prisma.super_admin.findUnique({
      where: { super_admin_id: cleanSaId },
    });

    if (!superAdmin) {
      return res.status(404).json({
        status: 'error',
        message: 'Akun Super Admin tidak ditemukan di database.',
      });
    }

    const newWorkspace = await prisma.workspace.create({
      data: {
        super_admin_id: superAdmin.super_admin_id,
        company_name: finalCompanyName.trim(),
        description: description || null,
        category: category || 'Retail',
        pic_name: picName || null,
        pic_contact: picPhone || null,
        head_office_address: headquartersAddress || null,
        status: status === 'Nonaktif' || status === 'inactive' ? 'inactive' : 'active',
      },
      include: {
        store: true,
        admin: true,
      },
    });

    return res.status(201).json({
      status: 'success',
      message: 'Workspace berhasil ditambahkan',
      data: formatWorkspace(newWorkspace),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal membuat workspace');
  }
};

// PUT /api/workspaces/:id
exports.updateWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await extractUser(req);
    const workspaceId = BigInt(id);

    // Cek kepemilikan workspace jika diakses oleh Super Admin atau Divisi Teknis
    if (user && user.role === 'Super Admin' && user.rawId) {
      const existing = await prisma.workspace.findFirst({
        where: {
          workspace_id: workspaceId,
          super_admin_id: BigInt(user.rawId),
        },
      });
      if (!existing) {
        return res.status(403).json({
          status: 'error',
          message: 'Anda tidak memiliki hak akses untuk mengubah workspace ini.',
        });
      }
    } else if (user && (user.role === 'Divisi Teknis' || user.role === 'Teknis')) {
      const existing = await prisma.workspace.findFirst({
        where: {
          workspace_id: workspaceId,
          super_admin_id: BigInt(3),
        },
      });
      if (!existing) {
        return res.status(403).json({
          status: 'error',
          message: 'Anda tidak memiliki hak akses untuk mengubah workspace ini.',
        });
      }
    }

    const {
      companyName,
      name,
      description,
      category,
      picName,
      picPhone,
      headquartersAddress,
      status,
    } = req.body;

    const updateData = {
      updated_at: new Date(),
    };

    if (companyName || name) updateData.company_name = (companyName || name).trim();
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (picName !== undefined) updateData.pic_name = picName;
    if (picPhone !== undefined) updateData.pic_contact = picPhone;
    if (headquartersAddress !== undefined) updateData.head_office_address = headquartersAddress;
    if (status !== undefined) {
      updateData.status = status === 'Nonaktif' || status === 'inactive' ? 'inactive' : 'active';
    }

    const updated = await prisma.workspace.update({
      where: { workspace_id: access.workspaceId },
      data: updateData,
      include: {
        store: true,
        admin: true,
      },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Workspace berhasil diperbarui',
      data: formatWorkspace(updated),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal memperbarui workspace');
  }
};

// DELETE /api/workspaces/:id
exports.deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await extractUser(req);
    const workspaceId = BigInt(id);

    // Cek kepemilikan workspace
    if (user && user.role === 'Super Admin' && user.rawId) {
      const existing = await prisma.workspace.findFirst({
        where: {
          workspace_id: workspaceId,
          super_admin_id: BigInt(user.rawId),
        },
      });
      if (!existing) {
        return res.status(403).json({
          status: 'error',
          message: 'Anda tidak memiliki hak akses untuk menghapus workspace ini.',
        });
      }
    } else if (user && (user.role === 'Divisi Teknis' || user.role === 'Teknis')) {
      const existing = await prisma.workspace.findFirst({
        where: {
          workspace_id: workspaceId,
          super_admin_id: BigInt(3),
        },
      });
      if (!existing) {
        return res.status(403).json({
          status: 'error',
          message: 'Anda tidak memiliki hak akses untuk menghapus workspace ini.',
        });
      }
    }

    await prisma.workspace.delete({
      where: { workspace_id: access.workspaceId },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Workspace berhasil dihapus secara permanen',
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal menghapus workspace');
  }
};
