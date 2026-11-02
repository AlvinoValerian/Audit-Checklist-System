const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');

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
    const requestedWsId = workspaceId || req.headers['x-workspace-id'];

    const where = {};

    // Filter Status
    if (status && status !== 'Semua') {
      const lowerStatus = status.toLowerCase();
      if (lowerStatus === 'aktif' || lowerStatus === 'active') {
        where.status = 'active';
      } else if (lowerStatus === 'nonaktif' || lowerStatus === 'inactive') {
        where.status = { in: ['inactive', 'nonaktif', 'archived'] };
      }
    }

    // Filter Store / Workspace (Strict Workspace Isolation)
    if (user && (user.role === 'Divisi Teknis' || user.role === 'Teknis') && user.workspaceId) {
      try {
        const cleanWs = BigInt(user.workspaceId.toString().replace(/^ws-/, ''));
        where.store = { workspace_id: cleanWs };
      } catch (e) {}
    } else if (storeId) {
      try {
        where.store_id = BigInt(storeId.toString().replace(/^st-/, ''));
      } catch (e) {}
    } else if (requestedWsId && requestedWsId !== 'all') {
      try {
        const cleanWs = BigInt(requestedWsId.toString().replace(/^ws-/, ''));
        where.store = { workspace_id: cleanWs };
      } catch (e) {
        console.warn('⚠️ [getAllTemplates] Invalid workspaceId:', requestedWsId);
      }
    } else if (user && user.role === 'Admin' && user.workspaceId) {
      try {
        const cleanWs = BigInt(user.workspaceId.toString().replace(/^ws-/, ''));
        where.store = { workspace_id: cleanWs };
      } catch (e) {}
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
    console.error('❌ Error getAllTemplates:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data template checklist',
      error: error.message,
    });
  }
};

/**
 * 2. GET /api/templates/:id - Ambil detail 1 checklist template
 */
exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return res.status(400).json({
        success: false,
        message: 'Format ID template tidak valid',
      });
    }

    const template = await prisma.checklist_template.findUnique({
      where: { template_id: BigInt(numericId) },
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

    return res.status(200).json({
      success: true,
      data: formatTemplate(template),
    });
  } catch (error) {
    console.error('❌ Error getTemplateById:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail template checklist',
      error: error.message,
    });
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
    const resolvedCreatorName =
      (createdBy || user?.fullName || user?.name || '').trim() ||
      (req.headers['x-user-email'] ? req.headers['x-user-email'].split('@')[0] : 'Admin');
    const resolvedCreatorRole =
      (creatorRole || user?.role || '').trim() || 'Admin';

    const finalTitle = (title || templateName || template_name || '').trim();
    if (!finalTitle) {
      return res.status(400).json({
        success: false,
        message: 'Nama template wajib diisi',
      });
    }

    // Resolusi Store & Admin ID fallback jika tidak disediakan
    let targetStoreId = null;
    if (storeId) {
      try {
        targetStoreId = BigInt(storeId.toString().replace(/^st-/, ''));
      } catch (e) {}
    }
    let targetAdminId = null;
    if (adminId) {
      try {
        targetAdminId = BigInt(adminId.toString().replace(/^adm-/, ''));
      } catch (e) {}
    }

    if (!targetStoreId) {
      const targetWs = req.body.workspaceId || req.headers['x-workspace-id'] || user?.workspaceId;
      if (targetWs && targetWs !== 'all') {
        try {
          const cleanWs = BigInt(targetWs.toString().replace(/^ws-/, ''));
          const storeInWs = await prisma.store.findFirst({
            where: { workspace_id: cleanWs },
            select: { store_id: true },
          });
          if (storeInWs) targetStoreId = storeInWs.store_id;
        } catch (e) {
          console.warn('⚠️ [createTemplate] Invalid targetWs:', targetWs);
        }
      }
      if (!targetStoreId) {
        const firstStore = await prisma.store.findFirst({ select: { store_id: true } });
        targetStoreId = firstStore ? firstStore.store_id : 1n;
      }
    }

    if (!targetAdminId) {
      const user = await extractUser(req);
      if (user?.adminId) {
        targetAdminId = BigInt(user.adminId);
      } else {
        const firstAdmin = await prisma.admin.findFirst({ select: { admin_id: true } });
        targetAdminId = firstAdmin ? firstAdmin.admin_id : 1n;
      }
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
    console.error('❌ Error createTemplate:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat template checklist baru',
      error: error.message,
    });
  }
};

