const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');
const { syncExpiredSchedulesToDb } = require('../utils/scheduleSync');

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/**
 * GET /api/dashboard/monitoring
 * Mengambil ringkasan data analitik dashboard monitoring dengan aturan penilaian toko:
 * - Terlambat: -2 poin
 * - Issue Kritikal (High): -1 poin
 * - Issue Low (Rendah): -0.5 poin
 * - Tidak Mengerjakan: -5 poin
 */
exports.getMonitoringStats = async (req, res) => {
  try {
    const user = await extractUser(req);
    const {
      workspaceId,
      storeName,
      startDate,
      endDate,
      month,
      status,
    } = req.query;

    const requestedWsId = workspaceId || req.headers['x-workspace-id'];
    let targetWsId = null;

    // 1. ISOLASI TOTAL: Dashboard monitoring WAJIB untuk SATU workspace saja (tidak bisa semua workspace)
    if (requestedWsId && requestedWsId !== 'all') {
      try {
        targetWsId = requestedWsId.toString().replace(/^ws-/, '');
      } catch (e) {}
    }

    if (!targetWsId && user && user.workspaceId) {
      targetWsId = user.workspaceId.toString().replace(/^ws-/, '');
    }

    // Jika Super Admin belum mengirimkan workspaceId spesifik, ambil workspace aktif pertama miliknya
    if (!targetWsId && user && user.role === 'Super Admin' && user.rawId) {
      const firstActiveWs = await prisma.workspace.findFirst({
        where: {
          super_admin_id: BigInt(user.rawId),
          status: 'active',
        },
        orderBy: { workspace_id: 'asc' },
      });
      if (firstActiveWs) {
        targetWsId = firstActiveWs.workspace_id.toString();
      } else {
        const anyWs = await prisma.workspace.findFirst({
          where: { super_admin_id: BigInt(user.rawId) },
          orderBy: { workspace_id: 'asc' },
        });
        if (anyWs) targetWsId = anyWs.workspace_id.toString();
      }
    }

    // Fallback jika masih kosong
    if (!targetWsId) {
      const fallbackWs = await prisma.workspace.findFirst({
        orderBy: { workspace_id: 'asc' },
      });
      if (fallbackWs) {
        targetWsId = fallbackWs.workspace_id.toString();
      }
    }

    if (!targetWsId) {
      return res.status(404).json({
        status: 'error',
        message: 'Tidak ada workspace yang ditemukan untuk monitoring.',
      });
    }

    const cleanWsId = BigInt(targetWsId);
    const storeWhere = { status: 'active', workspace_id: cleanWsId };
    const reportWhere = { schedule: { store: { workspace_id: cleanWsId } } };

    // Ambil info detail workspace yang sedang aktif dimonitor
    const currentWorkspace = await prisma.workspace.findUnique({
      where: { workspace_id: cleanWsId },
      select: {
        workspace_id: true,
        company_name: true,
        status: true,
        category: true,
      },
    });

    // 2. Jalankan auto-sync jadwal kedaluwarsa ke database untuk workspace ini saja
    await syncExpiredSchedulesToDb({ workspaceId: cleanWsId });

    // 3. Ambil seluruh data toko aktif dalam workspace
    const allStores = await prisma.store.findMany({
      where: storeWhere,
      select: {
        store_id: true,
        store_name: true,
        city: true,
        address: true,
      },
      orderBy: { store_name: 'asc' },
    });

    const storeNamesList = allStores.map((s) => s.store_name);

    // 4. Query data seluruh laporan audit
    const reports = await prisma.checklist_report.findMany({
      where: reportWhere,
      include: {
        schedule: {
          include: {
            store: true,
          },
        },
        checklist_answer: {
          include: {
            template_task: true,
          },
        },
        attachment: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // 5. In-Memory Filter berdasarkan parameter (Tanggal / Bulan, Toko, Status)
    let filteredReports = reports;

    // Filter Toko
    if (storeName && storeName !== 'Semua Toko' && !storeName.startsWith('Semua Toko')) {
      filteredReports = filteredReports.filter(
        (r) => r.schedule?.store?.store_name === storeName.trim()
      );
    }

    // Filter Tanggal
    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);
      filteredReports = filteredReports.filter((r) => {
        const d = new Date(r.completed_at || r.started_at || r.created_at || new Date());
        return d >= start && d <= end;
      });
    } else if (month && month !== 'Semua Bulan') {
      filteredReports = filteredReports.filter((r) => {
        const d = new Date(r.completed_at || r.started_at || r.created_at || new Date());
        const mStr = `${INDONESIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
        return mStr.toLowerCase().includes(month.trim().toLowerCase()) ||
               month.trim().toLowerCase().includes(INDONESIAN_MONTHS[d.getMonth()].toLowerCase());
      });
    }

    // Filter Status jika dipilih spesifik
    if (status && status !== 'Status Audit' && status !== 'Semua Status') {
      if (status === 'Selesai') {
        filteredReports = filteredReports.filter(
          (r) => r.status === 'completed' || r.status === 'submitted'
        );
      } else if (status === 'Tidak Mengerjakan') {
        filteredReports = filteredReports.filter(
          (r) => r.status === 'tidak_mengerjakan' || r.status === 'tidak_patuh'
        );
      } else if (status === 'Terlambat') {
        filteredReports = filteredReports.filter(
          (r) => r.status === 'terlambat' || r.status === 'late'
        );
      }
    }

    // 6. Hitung Status Audit (Donut Slices)
    let completedCount = 0;
    let missedCount = 0;
    let lateCount = 0;

    filteredReports.forEach((r) => {
      const st = r.status?.toLowerCase();
      if (st === 'tidak_mengerjakan' || st === 'tidak_patuh') {
        missedCount++;
      } else if (st === 'terlambat' || st === 'late') {
        lateCount++;
      } else {
        completedCount++;
      }
    });

    const auditStatusSegments = [
      { name: 'Selesai', value: completedCount, color: '#193f53' },
      { name: 'Tidak Mengerjakan', value: missedCount, color: '#dc2626' },
      { name: 'Terlambat', value: lateCount, color: '#eab308' },
    ];

    // 7. Hitung Temuan (Findings Analysis) & Performa per Toko
    // Inisialisasi data temuan per toko dan total prioritas
    let totalHighFindings = 0;
    let totalLowFindings = 0;
    const storeStatsMap = new Map();

    // Pastikan setiap toko yang ada di workspace tercatat
    allStores.forEach((st) => {
      storeStatsMap.set(st.store_name, {
        storeId: st.store_id.toString(),
        name: st.store_name,
        completedCount: 0,
        missedCount: 0,
        lateCount: 0,
        criticalIssueCount: 0, // High (-1)
        lowIssueCount: 0,      // Low (-0.5)
        totalFindings: 0,
      });
    });

    filteredReports.forEach((r) => {
      const sName = r.schedule?.store?.store_name;
      if (!sName) return;

      if (!storeStatsMap.has(sName)) {
        storeStatsMap.set(sName, {
          storeId: r.schedule?.store?.store_id?.toString() || '',
          name: sName,
          completedCount: 0,
          missedCount: 0,
          lateCount: 0,
          criticalIssueCount: 0,
          lowIssueCount: 0,
          totalFindings: 0,
        });
      }

      const storeStat = storeStatsMap.get(sName);
      const st = r.status?.toLowerCase();

      if (st === 'tidak_mengerjakan' || st === 'tidak_patuh') {
        storeStat.missedCount++;
      } else if (st === 'terlambat' || st === 'late') {
        storeStat.lateCount++;
      } else {
        storeStat.completedCount++;
      }

      // Hitung temuan butir inspeksi
      if (Array.isArray(r.checklist_answer) && r.checklist_answer.length > 0) {
        r.checklist_answer.forEach((ans) => {
          if (ans.answer === 'no') {
            const task = ans.template_task || {};
            const isHigh = Boolean(task.is_photo_required) || task.priority === 'High';
            if (isHigh) {
              storeStat.criticalIssueCount++;
              totalHighFindings++;
            } else {
              storeStat.lowIssueCount++;
              totalLowFindings++;
            }
            storeStat.totalFindings++;
          }
        });
      } else if (Array.isArray(r.attachment) && r.attachment.length > 0) {
        r.attachment.forEach((att) => {
          let caption = att.caption || '';
          let parsed = {};
          if (caption.startsWith('{')) {
            try {
              parsed = JSON.parse(caption);
            } catch (e) {}
          }
          if (parsed.hasIssue) {
            const isHigh =
              Boolean(parsed.isPhotoRequired ?? parsed.requirePhoto ?? true) ||
              parsed.priority === 'High' ||
              parsed.issueSeverity === 'Tinggi';
            if (isHigh) {
              storeStat.criticalIssueCount++;
              totalHighFindings++;
            } else {
              storeStat.lowIssueCount++;
              totalLowFindings++;
            }
            storeStat.totalFindings++;
          }
        });
      }
    });

    // 8. HITUNG SKOR PERFORMA PER TOKO SESUAI ATURAN USER:
    // - Base: 100 poin
    // - Toko Terlambat: -2 poin
    // - Issue Kritikal (High): -1 poin
    // - Issue Low (Rendah): -0.5 poin
    // - Tidak Mengerjakan: -5 poin
    const storeRanking = Array.from(storeStatsMap.values()).map((s) => {
      const deduction =
        s.lateCount * 2 +
        s.criticalIssueCount * 1 +
        s.lowIssueCount * 0.5 +
        s.missedCount * 5;

      const rawScore = 100 - deduction;
      const score = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

      return {
        name: s.name,
        score,
        lateCount: s.lateCount,
        criticalIssueCount: s.criticalIssueCount,
        lowIssueCount: s.lowIssueCount,
        missedCount: s.missedCount,
        totalFindings: s.totalFindings,
        totalDeduction: deduction,
      };
    });

    // Urutkan dari performa skor tertinggi ke terendah
    storeRanking.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    // 9. Data Analisis Temuan (Prioritas & Top 5 Toko)
    const grandTotalFindings = totalHighFindings + totalLowFindings;
    const findingsPriorities = [
      {
        name: 'High',
        count: totalHighFindings,
        color: '#cc0000',
        percentage: grandTotalFindings > 0 ? Math.round((totalHighFindings / grandTotalFindings) * 100) : 0,
      },
      {
        name: 'Low',
        count: totalLowFindings,
        color: '#eab308',
        percentage: grandTotalFindings > 0 ? Math.round((totalLowFindings / grandTotalFindings) * 100) : 0,
      },
    ];

    const formatShortStoreName = (rawName) => {
      return (rawName || '')
        .replace(/^Mie Gacoan - /i, '')
        .replace(/^Bakso Gacoan - /i, '')
        .replace(/^Jaya Abadi - /i, '')
        .replace(/^Dikichi Chicken - /i, '')
        .replace(/^(Malang|Surabaya|Jakarta|Bandung)\s+/i, ''); // Hapus nama kota agar nama cabang muat dan tidak kepotong
    };

    const topStoresFindings = [...storeRanking]
      .filter((s) => s.totalFindings > 0)
      .sort((a, b) => b.totalFindings - a.totalFindings)
      .slice(0, 5)
      .map((s) => ({
        name: formatShortStoreName(s.name),
        fullName: s.name,
        count: s.totalFindings,
      }));

    // Fallback jika belum ada temuan sama sekali, isi toko teratas dengan 0 temuan agar chart tetap ter-render
    if (topStoresFindings.length === 0) {
      storeRanking.slice(0, 5).forEach((s) => {
        topStoresFindings.push({
          name: formatShortStoreName(s.name),
          fullName: s.name,
          count: 0,
        });
      });
    }

    // 10. Hitung Tren Hasil Audit Mingguan (Minggu 1 s/d 4)
    // Kelompokkan skor audit berdasarkan rentang tanggal 1-7, 8-14, 15-21, 22-31
    const weekBuckets = [
      { week: 'Minggu 1', scores: [] },
      { week: 'Minggu 2', scores: [] },
      { week: 'Minggu 3', scores: [] },
      { week: 'Minggu 4', scores: [] },
    ];

    filteredReports.forEach((r) => {
      const d = new Date(r.completed_at || r.started_at || r.created_at || new Date());
      const day = d.getDate();
      let weekIdx = 0;
      if (day <= 7) weekIdx = 0;
      else if (day <= 14) weekIdx = 1;
      else if (day <= 21) weekIdx = 2;
      else weekIdx = 3;

      let score = 100;
      const isMissed = r.status === 'tidak_mengerjakan' || r.status === 'tidak_patuh';
      if (isMissed) {
        score = 0;
      } else {
        const totalQ = r.total_questions || 8;
        let issues = 0;
        if (Array.isArray(r.checklist_answer)) {
          issues = r.checklist_answer.filter((a) => a.answer === 'no').length;
        }
        score = Math.max(0, Math.min(100, Math.round(((totalQ - issues) / totalQ) * 100)));
      }
      weekBuckets[weekIdx].scores.push(score);
    });

    // Default skor rata-rata mingguan jika tidak ada audit pada minggu tersebut
    let prevScore = 80;
    const weeklyTrend = weekBuckets.map((wb) => {
      if (wb.scores.length > 0) {
        const avg = Math.round((wb.scores.reduce((a, b) => a + b, 0) / wb.scores.length) * 10) / 10;
        prevScore = avg;
        return { week: wb.week, score: avg };
      }
      return { week: wb.week, score: prevScore };
    });

    // 11. Susun Objek Metrik Ringkasan Utama
    const metrics = {
      totalStores: allStores.length,
      completedAudits: completedCount,
      pendingAudits: missedCount,
      totalFindings: grandTotalFindings,
      resolvedFindings: 0,
      openFindings: grandTotalFindings,
    };

    return res.status(200).json({
      status: 'success',
      data: {
        workspace: currentWorkspace
          ? {
              id: currentWorkspace.workspace_id.toString(),
              name: currentWorkspace.company_name,
              status: currentWorkspace.status,
              category: currentWorkspace.category,
            }
          : null,
        metrics,
        auditStatusSegments,
        weeklyTrend,
        storeRanking,
        findingsAnalysis: {
          priorities: findingsPriorities,
          totalFindings: grandTotalFindings,
          topStores: topStoresFindings,
        },
        stores: [`Semua Toko (${allStores.length})`, ...storeNamesList],
      },
    });
  } catch (error) {
    console.error('❌ Error in getMonitoringStats:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data dashboard monitoring.',
      error: error.message,
    });
  }
};
