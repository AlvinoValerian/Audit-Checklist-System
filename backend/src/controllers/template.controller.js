const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');
const { toBigIntSafe } = require('../utils/teknisScope');
const {
  sendSafeError,
  assertWorkspaceAccess,
  resolveScopedWorkspaceContext,
  assertStoreAccess,
} = require('../utils/tenantScope');

/**
 * Format entitas Checklist Template dari database PostgreSQL ke format standar Frontend
 */
const formatTemplate = (t) => {
  const categories = (t.template_category || [])
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((c) => ({
      id: c.category_id.toString(),
      name: c.category_name,
      isExpanded: true,
      tasks: (c.template_task || [])
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((task) => ({
          id: task.task_id.toString(),
          text: task.task_description,
          requirePhoto: !!task.is_photo_required,
          priority: task.priority || (task.is_photo_required ? 'High' : 'Low'),
          order: task.sort_order || 0,
        })),
    }));

  const flatItems = categories.flatMap((cat) =>
    cat.tasks.map((task) => ({
      id: task.id,
      question: task.text,
      category: cat.name,
      required: true,
      requirePhoto: task.requirePhoto,
      priority: task.priority,
    }))
  );

  const totalTasks = categories.reduce((acc, cat) => acc + cat.tasks.length, 0);

  // Status mapping
  const rawStatus = (t.status || 'active').toLowerCase();
  const isAktif = rawStatus === 'active' || rawStatus === 'aktif';
  const status = isAktif ? 'Aktif' : 'Nonaktif';

  // CreatedAt formatting
  const createdDate = t.created_at ? new Date(t.created_at) : new Date();
  const dateFormatted = createdDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    id: t.template_id.toString(),
    templateId: t.template_id.toString(),
    title: t.template_name,
    description:
      t.description ||
      `Template audit dengan ${categories.length} kategori dan ${totalTasks} tugas periksa.`,
    category: categories[0]?.name || 'Operasional Toko',
    categories,
    items: flatItems,
    itemsCount: totalTasks,
    lastRevision: dateFormatted,
    archivedDate: !isAktif ? dateFormatted : undefined,
    createdBy: t.created_by_name || t.admin?.name || 'Admin Toko',
    creatorRole: t.creator_role || 'Head Auditor',
    status,
    rawStatus: t.status,
    createdAt: dateFormatted,
    storeId: t.store_id ? t.store_id.toString() : undefined,
    storeName: t.store?.store_name || undefined,
    adminId: t.admin_id ? t.admin_id.toString() : undefined,
    radius: t.radius ? Number(t.radius) : 50,
  };
};

/**
 * 1. GET /api/templates - Ambil seluruh checklist template
 */
