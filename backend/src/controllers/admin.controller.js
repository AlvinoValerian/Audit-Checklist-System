const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const { extractUser } = require('../middlewares/auth.middleware');
const {
  TEKNIS_INTERNAL_EMAIL,
  MAX_TEKNIS_MANUAL_SUPER_ADMINS,
  isTeknisUser,
  toBigIntSafe,
  ensureSuperAdminTeknisColumn,
  getOrCreateTeknisInternalSuperAdmin,
  getTeknisWorkspaceWhere,
  isWorkspaceInTeknisScope,
  getTeknisManualSuperAdminIdSet,
} = require('../utils/teknisScope');
const {
  isSuperAdminRole,
  sendSafeError,
} = require('../utils/tenantScope');

/**
 * Helper untuk menyelesaikan Super Admin ID yang valid berdasarkan user / request
 */
const resolveSuperAdminId = async (req, user) => {
  // 1. Jika user teridentifikasi sebagai Super Admin
  if (user && (user.role === 'Super Admin' || user.role?.includes('Super')) && user.rawId) {
    try {
      return BigInt(user.rawId.toString().replace(/^sa-/, ''));
    } catch (e) {}
  }

  // 1.5. Jika user teridentifikasi sebagai Divisi Teknis
  if (user && (user.role === 'Divisi Teknis' || user.role === 'Teknis')) {
    return BigInt(3);
  }

  // 2. Jika user teridentifikasi sebagai Admin, ambil super_admin_id dari workspacenya
  if (user && (user.role === 'Admin' || user.id?.toString().startsWith('adm-') || user.workspaceId)) {
    if (user.workspaceId) {
      try {
        const ws = await prisma.workspace.findUnique({
          where: { workspace_id: BigInt(user.workspaceId) },
          select: { super_admin_id: true },
        });
        if (ws?.super_admin_id) return ws.super_admin_id;
      } catch (e) {}
    }
    if (user.rawId) {
      try {
        const adm = await prisma.admin.findUnique({
          where: { admin_id: BigInt(user.rawId.toString().replace(/^adm-/, '')) },
          include: { workspace: true },
        });
        if (adm?.workspace?.super_admin_id) return adm.workspace.super_admin_id;
      } catch (e) {}
    }
  }

  // 3. Cek dari explicit parameter (query / body / header)
  const explicitSaId = req.headers['x-super-admin-id'] || req.query.superAdminId || req.body?.superAdminId;
  if (explicitSaId) {
    try {
      const parsed = BigInt(explicitSaId.toString().replace(/^sa-/, ''));
      const exists = await prisma.super_admin.findUnique({
        where: { super_admin_id: parsed },
        select: { super_admin_id: true },
      });
      if (exists) return exists.super_admin_id;
    } catch (e) {}
  }

  // 4. Resolusi dari email
  const candidateEmail = user?.email || req.headers['x-user-email'] || req.query.email;
  if (candidateEmail) {
    const cleanEmail = candidateEmail.trim().toLowerCase();
    try {
      const sa = await prisma.super_admin.findUnique({
        where: { email: cleanEmail },
        select: { super_admin_id: true },
      });
      if (sa) return sa.super_admin_id;

      const adm = await prisma.admin.findUnique({
        where: { email: cleanEmail },
        include: { workspace: true },
      });
      if (adm?.workspace?.super_admin_id) return adm.workspace.super_admin_id;
    } catch (e) {}
  }

  // Super Admin terverifikasi
  if (isSuperAdminRole(user) && user.rawId) {
    return toBigIntSafe(user.rawId, ['sa-']);
  }

  return null;
};

/**
 * Format entitas Admin ke bentuk yang siap dipakai oleh Frontend
 */
