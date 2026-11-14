const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');
const { decryptAttachmentUrl, hydrateAttachmentUrls } = require('../utils/attachmentCache');
const { syncExpiredSchedulesToDb } = require('../utils/scheduleSync');
const { toBigIntSafe } = require('../utils/teknisScope');
const {
  resolveScopedWorkspaceContext,
  assertWorkspaceAccess,
  sendSafeError,
} = require('../utils/tenantScope');

const getResolvedAttachmentUrl = (att) => {
  if (!att) return '';
  if (att.attachment_id) {
    return `/api/attachments/${att.attachment_id.toString()}/image`;
  }
  if (att._decryptedUrl !== undefined) return att._decryptedUrl;
  return decryptAttachmentUrl(att.file_url);
};

const formatDateString = (dateObj) => {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatTimeString = (timeVal) => {
  if (!timeVal) return '--:--';
  if (typeof timeVal === 'string') {
    const timeMatch = timeVal.match(/(\d{2}):(\d{2})/);
    if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;
  }
  const date = new Date(timeVal);
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Helper format entitas checklist_report ke interface AuditReportItem
 */
const formatReportItem = (report, options = {}) => {
  const { summaryOnly = false } = options;
  const schedule = report.schedule || {};
  const store = schedule.store || {};
  const staff = report.staff || {};
  const workspace = store.workspace || {};

  const reportDate = report.completed_at || report.started_at || report.created_at || new Date();
  const d = new Date(reportDate);

  const submitDateStr = `${d.getDate()} ${INDONESIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const submitTimeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`;
  const monthStr = `${INDONESIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;

  const findings = [];
  let issueCount = 0;

  // 1. Ambil temuan dari checklist_answer jika ada
  if (Array.isArray(report.checklist_answer) && report.checklist_answer.length > 0) {
    report.checklist_answer.forEach((ans, idx) => {
      const isIssue = ans.answer === 'no';
      if (isIssue) issueCount++;
      if (summaryOnly) return;

      const task = ans.template_task || {};
      const cat = task.template_category || {};

      let photoUrl = '';
      let photoCaption = '';
      if (Array.isArray(ans.attachment) && ans.attachment.length > 0) {
        photoUrl = getResolvedAttachmentUrl(ans.attachment[0]);
        photoCaption = ans.attachment[0].caption || '';
      } else if (Array.isArray(report.attachment) && report.attachment.length > 0) {
        const taskAtt = report.attachment.find(
          (a) => a.answer_id && ans.answer_id && a.answer_id.toString() === ans.answer_id.toString()
        );

        if (taskAtt) {
          photoUrl = getResolvedAttachmentUrl(taskAtt);
          photoCaption = taskAtt.caption || '';
        }
      }

      // Priority ditentukan DARI WAKTU CHECKLIST DIBUAT:
      // Aturan: Wajib foto (is_photo_required = true) => Priority High ('Tinggi')
      //         Tidak wajib foto (is_photo_required = false) => Priority Low ('Rendah')
      const isPhotoRequired = Boolean(task.is_photo_required);
      const priority = isPhotoRequired || task.priority === 'High' ? 'High' : 'Low';
      const severity = priority === 'High' ? 'Tinggi' : 'Rendah';

      findings.push({
        id: `finding-${ans.answer_id ? ans.answer_id.toString() : idx + 1}`,
        itemTitle: task.task_description || `Pemeriksaan Butir ${idx + 1}`,
        category: cat.category_name || 'Operasional Toko',
        hasIssue: isIssue,
        isPhotoRequired,
        priority, // 'High' | 'Low'
        severity, // 'Tinggi' | 'Rendah'
        issueNote: ans.comment || (isIssue ? 'Ditemukan ketidaksesuaian butir checklist saat inspeksi lapangan.' : undefined),
        photoUrl: photoUrl || undefined,
        photoCaption: photoCaption || undefined,
        photoTimestamp: submitTimeStr,
        recommendation: isIssue ? `Lakukan tindakan perbaikan pada area ${cat.category_name || 'terkait'} maksimal 1x24 jam.` : undefined,
        auditorNote: ans.comment || (!isIssue ? 'Kondisi memenuhi standar operasional prima.' : undefined),
      });
    });
  } else if (Array.isArray(report.attachment) && report.attachment.length > 0) {
    // 2. Jika jawaban butir belum ada di tabel jawaban, ambil temuan dari attachment metadata
    const taskPhotos = report.attachment.filter((a) => a.file_type === 'task_photo' || !a.file_type);
    (taskPhotos.length > 0 ? taskPhotos : report.attachment).forEach((att, idx) => {
      let caption = att.caption || '';
      let parsed = {};
      if (caption.startsWith('{')) {
        try {
          parsed = JSON.parse(caption);
        } catch (e) {}
      }

      const isIssue = Boolean(parsed.hasIssue);
      if (isIssue) issueCount++;
      if (summaryOnly) return;

      const isPhotoRequired = Boolean(parsed.isPhotoRequired ?? parsed.requirePhoto ?? true);
      const priority = isPhotoRequired || parsed.priority === 'High' || parsed.issueSeverity === 'Tinggi' ? 'High' : 'Low';
      const severity = priority === 'High' ? 'Tinggi' : 'Rendah';

      findings.push({
        id: `finding-att-${att.attachment_id ? att.attachment_id.toString() : idx + 1}`,
        itemTitle: parsed.checklistQuestion || parsed.caption || att.caption || `Pemeriksaan Area ${idx + 1}`,
        category: parsed.category || 'Area Toko & Operasional',
        hasIssue: isIssue,
        isPhotoRequired,
        priority,
        severity,
        issueNote: parsed.issueDescription || parsed.description || att.caption,
        photoUrl: getResolvedAttachmentUrl(att),
        photoCaption: parsed.caption || att.caption || `Foto_Audit_${idx + 1}.jpg`,
        photoTimestamp: submitTimeStr,
        recommendation: isIssue ? 'Lakukan perbaikan dan koordinasi dengan Store Manager maksimal 1x24 jam.' : undefined,
        auditorNote: parsed.description || (!isIssue ? 'Memenuhi standar SOP toko.' : undefined),
      });
    });
  }

  const isNonCompliant = report.status === 'tidak_mengerjakan' || report.status === 'tidak_patuh';
  const totalQuestions = report.total_questions || (findings.length > 0 ? findings.length : 1);
  const complianceScore = isNonCompliant
    ? 0
    : Math.max(0, Math.min(100, Math.round(((totalQuestions - issueCount) / totalQuestions) * 100)));
  const status = isNonCompliant
    ? 'Tidak Mengerjakan'
    : (issueCount > 0 ? 'Masalah' : 'Sesuai');

  let summaryNote = '';
  if (isNonCompliant) {
    summaryNote = 'Tugas audit ini ditutup otomatis oleh sistem karena staf melewati batas toleransi keterlambatan tanpa penyerahan checklist (Tidak Mengerjakan / Tidak Patuh).';
  } else if (issueCount > 0) {
    summaryNote = `Ditemukan ${issueCount} ketidaksesuaian butir checklist yang memerlukan perhatian dan tindak lanjut perbaikan operasional toko.`;
  } else {
    summaryNote = 'Seluruh aspek operasional, kebersihan, dan keselamatan gerai memenuhi standar SOP prima.';
  }

  // Ambil tanda tangan digital & foto selfie verifikasi auditor jika ada
  let signatureUrl = '';
  let selfieUrl = '';
  if (!summaryOnly && !isNonCompliant && Array.isArray(report.attachment)) {
    const sig = report.attachment.find((a) => a.file_type === 'signature');
    if (sig) signatureUrl = getResolvedAttachmentUrl(sig);

    const selfie = report.attachment.find((a) => a.file_type === 'report_photo');
    if (selfie) selfieUrl = getResolvedAttachmentUrl(selfie);
  }
  const auditorPhoto = summaryOnly || isNonCompliant ? undefined : (selfieUrl || (staff.photo ? decryptAttachmentUrl(staff.photo) : undefined));

  return {
    id: `rep-${report.report_id.toString()}`,
    storeName: store.store_name || 'Outlet Ritel Audit',
    storeLocation: store.city || store.address || 'Indonesia',
    scheduleName: schedule.title || 'Checklist Operasional Harian',
    auditorName: isNonCompliant ? '-' : (staff.name || 'Auditor Lapangan'),
    auditorRole: isNonCompliant ? '-' : (staff.position || 'Auditor Lapangan'),
    submitDate: submitDateStr,
    submitTime: submitTimeStr,
    month: monthStr,
    status,
    issueCount,
    complianceScore,
    summaryNote,
    findings,
    signatureUrl: summaryOnly || isNonCompliant ? undefined : (signatureUrl || undefined),
    auditorPhoto,
    workspaceName: workspace.company_name || 'Workspace',
  };
};

/**
 * GET /api/reports atau GET /api/laporan
 * Mengambil seluruh data laporan audit dari database dengan filter
 */
exports.getAllReports = async (req, res) => {
  try {
    const user = req.user || (await extractUser(req));
    const {
      workspaceId,
      storeName,
      scheduleName,
      month,
      status,
      search,
      page,
      limit,
    } = req.query;

    const requestedWsId = workspaceId || req.headers['x-workspace-id'];
    const scope = await resolveScopedWorkspaceContext(user, requestedWsId, {
      teknisUseSingleDefaultOnAll: true,
    });
    if (!scope.ok) {
      return res.status(scope.status).json({ status: 'error', message: scope.message });
    }
    if (scope.workspaceIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: [],
        meta: { total: 0 },
      });
    }

    const where = {
      schedule: {
        store: scope.prismaWorkspaceWhere.workspace_id
          ? { workspace_id: scope.prismaWorkspaceWhere.workspace_id }
          : { workspace: scope.prismaWorkspaceWhere },
      },
    };

    // Auto-sinkronisasi jadwal yang melewati toleransi untuk workspace dalam lingkup user
    for (const wsId of scope.workspaceIds) {
      await syncExpiredSchedulesToDb({ workspaceId: wsId });
    }

    // 2. Filter Store
    if (storeName && storeName !== 'Semua Toko') {
      where.schedule = {
        ...(where.schedule || {}),
        store: {
          ...(where.schedule?.store || {}),
          store_name: { contains: storeName.trim(), mode: 'insensitive' },
        },
      };
    }

    // 3. Filter Schedule
    if (scheduleName && scheduleName !== 'Semua Jadwal') {
      where.schedule = {
        ...(where.schedule || {}),
        title: { contains: scheduleName.trim(), mode: 'insensitive' },
      };
    }

    // 4. Query PostgreSQL (hanya metadata teks, hindari join tabel template & blob bytes yang berat)
    const reports = await prisma.checklist_report.findMany({
      where,
      select: {
        report_id: true,
        schedule_id: true,
        staff_id: true,
        started_at: true,
        completed_at: true,
        created_at: true,
        status: true,
        total_questions: true,
        schedule: {
          select: {
            title: true,
            store: {
              select: {
                store_id: true,
                store_name: true,
                city: true,
                address: true,
                workspace: {
                  select: { company_name: true },
                },
              },
            },
          },
        },
        staff: {
          select: {
            name: true,
          },
        },
        attachment: {
          select: {
            caption: true,
            file_type: true,
          },
        },
        checklist_answer: {
          select: {
            answer: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    let formatted = reports.map((r) => formatReportItem(r, { summaryOnly: true }));

    // 5. In-Memory Filters (Search, Month, Status)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      formatted = formatted.filter(
        (r) =>
          r.storeName.toLowerCase().includes(q) ||
          r.storeLocation.toLowerCase().includes(q) ||
          r.auditorName.toLowerCase().includes(q) ||
          r.scheduleName.toLowerCase().includes(q)
      );
    }

    if (month && month !== 'Semua Bulan') {
      formatted = formatted.filter((r) => r.month.toLowerCase() === month.trim().toLowerCase());
    }

    if (status && status !== 'Semua Status') {
      if (status === 'Masalah' || status === 'Ada Masalah') {
        formatted = formatted.filter((r) => r.status === 'Masalah');
      } else if (status === 'Sesuai') {
        formatted = formatted.filter((r) => r.status === 'Sesuai');
      } else if (status === 'Tidak Mengerjakan' || status === 'Tidak Patuh') {
        formatted = formatted.filter((r) => r.status === 'Tidak Mengerjakan');
      }
    }

    // 6. Pagination Server-Side (Opsional: kompatibel mundur jika limit tidak diberikan)
    const total = formatted.length;
    let paginated = formatted;
    let pageNum = 1;
    let limitNum = total;
    let totalPages = 1;

    if (limit && !isNaN(parseInt(limit, 10)) && parseInt(limit, 10) > 0) {
      limitNum = parseInt(limit, 10);
      pageNum = page && !isNaN(parseInt(page, 10)) && parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
      totalPages = Math.ceil(total / limitNum) || 1;
      const startIndex = (pageNum - 1) * limitNum;
      paginated = formatted.slice(startIndex, startIndex + limitNum);
    }

    return res.status(200).json({
      status: 'success',
      data: paginated,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengambil data laporan audit dari database.');
  }
};

/**
 * GET /api/reports/meta atau GET /api/laporan/meta
 * Mengambil opsi filter dinamis (daftar toko, jadwal, bulan)
 */
exports.getReportMeta = async (req, res) => {
  try {
    const user = req.user || (await extractUser(req));
    const requestedWsId = req.query.workspaceId || req.headers['x-workspace-id'];
    const scope = await resolveScopedWorkspaceContext(user, requestedWsId, {
      teknisUseSingleDefaultOnAll: true,
    });
    if (!scope.ok) {
      return res.status(scope.status).json({ status: 'error', message: scope.message });
    }
    if (scope.workspaceIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: { stores: [], schedules: [], months: [] },
      });
    }

    const storeWhere = scope.prismaWorkspaceWhere.workspace_id
      ? { workspace_id: scope.prismaWorkspaceWhere.workspace_id }
      : { workspace: scope.prismaWorkspaceWhere };
    const where = { schedule: { store: storeWhere } };
    const scheduleWhere = {
      deleted_at: null,
      status: { not: 'cancelled' },
      store: storeWhere,
    };

    for (const wsId of scope.workspaceIds) {
      await syncExpiredSchedulesToDb({ workspaceId: wsId });
    }

    const [dbStores, dbSchedules, reports] = await Promise.all([
      prisma.store.findMany({
        where: storeWhere,
        select: { store_name: true },
        orderBy: { store_name: 'asc' },
      }),
      prisma.schedule.findMany({
        where: scheduleWhere,
        select: { title: true },
        distinct: ['title'],
        orderBy: { title: 'asc' },
      }),
      prisma.checklist_report.findMany({
        where,
        select: {
          completed_at: true,
          started_at: true,
          created_at: true,
          schedule: {
            select: {
              title: true,
              store: {
                select: { store_name: true },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const storeSet = new Set(dbStores.map((s) => s.store_name).filter(Boolean));
    reports.forEach((r) => {
      if (r.schedule?.store?.store_name) storeSet.add(r.schedule.store.store_name);
    });
    const stores = Array.from(storeSet);

    const scheduleSet = new Set(dbSchedules.map((s) => s.title).filter(Boolean));
    reports.forEach((r) => {
      if (r.schedule?.title) scheduleSet.add(r.schedule.title);
    });
    const schedules = Array.from(scheduleSet);

    const months = Array.from(
      new Set(
        reports.map((r) => {
          const d = new Date(r.completed_at || r.started_at || r.created_at || new Date());
          return `${INDONESIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
        })
      )
    );

    return res.status(200).json({
      status: 'success',
      data: {
        stores,
        schedules,
        months,
      },
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengambil metadata laporan audit.');
  }
};