exports.getAllTemplates = async (req, res) => {
  try {
    const { search, status, storeId, workspaceId } = req.query;
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan.',
      });
    }

    const requestedWsId = workspaceId || req.headers['x-workspace-id'];
    const scope = await resolveScopedWorkspaceContext(user, requestedWsId, {
      teknisUseSingleDefaultOnAll: true,
    });

    if (!scope.ok) {
      return res.status(scope.status).json({
        success: false,
        message: scope.message,
      });
    }

    if (scope.workspaceIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        stats: { total: 0, active: 0, inactive: 0, activePercentage: 0 },
        data: [],
      });
    }

    const storeScopeFilter = scope.prismaWorkspaceWhere.workspace_id
      ? { workspace_id: scope.prismaWorkspaceWhere.workspace_id }
      : { workspace: scope.prismaWorkspaceWhere };

    const where = {
      store: storeScopeFilter,
    };

    // Filter Status
    if (status && status !== 'Semua') {
      const lowerStatus = status.toLowerCase();
      if (lowerStatus === 'aktif' || lowerStatus === 'active') {
        where.status = 'active';
      } else if (lowerStatus === 'nonaktif' || lowerStatus === 'inactive') {
        where.status = { in: ['inactive', 'nonaktif', 'archived'] };
      }
    }

    // Filter Store (dengan verifikasi hak akses store & konsistensi tenant)
    if (storeId && storeId !== 'all') {
      const storeCheck = await assertStoreAccess(user, storeId);
      if (!storeCheck.ok) {
        return res.status(storeCheck.status).json({
          success: false,
          message: storeCheck.message,
        });
      }
      where.store_id = storeCheck.storeId;
    }

    // Filter Pencarian (Gunakan AND agar tidak menimpa filter workspace)
    if (search && search.trim()) {
      const term = search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { template_name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const templates = await prisma.checklist_template.findMany({
      where,
      include: {
        template_category: {
          include: {
            template_task: true,
          },
        },
        store: {
          select: {
            store_id: true,
            store_name: true,
            workspace_id: true,
          },
        },
        admin: {
          select: {
            admin_id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        template_id: 'desc',
      },
    });

    const formattedData = templates.map(formatTemplate);

    // Hitung statistik
    const total = formattedData.length;
    const active = formattedData.filter((t) => t.status === 'Aktif').length;
    const inactive = formattedData.filter((t) => t.status === 'Nonaktif').length;
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;

    return res.status(200).json({
      success: true,
      count: total,
      stats: {
        total,
        active,
        inactive,
        activePercentage,
      },
      data: formattedData,
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengambil data template checklist');
  }
};

/**
 * 2. GET /api/templates/:id - Ambil detail 1 checklist template
 */
exports.getTemplateById = async (req, res) => {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan.',
      });
    }

    const { id } = req.params;
    const templateId = toBigIntSafe(id, ['tpl-']);
    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: 'Format ID template tidak valid',
      });
    }

    const template = await prisma.checklist_template.findUnique({
      where: { template_id: templateId },
      include: {
        template_category: {
          include: {
            template_task: true,
          },
        },
        store: {
          select: {
            store_id: true,
            store_name: true,
            workspace_id: true,
          },
        },
        admin: {
          select: {
            admin_id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template checklist tidak ditemukan',
      });
    }

    const access = await assertWorkspaceAccess(user, template.store?.workspace_id);
    if (!access.ok) {
      return res.status(access.status === 400 ? 403 : access.status).json({
        success: false,
        message: access.message || 'Anda tidak memiliki akses ke template milik tenant lain',
      });
    }

    return res.status(200).json({
      success: true,
      data: formatTemplate(template),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengambil detail template checklist');
  }
};

/**
 * 3. POST /api/templates - Buat checklist template baru beserta kategori & tugas
 */
exports.createTemplate = async (req, res) => {
  try {
    const {
      title,
      templateName,
      template_name,
      description,
      categories,
      items,
      status,
      storeId,
      adminId,
      createdBy,
      creatorRole,
      radius,
    } = req.body;

    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan.',
      });
    }

    const resolvedCreatorName =
      (createdBy || user.fullName || user.email?.split('@')[0] || 'Admin').trim();
    const resolvedCreatorRole =
      (user.role || creatorRole || 'Admin').trim();

    const finalTitle = (title || templateName || template_name || '').trim();
    if (!finalTitle) {
      return res.status(400).json({
        success: false,
        message: 'Nama template wajib diisi',
      });
    }

    // Resolusi Store secara ketat dalam cakupan workspace milik user
    let targetStoreRecord = null;
    if (storeId) {
      const storeCheck = await assertStoreAccess(user, storeId);
      if (!storeCheck.ok) {
        return res.status(storeCheck.status).json({
          success: false,
          message: storeCheck.message,
        });
      }
      targetStoreRecord = storeCheck.store;
    } else {
      const requestedWs = req.body.workspaceId || req.headers['x-workspace-id'] || req.query.workspaceId;
      const scope = await resolveScopedWorkspaceContext(user, requestedWs, {
        teknisUseSingleDefaultOnAll: true,
      });
      if (!scope.ok) {
        return res.status(scope.status).json({
          success: false,
          message: scope.message,
        });
      }
      if (scope.workspaceIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Belum ada workspace atau toko aktif. Tambahkan workspace & toko terlebih dahulu.',
        });
      }

      const storeScopeFilter = scope.prismaWorkspaceWhere.workspace_id
        ? { workspace_id: scope.prismaWorkspaceWhere.workspace_id }
        : { workspace: scope.prismaWorkspaceWhere };

      targetStoreRecord = await prisma.store.findFirst({
        where: storeScopeFilter,
        include: {
          workspace: {
            select: { workspace_id: true, status: true },
          },
        },
        orderBy: { store_id: 'asc' },
      });

      if (!targetStoreRecord) {
        return res.status(400).json({
          success: false,
          message: 'Belum ada toko pada workspace ini. Tambahkan toko terlebih dahulu sebelum membuat template checklist.',
        });
      }
    }

    if (
      targetStoreRecord.workspace &&
      (targetStoreRecord.workspace.status === 'inactive' ||
        targetStoreRecord.workspace.status === 'Nonaktif')
    ) {
      return res.status(403).json({
        success: false,
        message: 'Workspace ini sedang dinonaktifkan. Pembuatan template checklist diberhentikan.',
      });
    }

    const targetStoreId = targetStoreRecord.store_id;

    // Resolusi Admin ID hanya dari admin di workspace target (tanpa fallback global lintas tenant)
    let targetAdminId = null;
    if (adminId) {
      const parsedAdmId = toBigIntSafe(adminId, ['adm-']);
      if (parsedAdmId) {
        const admInWs = await prisma.admin.findFirst({
          where: { admin_id: parsedAdmId, workspace_id: targetStoreRecord.workspace_id },
          select: { admin_id: true },
        });
        if (admInWs) targetAdminId = admInWs.admin_id;
      }
    }

    if (!targetAdminId && user.role !== 'Super Admin' && user.role !== 'Staff' && user.rawId) {
      const parsedSelfAdm = toBigIntSafe(user.rawId, ['adm-']);
      if (parsedSelfAdm) {
        const selfAdm = await prisma.admin.findFirst({
          where: { admin_id: parsedSelfAdm, workspace_id: targetStoreRecord.workspace_id },
          select: { admin_id: true },
        });
        if (selfAdm) targetAdminId = selfAdm.admin_id;
      }
    }

    if (!targetAdminId && targetStoreRecord.admin_id) {
      targetAdminId = targetStoreRecord.admin_id;
    }

    if (!targetAdminId) {
      const wsAdmin = await prisma.admin.findFirst({
        where: { workspace_id: targetStoreRecord.workspace_id },
        select: { admin_id: true },
        orderBy: { admin_id: 'asc' },
      });
      if (wsAdmin) targetAdminId = wsAdmin.admin_id;
    }

    if (!targetAdminId) {
      return res.status(400).json({
        success: false,
        message: 'Admin penanggung jawab pada workspace ini belum tersedia.',
      });
    }

    const finalStatus =
      status === 'Nonaktif' || status === 'inactive' ? 'inactive' : 'active';

    // Normalisasi struktur kategori jika dikirim dalam bentuk flat items
    let resolvedCategories = categories;
    if ((!resolvedCategories || resolvedCategories.length === 0) && items && items.length > 0) {
      const grouped = {};
      items.forEach((item, idx) => {
        const catName = item.category || 'Operasional Umum';
        if (!grouped[catName]) grouped[catName] = [];
        grouped[catName].push({
          text: item.question || item.text,
          requirePhoto: !!(item.requirePhoto || item.is_photo_required),
          order: idx + 1,
        });
      });
      resolvedCategories = Object.entries(grouped).map(([name, tasks]) => ({
        name,
        tasks,
      }));
    }

    // Buat Template, Kategori, dan Tugas dalam 1 transaksi
    const newTemplate = await prisma.$transaction(async (tx) => {
      const createdTpl = await tx.checklist_template.create({
        data: {
          template_name: finalTitle,
          description: description ? description.trim() : null,
          status: finalStatus,
          store_id: targetStoreId,
          admin_id: targetAdminId,
          created_by_name: resolvedCreatorName,
          creator_role: resolvedCreatorRole,
          time_submitted: new Date(),
          radius: radius ? Number(radius) : 50,
        },
      });

      if (resolvedCategories && Array.isArray(resolvedCategories)) {
        for (let cIdx = 0; cIdx < resolvedCategories.length; cIdx++) {
          const cat = resolvedCategories[cIdx];
          const catName = (cat.name || '').trim();
          if (!catName) continue;

          const createdCat = await tx.template_category.create({
            data: {
              template_id: createdTpl.template_id,
              category_name: catName,
              sort_order: cIdx + 1,
            },
          });

          if (cat.tasks && Array.isArray(cat.tasks)) {
            for (let tIdx = 0; tIdx < cat.tasks.length; tIdx++) {
              const task = cat.tasks[tIdx];
              const taskText = (task.text || task.question || '').trim();
              if (!taskText) continue;

              await tx.template_task.create({
                data: {
                  kategori_id: createdCat.category_id,
                  task_description: taskText,
                  is_photo_required: !!(task.requirePhoto || task.is_photo_required),
                  priority: task.priority || (task.requirePhoto || task.is_photo_required ? 'High' : 'Low'),
                  sort_order: tIdx + 1,
                },
              });
            }
          }
        }
      }

      return createdTpl;
    });

    // Ambil template lengkap yang baru saja dibuat
    const fullTemplate = await prisma.checklist_template.findUnique({
      where: { template_id: newTemplate.template_id },
      include: {
        template_category: {
          include: {
            template_task: true,
          },
        },
        store: true,
        admin: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Template checklist berhasil dibuat',
      data: formatTemplate(fullTemplate),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal membuat template checklist baru');
  }
};

/**
 * 4. PUT /api/templates/:id - Update template, kategori & tugas
 */
exports.updateTemplate = async (req, res) => {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan.',
      });
    }
    const { id } = req.params;
    const templateId = toBigIntSafe(id, ['tpl-']);
    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: 'Format ID template tidak valid',
      });
    }

    const {
      title,
      templateName,
      template_name,
      description,
      categories,
      items,
      status,
      radius,
    } = req.body;

    // Pastikan template ada
    const existing = await prisma.checklist_template.findUnique({
      where: { template_id: templateId },
      include: {
        store: { select: { workspace_id: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Template checklist tidak ditemukan',
      });
    }

    const access = await assertWorkspaceAccess(user, existing.store?.workspace_id);
    if (!access.ok) {
      return res.status(access.status === 400 ? 403 : access.status).json({
        success: false,
        message: access.message || 'Anda tidak memiliki akses untuk mengubah template milik tenant lain',
      });
    }

    const updateData = {};
    const finalTitle = title || templateName || template_name;
    if (finalTitle !== undefined) updateData.template_name = finalTitle.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (radius !== undefined) updateData.radius = Number(radius);
    if (status !== undefined) {
      updateData.status =
        status === 'Nonaktif' || status === 'inactive' ? 'inactive' : 'active';
    }
    if (req.body.createdBy !== undefined) updateData.created_by_name = req.body.createdBy.trim();
    if (req.body.creatorRole !== undefined) updateData.creator_role = req.body.creatorRole.trim();

    // Normalisasi struktur kategori jika dikirim items flat
    let resolvedCategories = categories;
    if ((!resolvedCategories || resolvedCategories.length === 0) && items && items.length > 0) {
      const grouped = {};
      items.forEach((item, idx) => {
        const catName = item.category || 'Operasional Umum';
        if (!grouped[catName]) grouped[catName] = [];
        grouped[catName].push({
          text: item.question || item.text,
          requirePhoto: !!(item.requirePhoto || item.is_photo_required),
          order: idx + 1,
        });
      });
      resolvedCategories = Object.entries(grouped).map(([name, tasks]) => ({
        name,
        tasks,
      }));
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update data dasar template
      await tx.checklist_template.update({
        where: { template_id: templateId },
        data: updateData,
      });

      // 2. Jika ada categories baru yang dikirimkan, perbarui struktur kategori & tugas
      if (resolvedCategories && Array.isArray(resolvedCategories)) {
        // Hapus kategori lama (otomatis cascade delete tugas)
        await tx.template_category.deleteMany({
          where: { template_id: templateId },
        });

        // Insert kategori & tugas baru
        for (let cIdx = 0; cIdx < resolvedCategories.length; cIdx++) {
          const cat = resolvedCategories[cIdx];
          const catName = (cat.name || '').trim();
          if (!catName) continue;

          const createdCat = await tx.template_category.create({
            data: {
              template_id: templateId,
              category_name: catName,
              sort_order: cIdx + 1,
            },
          });

          if (cat.tasks && Array.isArray(cat.tasks)) {
            for (let tIdx = 0; tIdx < cat.tasks.length; tIdx++) {
              const task = cat.tasks[tIdx];
              const taskText = (task.text || task.question || '').trim();
              if (!taskText) continue;

              await tx.template_task.create({
                data: {
                  kategori_id: createdCat.category_id,
                  task_description: taskText,
                  is_photo_required: !!(task.requirePhoto || task.is_photo_required),
                  priority: task.priority || (task.requirePhoto || task.is_photo_required ? 'High' : 'Low'),
                  sort_order: tIdx + 1,
                },
              });
            }
          }
        }
      }
    });

    const fullTemplate = await prisma.checklist_template.findUnique({
      where: { template_id: templateId },
      include: {
        template_category: {
          include: {
            template_task: true,
          },
        },
        store: true,
        admin: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Template checklist berhasil diperbarui',
      data: formatTemplate(fullTemplate),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal memperbarui template checklist');
  }
};

/**
 * 5. PATCH /api/templates/:id/status - Aktifkan atau Nonaktifkan template
 */
exports.toggleStatus = async (req, res) => {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan.',
      });
    }
    const { id } = req.params;
    const templateId = toBigIntSafe(id, ['tpl-']);
    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: 'Format ID template tidak valid',
      });
    }

    const existing = await prisma.checklist_template.findUnique({
      where: { template_id: templateId },
      select: {
        status: true,
        store: { select: { workspace_id: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Template checklist tidak ditemukan',
      });
    }

    const access = await assertWorkspaceAccess(user, existing.store?.workspace_id);
    if (!access.ok) {
      return res.status(access.status === 400 ? 403 : access.status).json({
        success: false,
        message: access.message || 'Anda tidak memiliki akses untuk mengubah status template milik tenant lain',
      });
    }

    const { status } = req.body;
    let nextStatus = 'active';

    if (status) {
      nextStatus = status === 'Nonaktif' || status === 'inactive' ? 'inactive' : 'active';
    } else {
      nextStatus = existing.status === 'active' ? 'inactive' : 'active';
    }

    // Jika ingin menonaktifkan, pastikan tidak ada jadwal audit aktif yang terhubung
    if (nextStatus === 'inactive') {
      const activeSchedules = await prisma.schedule.findMany({
        where: {
          template_id: templateId,
          deleted_at: null,
          NOT: {
            status: { in: ['cancelled', 'Dibatalkan', 'inactive'] },
          },
        },
        include: {
          store: true,
        },
      });

      if (activeSchedules.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Template checklist tidak dapat dinonaktifkan karena masih terhubung dengan ${activeSchedules.length} jadwal audit yang aktif. Harap nonaktifkan jadwal terkait terlebih dahulu.`,
          activeSchedules: activeSchedules.map((s) => ({
            id: s.schedule_id.toString(),
            title: s.title,
            storeName: s.store?.store_name || 'Toko',
          })),
        });
      }
    }

    const updated = await prisma.checklist_template.update({
      where: { template_id: templateId },
      data: { status: nextStatus },
      include: {
        template_category: {
          include: {
            template_task: true,
          },
        },
        store: true,
        admin: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Template checklist berhasil ${nextStatus === 'active' ? 'diaktifkan' : 'dinonaktifkan'}`,
      data: formatTemplate(updated),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengubah status template checklist');
  }
};

/**
 * 6. DELETE /api/templates/:id - Hapus template (soft delete / permanent)
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan.',
      });
    }
    const { id } = req.params;
    const templateId = toBigIntSafe(id, ['tpl-']);
    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: 'Format ID template tidak valid',
      });
    }

    const existing = await prisma.checklist_template.findUnique({
      where: { template_id: templateId },
      include: {
        store: { select: { workspace_id: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Template checklist tidak ditemukan',
      });
    }

    const access = await assertWorkspaceAccess(user, existing.store?.workspace_id);
    if (!access.ok) {
      return res.status(access.status === 400 ? 403 : access.status).json({
        success: false,
        message: access.message || 'Anda tidak memiliki akses untuk menghapus template milik tenant lain',
      });
    }

    const isPermanent = req.query.permanent === 'true';

    if (isPermanent) {
      await prisma.checklist_template.delete({
        where: { template_id: templateId },
      });
      return res.status(200).json({
        success: true,
        message: 'Template checklist berhasil dihapus secara permanen',
      });
    } else {
      // Pastikan tidak ada jadwal audit aktif yang terhubung sebelum soft delete
      const activeSchedules = await prisma.schedule.findMany({
        where: {
          template_id: templateId,
          deleted_at: null,
          NOT: {
            status: { in: ['cancelled', 'Dibatalkan', 'inactive'] },
          },
        },
      });

      if (activeSchedules.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Template checklist tidak dapat dinonaktifkan karena masih terhubung dengan ${activeSchedules.length} jadwal audit aktif. Harap nonaktifkan jadwal terkait terlebih dahulu.`,
        });
      }

      await prisma.checklist_template.update({
        where: { template_id: templateId },
        data: { status: 'inactive' },
      });
      return res.status(200).json({
        success: true,
        message: 'Template checklist berhasil dinonaktifkan',
      });
    }
  } catch (error) {
    return sendSafeError(res, error, 'Gagal menghapus template checklist');
  }
};

/**
 * 7. GET /api/templates/stats - Ambil statistik ringkas template
 */
exports.getTemplateStats = async (req, res) => {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan.',
      });
    }

    const requestedWsId = req.query.workspaceId || req.headers['x-workspace-id'];
    const scope = await resolveScopedWorkspaceContext(user, requestedWsId, {
      teknisUseSingleDefaultOnAll: true,
    });

    if (!scope.ok) {
      return res.status(scope.status).json({
        success: false,
        message: scope.message,
      });
    }

    if (scope.workspaceIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: { total: 0, active: 0, inactive: 0, activePercentage: 0 },
      });
    }

    const storeScopeFilter = scope.prismaWorkspaceWhere.workspace_id
      ? { workspace_id: scope.prismaWorkspaceWhere.workspace_id }
      : { workspace: scope.prismaWorkspaceWhere };

    const where = {
      store: storeScopeFilter,
    };

    const total = await prisma.checklist_template.count({ where });
    const active = await prisma.checklist_template.count({
      where: { ...where, status: 'active' },
    });
    const inactive = total - active;
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        total,
        active,
        inactive,
        activePercentage,
      },
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengambil statistik template');
  }
};