/**
 * 4. PUT /api/templates/:id - Update template, kategori & tugas
 */
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
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
      where: { template_id: BigInt(numericId) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Template checklist tidak ditemukan',
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
        where: { template_id: BigInt(numericId) },
        data: updateData,
      });

      // 2. Jika ada categories baru yang dikirimkan, perbarui struktur kategori & tugas
      if (resolvedCategories && Array.isArray(resolvedCategories)) {
        // Hapus kategori lama (otomatis cascade delete tugas)
        await tx.template_category.deleteMany({
          where: { template_id: BigInt(numericId) },
        });

        // Insert kategori & tugas baru
        for (let cIdx = 0; cIdx < resolvedCategories.length; cIdx++) {
          const cat = resolvedCategories[cIdx];
          const catName = (cat.name || '').trim();
          if (!catName) continue;

          const createdCat = await tx.template_category.create({
            data: {
              template_id: BigInt(numericId),
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
      where: { template_id: BigInt(numericId) },
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
    console.error('❌ Error updateTemplate:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui template checklist',
      error: error.message,
    });
  }
};

/**
 * 5. PATCH /api/templates/:id/status - Aktifkan atau Nonaktifkan template
 */
exports.toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return res.status(400).json({
        success: false,
        message: 'Format ID template tidak valid',
      });
    }

    const { status } = req.body;
    let nextStatus = 'active';

    if (status) {
      nextStatus = status === 'Nonaktif' || status === 'inactive' ? 'inactive' : 'active';
    } else {
      // Toggle
      const existing = await prisma.checklist_template.findUnique({
        where: { template_id: BigInt(numericId) },
        select: { status: true },
      });
      if (existing) {
        nextStatus = existing.status === 'active' ? 'inactive' : 'active';
      }
    }

    // Jika ingin menonaktifkan, pastikan tidak ada jadwal audit aktif yang terhubung
    if (nextStatus === 'inactive') {
      const activeSchedules = await prisma.schedule.findMany({
        where: {
          template_id: BigInt(numericId),
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
      where: { template_id: BigInt(numericId) },
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
    console.error('❌ Error toggleStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengubah status template checklist',
      error: error.message,
    });
  }
};

/**
 * 6. DELETE /api/templates/:id - Hapus template (soft delete / permanent)
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return res.status(400).json({
        success: false,
        message: 'Format ID template tidak valid',
      });
    }

    const isPermanent = req.query.permanent === 'true';

    if (isPermanent) {
      await prisma.checklist_template.delete({
        where: { template_id: BigInt(numericId) },
      });
      return res.status(200).json({
        success: true,
        message: 'Template checklist berhasil dihapus secara permanen',
      });
    } else {
      // Pastikan tidak ada jadwal audit aktif yang terhubung sebelum soft delete
      const activeSchedules = await prisma.schedule.findMany({
        where: {
          template_id: BigInt(numericId),
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
        where: { template_id: BigInt(numericId) },
        data: { status: 'inactive' },
      });
      return res.status(200).json({
        success: true,
        message: 'Template checklist berhasil dinonaktifkan',
      });
    }
  } catch (error) {
    console.error('❌ Error deleteTemplate:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus template checklist',
      error: error.message,
    });
  }
};

/**
 * 7. GET /api/templates/stats - Ambil statistik ringkas template
 */
exports.getTemplateStats = async (req, res) => {
  try {
    const user = await extractUser(req);
    const requestedWsId = req.query.workspaceId || req.headers['x-workspace-id'];
    const where = {};

    if (requestedWsId && requestedWsId !== 'all') {
      try {
        const cleanWs = BigInt(requestedWsId.toString().replace(/^ws-/, ''));
        where.store = { workspace_id: cleanWs };
      } catch (e) {}
    } else if (user && user.role === 'Admin' && user.workspaceId) {
      try {
        const cleanWs = BigInt(user.workspaceId.toString().replace(/^ws-/, ''));
        where.store = { workspace_id: cleanWs };
      } catch (e) {}
    }

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
    console.error('❌ Error getTemplateStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil statistik template',
      error: error.message,
    });
  }
};
