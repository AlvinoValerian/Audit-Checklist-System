const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const { extractUser } = require('../middlewares/auth.middleware');

/**
 * Format entitas Admin ke bentuk yang siap dipakai oleh Frontend
 */
const formatAdmin = (adm) => {
  return {
    id: adm.admin_id.toString(),
    rawId: adm.admin_id.toString(),
    fullName: adm.name,
    email: adm.email,
    phone: '-',
    role: 'Admin',
    workspaceId: adm.workspace_id ? adm.workspace_id.toString() : null,
    workspaceName: adm.workspace ? adm.workspace.company_name : 'Belum Ditugaskan',
    status: adm.status === 'inactive' ? 'Nonaktif' : 'Aktif',
    rawStatus: adm.status || 'active',
    createdAt: adm.created_at
      ? new Date(adm.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '-',
  };
};

/**
 * Format entitas Super Admin ke bentuk yang kompatibel dengan Frontend
 */
const formatSuperAdmin = (sa) => {
  const wsCount = sa.workspace ? sa.workspace.length : 0;
  const company = sa.company_name || 'Audit Pro System';
  const wsText = wsCount > 0 
    ? `${company} (${wsCount} Workspace)` 
    : `${company} (Pusat / Semua Workspace)`;

  return {
    id: `sa-${sa.super_admin_id.toString()}`,
    rawId: sa.super_admin_id.toString(),
    fullName: sa.name,
    email: sa.email,
    phone: sa.phone_number || '-',
    role: 'Super Admin',
    workspaceId: null,
    workspaceName: wsText,
    companyName: sa.company_name,
    workspaces: sa.workspace ? sa.workspace.map(w => w.company_name) : [],
    status: 'Aktif',
    rawStatus: 'active',
    createdAt: sa.created_at
      ? new Date(sa.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '-',
  };
};

// GET /api/admins
// HANYA menampilkan admin dan super admin yang berelasi dengan akun yang sedang login
exports.getAllAdmins = async (req, res) => {
  try {
    const user = await extractUser(req);
    const superAdminId = user?.rawId || req.query.superAdminId;

    if (!superAdminId) {
      // Jika belum terotentikasi, tidak boleh menampilkan data akun milik Super Admin lain
      return res.status(200).json({
        status: 'success',
        data: [],
      });
    }

    const cleanSaId = BigInt(superAdminId.toString().replace(/^sa-/, ''));

    const [admins, superAdmins] = await Promise.all([
      prisma.admin.findMany({
        where: {
          workspace: {
            super_admin_id: cleanSaId,
          },
          NOT: {
            role: 'Divisi Teknis',
          },
        },
        include: {
          workspace: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.super_admin.findMany({
        where: {
          super_admin_id: cleanSaId,
        },
        include: {
          workspace: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    const formattedSuperAdmins = superAdmins.map(formatSuperAdmin);
    const formattedAdmins = admins.map(formatAdmin);

    // Super Admin miliknya ditampilkan di atas, diikuti Admin workspace miliknya
    const allAdmins = [...formattedSuperAdmins, ...formattedAdmins];

    return res.status(200).json({
      status: 'success',
      data: allAdmins,
    });
  } catch (error) {
    console.error('❌ Error fetching admins:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data admin dari database',
      error: error.message,
    });
  }
};

// GET /api/admins/:id
exports.getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await extractUser(req);
    const superAdminId = user?.rawId || req.query.superAdminId;

    if (id.startsWith('sa-')) {
      const saId = BigInt(id.replace('sa-', ''));
      const superAdmin = await prisma.super_admin.findUnique({
        where: { super_admin_id: saId },
      });
      if (!superAdmin) {
        return res.status(404).json({ status: 'error', message: 'Super admin tidak ditemukan' });
      }
      return res.status(200).json({ status: 'success', data: formatSuperAdmin(superAdmin) });
    }

    const adminWhere = { admin_id: BigInt(id) };
    if (superAdminId) {
      adminWhere.workspace = {
        super_admin_id: BigInt(superAdminId.toString().replace(/^sa-/, '')),
      };
    }

    const admin = await prisma.admin.findFirst({
      where: adminWhere,
      include: { workspace: true },
    });

    if (!admin) {
      return res.status(404).json({ status: 'error', message: 'Admin tidak ditemukan atau bukan milik akun Anda' });
    }

    return res.status(200).json({ status: 'success', data: formatAdmin(admin) });
  } catch (error) {
    console.error('❌ Error fetching admin detail:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil detail admin',
      error: error.message,
    });
  }
};

// POST /api/admins
exports.createAdmin = async (req, res) => {
  try {
    console.log('📥 [POST /api/admins] Menerima data admin baru:', req.body);
    const user = await extractUser(req);
    const currentSuperAdminId = user?.rawId || req.body.superAdminId || req.query.superAdminId;

    if (!currentSuperAdminId) {
      return res.status(401).json({
        status: 'error',
        message: 'Otentikasi diperlukan. Akun Super Admin tidak teridentifikasi.',
      });
    }

    const cleanSaId = BigInt(currentSuperAdminId.toString().replace(/^sa-/, ''));

    const {
      fullName,
      email,
      phone,
      role = 'Admin',
      workspaceName,
      workspaceId,
      status = 'Aktif',
      password = 'password123',
    } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ status: 'error', message: 'Nama lengkap admin wajib diisi' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ status: 'error', message: 'Email admin wajib diisi' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Cek duplikasi email di tabel admin dan super_admin
    const [existingAdmin, existingSuperAdmin] = await Promise.all([
      prisma.admin.findUnique({ where: { email: cleanEmail } }),
      prisma.super_admin.findUnique({ where: { email: cleanEmail } }),
    ]);

    if (existingAdmin || existingSuperAdmin) {
      return res.status(400).json({
        status: 'error',
        message: `Email "${cleanEmail}" sudah terdaftar dalam sistem. Gunakan email lain.`,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    // 1. Jika role Super Admin
    if (role === 'Super Admin') {
      const newSuperAdmin = await prisma.super_admin.create({
        data: {
          name: fullName.trim(),
          email: cleanEmail,
          phone_number: phone || null,
          password: hashedPassword,
          company_name: 'Audit Pro System',
        },
      });

      return res.status(201).json({
        status: 'success',
        message: 'Super Admin berhasil ditambahkan',
        data: formatSuperAdmin(newSuperAdmin),
      });
    }

    // 2. Pembuatan Admin Workspace (Hanya boleh di workspace milik Super Admin ini!)
    let targetWorkspaceId = null;

    if (workspaceId) {
      const ws = await prisma.workspace.findFirst({
        where: {
          workspace_id: BigInt(workspaceId),
          super_admin_id: cleanSaId,
        },
      });
      if (ws) {
        if (ws.status === 'inactive') {
          return res.status(400).json({
            status: 'error',
            message: `Workspace "${ws.company_name}" berstatus Nonaktif dan tidak dapat dipilih.`,
          });
        }
        targetWorkspaceId = ws.workspace_id;
      }
    } else if (workspaceName && workspaceName !== 'All Workspaces (Central)') {
      const ws = await prisma.workspace.findFirst({
        where: {
          company_name: workspaceName.trim(),
          super_admin_id: cleanSaId,
        },
      });
      if (ws) {
        if (ws.status === 'inactive') {
          return res.status(400).json({
            status: 'error',
            message: `Workspace "${ws.company_name}" berstatus Nonaktif dan tidak dapat dipilih.`,
          });
        }
        targetWorkspaceId = ws.workspace_id;
      }
    }

    // Fallback: Pasangkan ke workspace aktif milik Super Admin ini
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst({
        where: {
          super_admin_id: cleanSaId,
          status: 'active',
        },
      });
      if (!defaultWs) {
        return res.status(400).json({
          status: 'error',
          message: 'Belum ada workspace aktif milik Anda. Buat workspace terlebih dahulu.',
        });
      }
      targetWorkspaceId = defaultWs.workspace_id;
    }

    const newAdmin = await prisma.admin.create({
      data: {
        workspace_id: targetWorkspaceId,
        name: fullName.trim(),
        email: cleanEmail,
        password: hashedPassword,
        status: status === 'Nonaktif' || status === 'inactive' ? 'inactive' : 'active',
      },
      include: {
        workspace: true,
      },
    });

    console.log('✅ [POST /api/admins] Berhasil membuat Admin:', newAdmin.name);

    return res.status(201).json({
      status: 'success',
      message: 'Admin berhasil ditambahkan',
      data: formatAdmin(newAdmin),
    });
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Gagal menambahkan admin',
      error: error.message,
    });
  }
};

// PUT /api/admins/:id
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await extractUser(req);
    const superAdminId = user?.rawId || req.query.superAdminId;

    if (!superAdminId) {
      return res.status(401).json({ status: 'error', message: 'Otentikasi diperlukan.' });
    }
    const cleanSaId = BigInt(superAdminId.toString().replace(/^sa-/, ''));

    const {
      fullName,
      email,
      phone,
      workspaceName,
      workspaceId,
      status,
      password,
    } = req.body;

    // 1. Update Super Admin
    if (id.startsWith('sa-')) {
      const saId = BigInt(id.replace('sa-', ''));
      if (saId !== cleanSaId) {
        return res.status(403).json({ status: 'error', message: 'Anda tidak dapat mengubah akun Super Admin lain.' });
      }

      const updateData = { updated_at: new Date() };
      if (fullName) updateData.name = fullName.trim();
      if (email) updateData.email = email.trim().toLowerCase();
      if (phone !== undefined) updateData.phone_number = phone;
      if (password && password.trim()) {
        updateData.password = await bcrypt.hash(password.trim(), 10);
      }

      const updated = await prisma.super_admin.update({
        where: { super_admin_id: saId },
        data: updateData,
      });

      return res.status(200).json({
        status: 'success',
        message: 'Super Admin berhasil diperbarui',
        data: formatSuperAdmin(updated),
      });
    }

    // 2. Update Admin Workspace (Pastikan milik workspace Super Admin ini)
    const adminId = BigInt(id);
    const existingAdmin = await prisma.admin.findFirst({
      where: {
        admin_id: adminId,
        workspace: {
          super_admin_id: cleanSaId,
        },
      },
    });

    if (!existingAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Admin tidak ditemukan atau Anda tidak memiliki akses ke akun ini.',
      });
    }

    const updateData = { updated_at: new Date() };
    if (fullName) updateData.name = fullName.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (status !== undefined) {
      updateData.status = status === 'Nonaktif' || status === 'inactive' ? 'inactive' : 'active';
    }
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    if (workspaceId) {
      const ws = await prisma.workspace.findFirst({
        where: { workspace_id: BigInt(workspaceId), super_admin_id: cleanSaId },
      });
      if (ws) {
        if (ws.status === 'inactive') {
          return res.status(400).json({
            status: 'error',
            message: `Workspace "${ws.company_name}" berstatus Nonaktif dan tidak dapat dipilih.`,
          });
        }
        updateData.workspace_id = ws.workspace_id;
      }
    } else if (workspaceName && workspaceName !== 'All Workspaces (Central)') {
      const ws = await prisma.workspace.findFirst({
        where: { company_name: workspaceName.trim(), super_admin_id: cleanSaId },
      });
      if (ws) {
        if (ws.status === 'inactive') {
          return res.status(400).json({
            status: 'error',
            message: `Workspace "${ws.company_name}" berstatus Nonaktif dan tidak dapat dipilih.`,
          });
        }
        updateData.workspace_id = ws.workspace_id;
      }
    }

    const updated = await prisma.admin.update({
      where: { admin_id: adminId },
      data: updateData,
      include: { workspace: true },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Admin berhasil diperbarui',
      data: formatAdmin(updated),
    });
  } catch (error) {
    console.error('❌ Error updating admin:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Gagal memperbarui admin',
      error: error.message,
    });
  }
};

// DELETE /api/admins/:id
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await extractUser(req);
    const superAdminId = user?.rawId || req.query.superAdminId;

    if (id.startsWith('sa-')) {
      return res.status(403).json({
        status: 'error',
        message: 'Akun Super Admin bersifat permanen dan tidak dapat dihapus atau dinonaktifkan.',
      });
    }

    if (!superAdminId) {
      return res.status(401).json({ status: 'error', message: 'Otentikasi diperlukan.' });
    }
    const cleanSaId = BigInt(superAdminId.toString().replace(/^sa-/, ''));

    const adminId = BigInt(id);
    const existing = await prisma.admin.findFirst({
      where: {
        admin_id: adminId,
        workspace: {
          super_admin_id: cleanSaId,
        },
      },
    });

    if (!existing) {
      return res.status(403).json({
        status: 'error',
        message: 'Admin tidak ditemukan atau bukan milik workspace Anda.',
      });
    }

    await prisma.admin.delete({
      where: { admin_id: adminId },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Admin berhasil dihapus',
    });
  } catch (error) {
    console.error('❌ Error deleting admin:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Gagal menghapus admin',
      error: error.message,
    });
  }
};
