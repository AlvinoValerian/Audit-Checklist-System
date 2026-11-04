const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');
const { decryptImage, isEncrypted } = require('../utils/crypto.utils');

/**
 * Helper untuk dekripsi attachment URL yang tersimpan dalam format bytes/encrypted
 */
const decryptAttachmentUrl = (file_url) => {
  if (!file_url) return '';
  let raw = '';
  if (Buffer.isBuffer(file_url)) {
    raw = file_url.toString('utf-8');
  } else if (file_url instanceof Uint8Array || Array.isArray(file_url)) {
    raw = Buffer.from(file_url).toString('utf-8');
  } else if (typeof file_url === 'string') {
    if (/^\d+(,\d+)+$/.test(file_url)) {
      const nums = file_url.split(',').map((n) => parseInt(n, 10));
      raw = Buffer.from(nums).toString('utf-8');
    } else {
      raw = file_url;
    }
  } else if (file_url.data && Array.isArray(file_url.data)) {
    raw = Buffer.from(file_url.data).toString('utf-8');
  }

  return isEncrypted(raw) ? decryptImage(raw) : raw;
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
const formatReportItem = (report) => {
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
      const task = ans.template_task || {};
      const cat = task.template_category || {};
      const isIssue = ans.answer === 'no';
      if (isIssue) issueCount++;

      let photoUrl = '';
      let photoCaption = '';
      if (Array.isArray(ans.attachment) && ans.attachment.length > 0) {
        photoUrl = decryptAttachmentUrl(ans.attachment[0].file_url);
        photoCaption = ans.attachment[0].caption || '';
      } else if (Array.isArray(report.attachment) && report.attachment[idx]) {
        photoUrl = decryptAttachmentUrl(report.attachment[idx].file_url);
        photoCaption = report.attachment[idx].caption || '';
      }

      findings.push({
        id: `finding-${ans.answer_id ? ans.answer_id.toString() : idx + 1}`,
        itemTitle: task.task_description || `Pemeriksaan Butir ${idx + 1}`,
        category: cat.category_name || 'Operasional Toko',
        hasIssue: isIssue,
        issueNote: ans.comment || (isIssue ? 'Ditemukan ketidaksesuaian butir checklist saat inspeksi lapangan.' : undefined),
        severity: isIssue ? (task.priority === 'High' ? 'Tinggi' : task.priority === 'Medium' ? 'Sedang' : 'Rendah') : undefined,
        photoUrl: photoUrl || undefined,
        photoCaption: photoCaption || undefined,
        photoTimestamp: submitTimeStr,
        recommendation: isIssue ? `Lakukan tindakan perbaikan pada area ${cat.category_name || 'terkait'} maksimal 1x24 jam.` : undefined,
        auditorNote: ans.comment || (!isIssue ? 'Kondisi memenuhi standar operasional prima.' : undefined),
      });
    });
  } else if (Array.isArray(report.attachment) && report.attachment.length > 0) {
    // 2. Jika jawaban butir belum ada di tabel jawaban, ambil temuan dari attachment metadata
    report.attachment.forEach((att, idx) => {
      let caption = att.caption || '';
      let parsed = {};
      if (caption.startsWith('{')) {
        try {
          parsed = JSON.parse(caption);
        } catch (e) {}
      }

      const isIssue = Boolean(parsed.hasIssue);
      if (isIssue) issueCount++;

      findings.push({
        id: `finding-att-${att.attachment_id ? att.attachment_id.toString() : idx + 1}`,
        itemTitle: parsed.checklistQuestion || parsed.caption || att.caption || `Pemeriksaan Area ${idx + 1}`,
        category: parsed.category || 'Area Toko & Operasional',
        hasIssue: isIssue,
        issueNote: parsed.issueDescription || parsed.description || att.caption,
        severity: isIssue ? (parsed.issueSeverity || 'Tinggi') : undefined,
        photoUrl: decryptAttachmentUrl(att.file_url),
        photoCaption: parsed.caption || att.caption || `Foto_Audit_${idx + 1}.jpg`,
        photoTimestamp: submitTimeStr,
        recommendation: isIssue ? 'Lakukan perbaikan dan koordinasi dengan Store Manager maksimal 1x24 jam.' : undefined,
        auditorNote: parsed.description || (!isIssue ? 'Memenuhi standar SOP toko.' : undefined),
      });
    });
  }

  const totalQuestions = report.total_questions || (findings.length > 0 ? findings.length : 1);
  const complianceScore = Math.max(
    0,
    Math.min(100, Math.round(((totalQuestions - issueCount) / totalQuestions) * 100))
  );
  const status = issueCount > 0 ? 'Masalah' : 'Sesuai';

  let summaryNote = '';
  if (issueCount > 0) {
    summaryNote = `Ditemukan ${issueCount} ketidaksesuaian butir checklist yang memerlukan perhatian dan tindak lanjut perbaikan operasional toko.`;
  } else {
    summaryNote = 'Seluruh aspek operasional, kebersihan, dan keselamatan gerai memenuhi standar SOP prima.';
  }

  // Ambil tanda tangan digital jika ada attachment dengan file_type 'signature'
  let signatureUrl = '';
  if (Array.isArray(report.attachment)) {
    const sig = report.attachment.find((a) => a.file_type === 'signature');
    if (sig) signatureUrl = decryptAttachmentUrl(sig.file_url);
  }

  return {
    id: `rep-${report.report_id.toString()}`,
    storeName: store.store_name || 'Outlet Ritel Audit',
    storeLocation: store.city || store.address || 'Indonesia',
    scheduleName: schedule.title || 'Checklist Operasional Harian',
    auditorName: staff.name || 'Auditor Lapangan',
    auditorRole: staff.position || 'Auditor Lapangan',
    submitDate: submitDateStr,
    submitTime: submitTimeStr,
    month: monthStr,
    status,
    issueCount,
    complianceScore,
    summaryNote,
    findings,
    signatureUrl: signatureUrl || undefined,
    auditorPhoto: staff.photo || undefined,
    workspaceName: workspace.company_name || 'Workspace',
  };
};