const formatAdmin = (adm) => {
  return {
    id: adm.admin_id.toString(),
    rawId: adm.admin_id.toString(),
    fullName: adm.name,
    email: adm.email,
    phone: adm.phone || '-',
    role: adm.role || 'Admin',
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
const formatSuperAdmin = (sa, meta = {}) => {
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
    workspaces: sa.workspace ? sa.workspace.map((w) => w.company_name) : [],
    status: 'Aktif',
    rawStatus: 'active',
    isSystemTeknis: Boolean(meta.isSystemTeknis ?? sa.email === TEKNIS_INTERNAL_EMAIL),
    isManualSuperAdmin: Boolean(meta.isManualSuperAdmin),
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
exports.getAllAdmins = async (req, res) => {
  try {
    await ensureSuperAdminTeknisColumn();
    const user = req.user || (await extractUser(req));
    const isTeknis = isTeknisUser(user);
    const cleanSaId = await resolveSuperAdminId(req, user);

    if (!isTeknis && !cleanSaId) {
      return res.status(403).json({
        status: 'error',
        message: 'Akses ditolak.',
      });
    }

    let adminWhere = {};
    let saWhere = {};
    let systemSa = null;
    let manualSaIdSet = new Set();

    if (isTeknis) {
      systemSa = await getOrCreateTeknisInternalSuperAdmin();
      manualSaIdSet = await getTeknisManualSuperAdminIdSet();

      const allSaIds = [systemSa.super_admin_id];
      for (const mid of manualSaIdSet) {
        const parsed = toBigIntSafe(mid);
        if (parsed && !allSaIds.some((id) => id === parsed)) {
          allSaIds.push(parsed);
        }
      }

      const teknisWsWhere = await getTeknisWorkspaceWhere();
      adminWhere = {
        OR: [
          { role: 'Divisi Teknis' },
          { role: 'Teknis' },
          { workspace: teknisWsWhere },
        ],
      };
      saWhere = {
        super_admin_id: { in: allSaIds },
      };
    } else {
      // Super Admin umum: hanya admin di bawah workspace miliknya
      adminWhere = {
        workspace: {
          super_admin_id: cleanSaId,
        },
        OR: [
          { role: null },
          { role: { notIn: ['Divisi Teknis', 'Teknis'] } },
        ],
      };
      saWhere = {
        super_admin_id: cleanSaId,
      };
    }

    const [admins, superAdmins] = await Promise.all([
      prisma.admin.findMany({
        where: {
          workspace: {
            super_admin_id: cleanSaId,
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
        where: saWhere,
        include: {
          workspace: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    // Total Super Admin terdaftar di halaman Teknis (termasuk System Divisi Teknis + Super Admin manual)
    const manualCount = isTeknis ? superAdmins.length : 0;

    const formattedSuperAdmins = superAdmins.map((sa) =>
      formatSuperAdmin(sa, {
        isSystemTeknis: sa.email === TEKNIS_INTERNAL_EMAIL || (systemSa && sa.super_admin_id === systemSa.super_admin_id),
        isManualSuperAdmin:
          isTeknis &&
          systemSa &&
          sa.super_admin_id !== systemSa.super_admin_id &&
          manualSaIdSet.has(sa.super_admin_id.toString()),
      })
    );
    const formattedAdmins = admins.map(formatAdmin);

    const allAdmins = [...formattedSuperAdmins, ...formattedAdmins];

    return res.status(200).json({
      status: 'success',
      data: allAdmins,
      meta: {
        isTeknis,
        manualSuperAdminCount: manualCount,
        maxManualSuperAdmins: MAX_TEKNIS_MANUAL_SUPER_ADMINS,
      },
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengambil data admin dari database');
  }
};

// GET /api/admins/:id
exports.getAdminById = async (req, res) => {
  try {
    await ensureSuperAdminTeknisColumn();
    const { id } = req.params;
    const user = req.user || (await extractUser(req));
    const isTeknis = isTeknisUser(user);
    const cleanSaId = await resolveSuperAdminId(req, user);

    if (!isTeknis && !cleanSaId) {
      return res.status(403).json({ status: 'error', message: 'Akses ditolak.' });
    }

    if (id.startsWith('sa-')) {
      const saId = toBigIntSafe(id, ['sa-']);
      if (!saId) {
        return res.status(400).json({ status: 'error', message: 'Format ID Super Admin tidak valid' });
      }

      let allowed = false;
      let isSystemTeknis = false;
      let isManualSuperAdmin = false;

      if (isTeknis) {
        const systemSa = await getOrCreateTeknisInternalSuperAdmin();
        const manualSaIdSet = await getTeknisManualSuperAdminIdSet();
        isSystemTeknis = saId === systemSa.super_admin_id;
        isManualSuperAdmin = !isSystemTeknis && manualSaIdSet.has(saId.toString());
        allowed = isSystemTeknis || isManualSuperAdmin;
      } else {
        allowed = saId === cleanSaId;
      }

      if (!allowed) {
        return res.status(403).json({ status: 'error', message: 'Anda tidak memiliki akses ke akun Super Admin ini' });
      }

      const superAdmin = await prisma.super_admin.findUnique({
        where: { super_admin_id: saId },
        include: { workspace: true },
      });
      if (!superAdmin) {
        return res.status(404).json({ status: 'error', message: 'Super admin tidak ditemukan' });
      }
      return res.status(200).json({
        status: 'success',
        data: formatSuperAdmin(superAdmin, { isSystemTeknis, isManualSuperAdmin }),
      });
    }

    const adminId = toBigIntSafe(id, ['adm-']);
    if (!adminId) {
      return res.status(400).json({ status: 'error', message: 'Format ID admin tidak valid' });
    }

    let adminWhere;
    if (isTeknis) {
      const teknisWsWhere = await getTeknisWorkspaceWhere();
      adminWhere = {
        admin_id: adminId,
        OR: [
          { role: 'Divisi Teknis' },
          { role: 'Teknis' },
          { workspace: teknisWsWhere },
        ],
      };
    } else {
      adminWhere = {
        admin_id: adminId,
        workspace: { super_admin_id: cleanSaId },
        OR: [
          { role: null },
          { role: { notIn: ['Divisi Teknis', 'Teknis'] } },
        ],
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
    return sendSafeError(res, error, 'Gagal mengambil detail admin');
  }
};

// POST /api/admins
exports.createAdmin = async (req, res) => {
  try {
    await ensureSuperAdminTeknisColumn();
    const user = req.user || (await extractUser(req));
    const isTeknis = isTeknisUser(user);
    const cleanSaId = await resolveSuperAdminId(req, user);

    if (!cleanSaId) {
      return res.status(403).json({
        status: 'error',
        message: 'Akses ditolak. Akun Super Admin / Divisi Teknis tidak teridentifikasi.',
      });
    }

    const {
      fullName,
      email,
      phone,
      role = 'Admin',
      workspaceName,
      workspaceId,
      companyName,
      status = 'Aktif',
      password,
    } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ status: 'error', message: 'Nama lengkap admin wajib diisi' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ status: 'error', message: 'Email admin wajib diisi' });
    }

    if (!password || !String(password).trim() || String(password).trim().length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password wajib diisi minimal 8 karakter.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Cek duplikasi email lintas tabel admin, super_admin, dan staff
    const emailConflict = await findEmailConflict(cleanEmail);

    if (emailConflict) {
      return res.status(400).json({
        status: 'error',
        message: `Email "${cleanEmail}" sudah terdaftar dalam sistem. Gunakan email lain.`,
      });
    }

    const hashedPassword = await bcrypt.hash(String(password).trim(), 10);

    // 1. Role Super Admin (HANYA aktif di Kelola Admin Divisi Teknis + batas maksimal 2 akun)
    if (role === 'Super Admin') {
      if (!isTeknis) {
        return res.status(403).json({
          status: 'error',
          message: 'Pembuatan akun Super Admin manual hanya diizinkan pada halaman Kelola Admin Divisi Teknis.',
        });
      }

      const systemSa = await getOrCreateTeknisInternalSuperAdmin();
      const manualSaIdSet = await getTeknisManualSuperAdminIdSet();
      const registeredTeknisSaIds = new Set(manualSaIdSet);
      if (systemSa?.super_admin_id != null) {
        registeredTeknisSaIds.add(systemSa.super_admin_id.toString());
      }
      const currentSuperAdminCount = registeredTeknisSaIds.size;

      if (currentSuperAdminCount >= MAX_TEKNIS_MANUAL_SUPER_ADMINS) {
        return res.status(400).json({
          status: 'error',
          message: `Batas maksimal akun Super Admin di Divisi Teknis telah tercapai (maksimal ${MAX_TEKNIS_MANUAL_SUPER_ADMINS} akun).`,
        });
      }

      const newSuperAdmin = await prisma.super_admin.create({
        data: {
          name: fullName.trim(),
          email: cleanEmail,
          phone_number: phone || null,
          password: hashedPassword,
          company_name: (companyName && companyName.trim()) || 'Divisi Teknis - Partner Super Admin',
        },
        include: {
          workspace: true,
        },
      });

      await prisma.$executeRawUnsafe(
        `UPDATE super_admin SET created_by_teknis = TRUE WHERE super_admin_id = $1`,
        newSuperAdmin.super_admin_id
      );

      return res.status(201).json({
        status: 'success',
        message: 'Super Admin manual berhasil ditambahkan ke Divisi Teknis',
        data: formatSuperAdmin(newSuperAdmin, {
          isSystemTeknis: false,
          isManualSuperAdmin: true,
        }),
        meta: {
          manualSuperAdminCount: currentSuperAdminCount + 1,
          maxManualSuperAdmins: MAX_TEKNIS_MANUAL_SUPER_ADMINS,
        },
      });
    }

    // Cegah akun non-Teknis membuat role Divisi Teknis dari endpoint kelola-admin
    if (!isTeknis && (role === 'Divisi Teknis' || role === 'Teknis')) {
      return res.status(403).json({
        status: 'error',
        message: 'Anda tidak memiliki izin menambahkan akun Divisi Teknis dari menu ini.',
      });
    }

    // 2. Pembuatan Admin Workspace
    const wsOwnerScope = isTeknis
      ? await getTeknisWorkspaceWhere()
      : { super_admin_id: cleanSaId };

    let targetWorkspaceId = null;

    if (workspaceId) {
      const parsedWsId = toBigIntSafe(workspaceId, ['ws-']);
      if (!parsedWsId) {
        return res.status(400).json({ status: 'error', message: 'Format ID workspace tidak valid.' });
      }
      const ws = await prisma.workspace.findFirst({
        where: {
          AND: [{ workspace_id: parsedWsId }, wsOwnerScope],
        },
      });
      if (!ws) {
        return res.status(403).json({
          status: 'error',
          message: 'Workspace tidak ditemukan atau Anda tidak memiliki akses.',
        });
      }
      if (ws.status === 'inactive') {
        return res.status(400).json({
          status: 'error',
          message: `Workspace "${ws.company_name}" berstatus Nonaktif dan tidak dapat dipilih.`,
        });
      }
      targetWorkspaceId = ws.workspace_id;
    } else if (workspaceName && workspaceName !== 'All Workspaces (Central)') {
      const ws = await prisma.workspace.findFirst({
        where: {
          AND: [{ company_name: workspaceName.trim() }, wsOwnerScope],
        },
      });
      if (!ws) {
        return res.status(403).json({
          status: 'error',
          message: 'Workspace penugasan tidak ditemukan dalam lingkup akun Anda.',
        });
      }
      if (ws.status === 'inactive') {
        return res.status(400).json({
          status: 'error',
          message: `Workspace "${ws.company_name}" berstatus Nonaktif dan tidak dapat dipilih.`,
        });
      }
      targetWorkspaceId = ws.workspace_id;
    }

    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst({
        where: {
          AND: [{ status: 'active' }, wsOwnerScope],
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
        role: role || 'Admin',
        phone: phone || null,
      },
      include: {
        workspace: true,
      },
    });

    return res.status(201).json({
      status: 'success',
      message: 'Admin berhasil ditambahkan',
      data: formatAdmin(newAdmin),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal menambahkan admin');
  }
};

// PUT /api/admins/:id
exports.updateAdmin = async (req, res) => {
  try {
    await ensureSuperAdminTeknisColumn();
    const { id } = req.params;
    const user = req.user || (await extractUser(req));
    const isTeknis = isTeknisUser(user);
    const cleanSaId = await resolveSuperAdminId(req, user);

    if (!isTeknis && !cleanSaId) {
      return res.status(403).json({ status: 'error', message: 'Akses ditolak.' });
    }

    const {
      fullName,
      email,
      phone,
      companyName,
      workspaceName,
      workspaceId,
      status,
      password,
    } = req.body;

    if (password !== undefined && String(password).trim() && String(password).trim().length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password baru minimal 8 karakter.',
      });
    }

    // 1. Update Super Admin
    if (id.startsWith('sa-')) {
      const saId = toBigIntSafe(id, ['sa-']);
      if (!saId) {
        return res.status(400).json({ status: 'error', message: 'Format ID Super Admin tidak valid.' });
      }

      let allowed = false;
      let isSystemTeknis = false;
      let isManualSuperAdmin = false;

      if (isTeknis) {
        const systemSa = await getOrCreateTeknisInternalSuperAdmin();
        const manualSaIdSet = await getTeknisManualSuperAdminIdSet();
        isSystemTeknis = saId === systemSa.super_admin_id;
        isManualSuperAdmin = !isSystemTeknis && manualSaIdSet.has(saId.toString());
        allowed = isSystemTeknis || isManualSuperAdmin;
      } else {
        allowed = saId === cleanSaId;
      }

      if (!allowed) {
        return res.status(403).json({ status: 'error', message: 'Anda tidak dapat mengubah akun Super Admin lain.' });
      }

      const updateData = { updated_at: new Date() };
      if (fullName) updateData.name = fullName.trim();
      if (email) {
        const nextEmail = email.trim().toLowerCase();
        const emailConflict = await findEmailConflict(nextEmail, { superAdminId: saId });
        if (emailConflict) {
          return res.status(400).json({
            status: 'error',
            message: `Email "${nextEmail}" sudah digunakan oleh akun lain.`,
          });
        }
        updateData.email = nextEmail;
      }
      if (phone !== undefined) updateData.phone_number = phone;
      if (companyName !== undefined && companyName.trim()) {
        updateData.company_name = companyName.trim();
      }
      if (password && password.trim()) {
        updateData.password = await bcrypt.hash(password.trim(), 10);
      }

      const updated = await prisma.super_admin.update({
        where: { super_admin_id: saId },
        data: updateData,
        include: { workspace: true },
      });

      if (password && password.trim()) {
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE super_admin SET token_version = COALESCE(token_version, 0) + 1 WHERE super_admin_id = $1`,
            saId
          );
        } catch {}
      }

      return res.status(200).json({
        status: 'success',
        message: 'Super Admin berhasil diperbarui',
        data: formatSuperAdmin(updated, { isSystemTeknis, isManualSuperAdmin }),
      });
    }

    // 2. Update Admin Workspace
    const adminId = toBigIntSafe(id, ['adm-']);
    if (!adminId) {
      return res.status(400).json({ status: 'error', message: 'Format ID Admin tidak valid.' });
    }

    const existingAdmin = await prisma.admin.findFirst({
      where: isTeknis
        ? {
            admin_id: adminId,
            OR: [
              { role: 'Divisi Teknis' },
              { role: 'Teknis' },
              { workspace: await getTeknisWorkspaceWhere() },
            ],
          }
        : {
            admin_id: adminId,
            workspace: {
              super_admin_id: cleanSaId,
            },
            OR: [
              { role: null },
              { role: { notIn: ['Divisi Teknis', 'Teknis'] } },
            ],
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
    if (email) {
      const nextEmail = email.trim().toLowerCase();
      const emailConflict = await findEmailConflict(nextEmail, { adminId });
      if (emailConflict) {
        return res.status(400).json({
          status: 'error',
          message: `Email "${nextEmail}" sudah digunakan oleh akun lain.`,
        });
      }
      updateData.email = nextEmail;
    }
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) {
      updateData.status = status === 'Nonaktif' || status === 'inactive' ? 'inactive' : 'active';
    }
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const wsOwnerScope = isTeknis
      ? await getTeknisWorkspaceWhere()
      : { super_admin_id: cleanSaId };

    if (workspaceId) {
      const parsedWsId = toBigIntSafe(workspaceId, ['ws-']);
      if (!parsedWsId) {
        return res.status(400).json({ status: 'error', message: 'Format ID workspace tidak valid.' });
      }
      const ws = await prisma.workspace.findFirst({
        where: { AND: [{ workspace_id: parsedWsId }, wsOwnerScope] },
      });
      if (!ws) {
        return res.status(403).json({
          status: 'error',
          message: 'Workspace tidak ditemukan atau Anda tidak memiliki akses.',
        });
      }
      if (ws.status === 'inactive' && existingAdmin.workspace_id !== ws.workspace_id) {
        return res.status(400).json({
          status: 'error',
          message: `Workspace "${ws.company_name}" berstatus Nonaktif dan tidak dapat dipilih.`,
        });
      }
      updateData.workspace_id = ws.workspace_id;
    } else if (workspaceName && workspaceName !== 'All Workspaces (Central)') {
      const ws = await prisma.workspace.findFirst({
        where: { AND: [{ company_name: workspaceName.trim() }, wsOwnerScope] },
      });
      if (!ws) {
        return res.status(403).json({
          status: 'error',
          message: 'Workspace tidak ditemukan atau di luar lingkup akun Anda.',
        });
      }
      if (ws.status === 'inactive' && existingAdmin.workspace_id !== ws.workspace_id) {
        return res.status(400).json({
          status: 'error',
          message: `Workspace "${ws.company_name}" berstatus Nonaktif dan tidak dapat dipilih.`,
        });
      }
      updateData.workspace_id = ws.workspace_id;
    }

    const updated = await prisma.admin.update({
      where: { admin_id: adminId },
      data: updateData,
      include: { workspace: true },
    });

    if (updateData.status === 'inactive' || (password && password.trim())) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE admin SET token_version = COALESCE(token_version, 0) + 1 WHERE admin_id = $1`,
          adminId
        );
      } catch {}
    }

    return res.status(200).json({
      status: 'success',
      message: 'Admin berhasil diperbarui',
      data: formatAdmin(updated),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal memperbarui admin');
  }
};

// DELETE /api/admins/:id
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user || (await extractUser(req));
    const isTeknis = isTeknisUser(user);
    const cleanSaId = await resolveSuperAdminId(req, user);

    if (id.startsWith('sa-')) {
      return res.status(403).json({
        status: 'error',
        message: 'Akun Super Admin bersifat permanen dan tidak dapat dihapus atau dinonaktifkan.',
      });
    }

    if (!isTeknis && !cleanSaId) {
      return res.status(403).json({ status: 'error', message: 'Akses ditolak.' });
    }

    const adminId = toBigIntSafe(id, ['adm-']);
    if (!adminId) {
      return res.status(400).json({ status: 'error', message: 'Format ID admin tidak valid.' });
    }

    const existing = await prisma.admin.findFirst({
      where: isTeknis
        ? {
            admin_id: adminId,
            OR: [
              { role: 'Divisi Teknis' },
              { role: 'Teknis' },
              { workspace: await getTeknisWorkspaceWhere() },
            ],
          }
        : {
            admin_id: adminId,
            workspace: {
              super_admin_id: cleanSaId,
            },
            OR: [
              { role: null },
              { role: { notIn: ['Divisi Teknis', 'Teknis'] } },
            ],
          },
    });

    if (!existing) {
      return res.status(403).json({
        status: 'error',
        message: 'Admin tidak ditemukan atau bukan milik workspace Anda.',
      });
    }

    if (
      isTeknis &&
      existing.workspace_id &&
      !(await isWorkspaceInTeknisScope(existing.workspace_id)) &&
      existing.role !== 'Divisi Teknis' &&
      existing.role !== 'Teknis'
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Admin tidak berada dalam lingkup Divisi Teknis.',
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
    return sendSafeError(res, error, 'Gagal menghapus admin');
  }
};