/**
 * GET /api/reports/:id atau GET /api/laporan/:id
 * Mengambil satu laporan audit berdasarkan ID
 */
exports.getReportById = async (req, res) => {
  try {
    const user = req.user || (await extractUser(req));
    const rawId = req.params.id.replace(/^rep-/, '');

    // Tangani laporan jadwal yang tidak dikerjakan
    if (rawId.startsWith('uncompleted-')) {
      const schedId = toBigIntSafe(rawId.replace(/^uncompleted-/, ''), ['sch-']);
      if (!schedId) {
        return res.status(400).json({
          status: 'error',
          message: 'Format ID laporan tidak valid.',
        });
      }
      const s = await prisma.schedule.findUnique({
        where: { schedule_id: schedId },
        include: {
          store: { include: { workspace: true } },
          checklist_template: true,
          schedule_staff: { include: { staff: true } },
        },
      });
      if (!s) {
        return res.status(404).json({
          status: 'error',
          message: 'Laporan audit tidak ditemukan.',
        });
      }
      const wsAccess = await assertWorkspaceAccess(user, s.store?.workspace_id);
      if (!wsAccess.ok) {
        return res.status(wsAccess.status).json({
          status: 'error',
          message: 'Anda tidak memiliki akses ke laporan milik workspace lain.',
        });
      }
      const now = new Date();
      const wibTimestamp = now.getTime() + 7 * 60 * 60 * 1000;
      const wibDate = new Date(wibTimestamp);
      const submitDateStr = `${wibDate.getUTCDate()} ${INDONESIAN_MONTHS[wibDate.getUTCMonth()]} ${wibDate.getUTCFullYear()}`;
      const submitTimeStr = `${formatTimeString(s.end_time)} WIB`;
      const monthStr = `${INDONESIAN_MONTHS[wibDate.getUTCMonth()]} ${wibDate.getUTCFullYear()}`;

      return res.status(200).json({
        status: 'success',
        data: {
          id: `rep-uncompleted-${s.schedule_id}`,
          storeName: s.store?.store_name || 'Outlet Ritel Audit',
          storeLocation: s.store?.city || s.store?.address || 'Indonesia',
          scheduleName: s.title || s.checklist_template?.template_name || 'Checklist Operasional Harian',
          auditorName: '-',
          auditorRole: '-',
          submitDate: submitDateStr,
          submitTime: submitTimeStr,
          month: monthStr,
          status: 'Tidak Mengerjakan',
          issueCount: 0,
          complianceScore: 0,
          summaryNote: 'Tugas audit ini ditutup otomatis oleh sistem karena staf melewati batas toleransi keterlambatan 1 jam tanpa penyerahan checklist (Tidak Mengerjakan / Tidak Patuh).',
          findings: [],
          signatureUrl: undefined,
          auditorPhoto: undefined,
          workspaceName: s.store?.workspace?.company_name || 'Workspace',
        },
      });
    }

    const reportId = toBigIntSafe(rawId);
    if (!reportId) {
      return res.status(400).json({
        status: 'error',
        message: 'Format ID laporan tidak valid.',
      });
    }

    const report = await prisma.checklist_report.findUnique({
      where: { report_id: reportId },
      select: {
        report_id: true,
        schedule_id: true,
        staff_id: true,
        started_at: true,
        completed_at: true,
        created_at: true,
        status: true,
        total_questions: true,
        schedule: {
          select: {
            title: true,
            store: {
              select: {
                store_id: true,
                workspace_id: true,
                store_name: true,
                city: true,
                address: true,
                workspace: {
                  select: { company_name: true },
                },
              },
            },
          },
        },
        staff: {
          select: {
            name: true,
            photo: true,
          },
        },
        attachment: {
          select: {
            attachment_id: true,
            report_id: true,
            answer_id: true,
            file_type: true,
            caption: true,
            updated_at: true,
          },
          orderBy: { attachment_id: 'asc' },
        },
        checklist_answer: {
          select: {
            answer_id: true,
            answer: true,
            comment: true,
            template_task: {
              select: {
                task_description: true,
                is_photo_required: true,
                priority: true,
                template_category: {
                  select: { category_name: true },
                },
              },
            },
          },
          orderBy: { answer_id: 'asc' },
        },
      },
    });

    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: 'Laporan audit tidak ditemukan.',
      });
    }

    const wsAccess = await assertWorkspaceAccess(user, report.schedule?.store?.workspace_id);
    if (!wsAccess.ok) {
      return res.status(wsAccess.status).json({
        status: 'error',
        message: 'Anda tidak memiliki akses ke laporan milik workspace lain.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: formatReportItem(report, { summaryOnly: false }),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengambil detail laporan audit.');
  }
};