/**
 * GET /api/reports atau GET /api/laporan
 * Mengambil seluruh data laporan audit dari database dengan filter
 */
exports.getAllReports = async (req, res) => {
  try {
    const user = await extractUser(req);
    const {
      workspaceId,
      storeName,
      scheduleName,
      month,
      status,
      search,
    } = req.query;

    const requestedWsId = workspaceId || req.headers['x-workspace-id'];
    const where = {};

    // 1. Isolasi Workspace & Hak Akses Role
    if (user && (user.role === 'Divisi Teknis' || user.role === 'Teknis') && user.workspaceId) {
      where.schedule = { store: { workspace_id: BigInt(user.workspaceId) } };
    } else if (requestedWsId && requestedWsId !== 'all') {
      try {
        const cleanWs = BigInt(requestedWsId.toString().replace(/^ws-/, ''));
        where.schedule = { store: { workspace_id: cleanWs } };
      } catch (e) {}
    } else if (user && user.role === 'Admin' && user.workspaceId) {
      where.schedule = { store: { workspace_id: BigInt(user.workspaceId) } };
    } else if (user && user.role === 'Super Admin' && user.rawId) {
      where.schedule = {
        store: {
          workspace: { super_admin_id: BigInt(user.rawId) },
        },
      };
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

    // 4. Query PostgreSQL
    const reports = await prisma.checklist_report.findMany({
      where,
      include: {
        schedule: {
          include: {
            store: {
              include: { workspace: true },
            },
            checklist_template: true,
          },
        },
        staff: true,
        attachment: {
          orderBy: { attachment_id: 'asc' },
        },
        checklist_answer: {
          include: {
            template_task: {
              include: { template_category: true },
            },
            attachment: true,
          },
          orderBy: { answer_id: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    let formatted = reports.map(formatReportItem);

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
      }
    }

    return res.status(200).json({
      status: 'success',
      data: formatted,
      meta: {
        total: formatted.length,
      },
    });
  } catch (error) {
    console.error('❌ Error in getAllReports:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data laporan audit dari database.',
      error: error.message,
    });
  }
};

/**
 * GET /api/reports/meta atau GET /api/laporan/meta
 * Mengambil opsi filter dinamis (daftar toko, jadwal, bulan)
 */
exports.getReportMeta = async (req, res) => {
  try {
    const user = await extractUser(req);
    const requestedWsId = req.query.workspaceId || req.headers['x-workspace-id'];
    const where = {};

    if (user && (user.role === 'Divisi Teknis' || user.role === 'Teknis') && user.workspaceId) {
      where.schedule = { store: { workspace_id: BigInt(user.workspaceId) } };
    } else if (requestedWsId && requestedWsId !== 'all') {
      try {
        where.schedule = { store: { workspace_id: BigInt(requestedWsId.toString().replace(/^ws-/, '')) } };
      } catch (e) {}
    } else if (user && user.role === 'Admin' && user.workspaceId) {
      where.schedule = { store: { workspace_id: BigInt(user.workspaceId) } };
    } else if (user && user.role === 'Super Admin' && user.rawId) {
      where.schedule = { store: { workspace: { super_admin_id: BigInt(user.rawId) } } };
    }

    const reports = await prisma.checklist_report.findMany({
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
    });

    const stores = Array.from(new Set(reports.map((r) => r.schedule?.store?.store_name).filter(Boolean)));
    const schedules = Array.from(new Set(reports.map((r) => r.schedule?.title).filter(Boolean)));
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
    console.error('❌ Error in getReportMeta:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil metadata laporan audit.',
      error: error.message,
    });
  }
};

/**
 * GET /api/reports/:id atau GET /api/laporan/:id
 * Mengambil satu laporan audit berdasarkan ID
 */
exports.getReportById = async (req, res) => {
  try {
    const rawId = req.params.id.replace(/^rep-/, '');
    const reportId = BigInt(rawId);

    const report = await prisma.checklist_report.findUnique({
      where: { report_id: reportId },
      include: {
        schedule: {
          include: {
            store: {
              include: { workspace: true },
            },
            checklist_template: true,
          },
        },
        staff: true,
        attachment: {
          orderBy: { attachment_id: 'asc' },
        },
        checklist_answer: {
          include: {
            template_task: {
              include: { template_category: true },
            },
            attachment: true,
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

    return res.status(200).json({
      status: 'success',
      data: formatReportItem(report),
    });
  } catch (error) {
    console.error('❌ Error in getReportById:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil detail laporan audit.',
      error: error.message,
    });
  }
};
