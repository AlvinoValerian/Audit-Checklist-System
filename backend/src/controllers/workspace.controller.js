const prisma = require('../config/prisma');

// Helper to format workspace data for frontend
const formatWorkspace = (ws) => {
  return {
    id: ws.workspace_id.toString(),
    workspace_id: ws.workspace_id,
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
exports.getAllWorkspaces = async (req, res) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      include: {
        store: true,
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
    console.error('Error fetching workspaces:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data workspace dari database',
      error: error.message,
    });
  }
};

// GET /api/workspaces/:id
exports.getWorkspaceById = async (req, res) => {
  try {
    const { id } = req.params;
    const workspace = await prisma.workspace.findUnique({
      where: {
        workspace_id: BigInt(id),
      },
      include: {
        store: true,
        admin: true,
      },
    });

    if (!workspace) {
      return res.status(404).json({
        status: 'error',
        message: 'Workspace tidak ditemukan',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: formatWorkspace(workspace),
    });
  } catch (error) {
    console.error('Error fetching workspace detail:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil detail workspace',
      error: error.message,
    });
  }
};

// POST /api/workspaces
exports.createWorkspace = async (req, res) => {
  try {
    const {
      companyName,
      name,
      description,
      category,
      picName,
      picPhone,
      headquartersAddress,
      status,
      superAdminId,
    } = req.body;

    const finalCompanyName = companyName || name;
    if (!finalCompanyName || !finalCompanyName.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Nama perusahaan/workspace wajib diisi',
      });
    }

    // Ensure valid super_admin_id exists
    let superAdmin = null;
    if (superAdminId) {
      superAdmin = await prisma.super_admin.findUnique({
        where: { super_admin_id: BigInt(superAdminId) },
      });
    }

    if (!superAdmin) {
      superAdmin = await prisma.super_admin.findFirst();
      if (!superAdmin) {
        // Create a default super_admin if table is empty
        superAdmin = await prisma.super_admin.create({
          data: {
            email: 'superadmin@auditpro.com',
            name: 'Super Admin',
            password: 'hashedpassword',
            company_name: 'Audit Pro System',
          },
        });
      }
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
    console.error('Error creating workspace:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal membuat workspace',
      error: error.message,
    });
  }
};

// PUT /api/workspaces/:id
exports.updateWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
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
      where: { workspace_id: BigInt(id) },
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
    console.error('Error updating workspace:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memperbarui workspace',
      error: error.message,
    });
  }
};

// DELETE /api/workspaces/:id
exports.deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.workspace.delete({
      where: { workspace_id: BigInt(id) },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Workspace berhasil dihapus secara permanen',
    });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menghapus workspace',
      error: error.message,
    });
  }
};
