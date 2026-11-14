const prisma = require('../config/prisma');

/**
 * Service untuk mengumpulkan data riil dari PostgreSQL:
 * - schedule (jadwal audit)
 * - checklist_template, template_category, template_task (template butir periksa)
 * - checklist_report (laporan audit terkirim, status tidak_mengerjakan, skor)
 * - checklist_answer (jawaban NO / temuan ketidaksesuaian)
 * - store (daftar toko)
 * - store_holiday (daftar libur toko)
 *
 * Dilengkapi Smart Aggregations dan Dynamic Intent Filtering agar AI
 * mengetahui jumlah total eksak di database (bukan sekadar sampel terpotong).
 */
const AuditContextService = {
  /**
   * Mengambil dan merangkum konteks data audit terkini untuk AI
   * @param {Object} user - Identitas user (role, workspaceId, rawId)
   * @param {string} userQuestion - Pertanyaan user
   * @returns {Promise<string>} String ringkasan data untuk AI
   */
  async getLiveAuditDatabaseContext(user, userQuestion = '') {
    try {
      const q = (userQuestion || '').toLowerCase();

      // 1. Tentukan Filter Workspace
      let wsFilter = null;
      if (user?.workspaceId) {
        try {
          const cleanWs = user.workspaceId.toString().replace(/^ws-/, '');
          wsFilter = BigInt(cleanWs);
        } catch (e) {}
      }

      // Base Where Clauses
      const storeWhere = wsFilter ? { workspace_id: wsFilter, status: { not: 'deleted' } } : { status: { not: 'deleted' } };
      const holidayWhere = {
        deleted_at: null,
        ...(wsFilter ? { workspace_id: wsFilter } : {})
      };
      const reportBaseWhere = {
        ...(wsFilter ? { schedule: { store: { workspace_id: wsFilter } } } : {}),
      };

      // 2. Deteksi Maksud Pertanyaan (Smart Intent Detection)
      let reportFilterWhere = { ...reportBaseWhere };
      let reportTake = 50; // Standar default dinaikkan dari 15 ke 50

      if (
        q.includes('tidak_mengerjakan') ||
        q.includes('tidak mengerjakan') ||
        q.includes('kelalaian') ||
        q.includes('terlewat') ||
        q.includes('alpa') ||
        q.includes('belum mengerjakan') ||
        q.includes('lewat')
      ) {
        reportFilterWhere = {
          ...reportBaseWhere,
          status: 'tidak_mengerjakan',
        };
        reportTake = 65; // Ambil hingga 65 data jika fokus pada kelalaian
      } else if (q.includes('terlambat')) {
        reportFilterWhere = {
          ...reportBaseWhere,
          status: 'terlambat',
        };
      } else if (q.includes('selesai') || q.includes('completed')) {
        reportFilterWhere = {
          ...reportBaseWhere,
          status: 'completed',
        };
      } else if (q.includes('submitted')) {
        reportFilterWhere = {
          ...reportBaseWhere,
          status: 'submitted',
        };
      }

      // 3. Query Data Secara Paralel (Resilien & Lengkap dengan Agregasi)
      const [
        storesResult,
        holidaysResult,
        schedulesResult,
        templatesResult,
        reportCountResult,
        reportStatusGroupResult,
        reportsResult,
        findingsResult,
      ] = await Promise.allSettled([
        // A. Daftar Toko
        prisma.store.findMany({
          where: storeWhere,
          select: {
            store_id: true,
            store_name: true,
            city: true,
            status: true,
          },
          take: 30,
        }),

        // B. Jadwal Libur Toko (store_holiday)
        prisma.store_holiday.findMany({
          where: holidayWhere,
          select: {
            holiday_id: true,
            store_name: true,
            store_location: true,
            start_date: true,
            end_date: true,
            duration_days: true,
            reason: true,
            status: true,
            libur_type: true,
          },
          orderBy: { start_date: 'desc' },
          take: 15,
        }),

        // C. Jadwal Audit (schedule)
        prisma.schedule.findMany({
          where: {
            status: { not: 'deleted' },
            ...(wsFilter ? { store: { workspace_id: wsFilter } } : {}),
          },
          include: {
            store: { select: { store_name: true, city: true } },
            checklist_template: { select: { template_name: true } },
            schedule_staff: {
              include: {
                staff: { select: { name: true } },
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: 25,
        }),

        // D. Template Checklist (checklist_template)
        prisma.checklist_template.findMany({
          where: {
            status: { not: 'deleted' },
            ...(wsFilter ? { store: { workspace_id: wsFilter } } : {}),
          },
          include: {
            store: { select: { store_name: true } },
            template_category: {
              include: {
                template_task: {
                  select: {
                    task_id: true,
                    task_description: true,
                    priority: true,
                  },
                },
              },
            },
          },
          take: 15,
        }),

        // E1. Total Seluruh Laporan Audit di Database (Agregat Count)
        prisma.checklist_report.count({
          where: reportBaseWhere,
        }),

        // E2. Breakdown Status Laporan (Agregat GroupBy)
        prisma.checklist_report.groupBy({
          by: ['status'],
          where: reportBaseWhere,
          _count: { report_id: true },
        }),

        // E3. Rincian Laporan Audit Sesuai Filter Intent (Mencakup hingga 65 baris)
        prisma.checklist_report.findMany({
          where: reportFilterWhere,
          include: {
            schedule: {
              include: {
                store: { select: { store_name: true, city: true } },
                checklist_template: { select: { template_name: true } },
              },
            },
            staff: { select: { name: true } },
          },
          orderBy: { created_at: 'desc' },
          take: reportTake,
        }),

        // F. Temuan Butir Audit Tidak Sesuai (checklist_answer dengan answer = 'no')
        prisma.checklist_answer.findMany({
          where: {
            answer: { in: ['no', 'NO', 'No'] },
            ...(wsFilter
              ? { checklist_report: { schedule: { store: { workspace_id: wsFilter } } } }
              : {}),
          },
          include: {
            checklist_report: {
              include: {
                schedule: {
                  include: {
                    store: { select: { store_name: true, city: true } },
                  },
                },
                staff: { select: { name: true } },
              },
            },
            template_task: {
              include: {
                template_category: { select: { category_name: true } },
              },
            },
          },
          orderBy: { answered_at: 'desc' },
          take: 35,
        }),
      ]);

      const stores = storesResult.status === 'fulfilled' ? storesResult.value : [];
      const holidays = holidaysResult.status === 'fulfilled' ? holidaysResult.value : [];
      const schedules = schedulesResult.status === 'fulfilled' ? schedulesResult.value : [];
      const templates = templatesResult.status === 'fulfilled' ? templatesResult.value : [];
      const totalReportsCount = reportCountResult.status === 'fulfilled' ? reportCountResult.value : 0;
      const statusGroups = reportStatusGroupResult.status === 'fulfilled' ? reportStatusGroupResult.value : [];
      const reports = reportsResult.status === 'fulfilled' ? reportsResult.value : [];
      const findings = findingsResult.status === 'fulfilled' ? findingsResult.value : [];

      // 4. Format Data Menjadi Teks Ringkasan Terstruktur
      const sections = [];

      // Section A: Toko Operasional
      if (stores.length > 0) {
        const storeLines = stores.map((s) => {
          return `- ${s.store_name} (${s.city || 'Kota belum diisi'}) [Status: ${s.status || 'active'}]`;
        });
        sections.push(`[1. DAFTAR GERAI / TOKO OPERASIONAL (Total: ${stores.length} toko)]\n${storeLines.join('\n')}`);
      }

      // Section B: Libur Toko
      if (holidays.length > 0) {
        const holidayLines = holidays.map((h) => {
          const startStr = h.start_date ? new Date(h.start_date).toISOString().split('T')[0] : '-';
          const endStr = h.end_date ? new Date(h.end_date).toISOString().split('T')[0] : '-';
          return `- Toko: ${h.store_name} | Tanggal: ${startStr} s/d ${endStr} (${h.duration_days || 1} hari) | Alasan: "${h.reason}" | Status: ${h.status || 'Terjadwal'}`;
        });
        sections.push(`[2. JADWAL LIBUR TOKO (STORE HOLIDAY)]\n${holidayLines.join('\n')}`);
      }

      // Section C: Template Checklist
      if (templates.length > 0) {
        const templateLines = templates.map((t) => {
          const catCount = t.template_category?.length || 0;
          const taskCount = (t.template_category || []).reduce(
            (acc, c) => acc + (c.template_task?.length || 0),
            0
          );
          const catNames = (t.template_category || [])
            .map((c) => c.category_name)
            .filter(Boolean)
            .slice(0, 4)
            .join(', ');

          return `- Template: "${t.template_name}" (ID: ${t.template_id}) | Toko: ${t.store?.store_name || 'Umum'} | Total: ${catCount} Kategori (${taskCount} Butir Pertanyaan)${catNames ? ` | Kategori Contoh: [${catNames}]` : ''}`;
        });
        sections.push(`[3. TEMPLATE CHECKLIST AUDIT TERSEDIA]\n${templateLines.join('\n')}`);
      }

      // Section D: Jadwal Audit (schedule)
      if (schedules.length > 0) {
        const scheduleLines = schedules.map((sch) => {
          const staffNames = (sch.schedule_staff || [])
            .map((st) => st.staff?.name)
            .filter(Boolean)
            .join(', ') || 'Belum ada PIC';

          const startTimeStr = sch.start_time ? new Date(sch.start_time).toTimeString().substring(0, 5) : '08:00';
          const endTimeStr = sch.end_time ? new Date(sch.end_time).toTimeString().substring(0, 5) : '17:00';

          return `- Jadwal: "${sch.title}" | Toko: ${sch.store?.store_name || '-'} | Template: "${sch.checklist_template?.template_name || '-'}" | Jam: ${startTimeStr} - ${endTimeStr} | Perulangan: ${sch.repeat_time || 'daily'} | Status: ${sch.status || 'active'} | PIC: ${staffNames}`;
        });
        sections.push(`[4. JADWAL AUDIT TOKO AKTIF (SCHEDULE)]\n${scheduleLines.join('\n')}`);
      }

      // Section E: Rekapitulasi & Riwayat Laporan Audit (checklist_report)
      if (totalReportsCount > 0) {
        // Rekapitulasi status lengkap dari database
        const statusSummary = (statusGroups || [])
          .map((g) => `  • Status "${g.status || 'unknown'}": ${g._count.report_id} Laporan`)
          .join('\n');

        // Analisis distribusi toko & auditor dari baris laporan yang diambil
        const storeCounts = {};
        const staffCounts = {};
        reports.forEach((r) => {
          const sName = r.schedule?.store?.store_name || 'Toko Lainnya';
          const stName = r.staff?.name || 'Staff Lapangan';
          storeCounts[sName] = (storeCounts[sName] || 0) + 1;
          staffCounts[stName] = (staffCounts[stName] || 0) + 1;
        });

        const topStoresStr = Object.entries(storeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, count]) => `  - ${name}: ${count} Laporan`)
          .join('\n');

        const topStaffStr = Object.entries(staffCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, count]) => `  - ${name}: ${count} Laporan`)
          .join('\n');

        const reportLines = reports.map((r) => {
          const compDate = r.completed_at || r.started_at || r.created_at;
          const dateStr = compDate ? new Date(compDate).toISOString().split('T')[0] : '-';
          const totalQ = r.total_questions || 0;
          const answeredQ = r.answered_questions || 0;
          const pct = totalQ > 0 ? Math.round((answeredQ / totalQ) * 100) : (r.status === 'tidak_mengerjakan' ? 0 : 100);

          return `- Laporan #${r.report_id} | Toko: ${r.schedule?.store?.store_name || '-'} | Jadwal: "${r.schedule?.title || '-'}" | Auditor: ${r.staff?.name || 'Staff Lapangan'} | Tanggal: ${dateStr} | Status: ${r.status || 'completed'} | Skor: ${answeredQ}/${totalQ} butir (${pct}%)`;
        });

        sections.push(
          `[5. REKAPITULASI & RIWAYAT LAPORAN AUDIT (CHECKLIST REPORT)]\n` +
          `📊 DATA REKAPITULASI RESMI DATABASE (TOTAL KESELURUHAN: ${totalReportsCount} LAPORAN):\n` +
          `${statusSummary}\n\n` +
          `🏢 Distribusi Gerai Terbanyak:\n${topStoresStr || '  - Tidak ada data'}\n\n` +
          `👤 Distribusi Auditor Terbanyak:\n${topStaffStr || '  - Tidak ada data'}\n\n` +
          `📋 DAFTAR RINCIAN LAPORAN (${reports.length} dari total ${totalReportsCount} data tercatat):\n` +
          reportLines.join('\n')
        );
      }

      // Section F: Temuan Lapangan / Jawaban 'NO'
      if (findings.length > 0) {
        const findingLines = findings.map((f, idx) => {
          const storeName = f.checklist_report?.schedule?.store?.store_name || 'Toko';
          const auditorName = f.checklist_report?.staff?.name || 'Auditor';
          const taskDesc = f.template_task?.task_description || 'Butir pemeriksaan';
          const catName = f.template_task?.template_category?.category_name || 'Operasional';
          const priority = f.template_task?.priority || 'Medium';
          const comment = f.comment ? `Catatan: "${f.comment}"` : 'Tidak ada catatan tambahan';

          const compDate = f.answered_at || f.checklist_report?.completed_at || f.created_at;
          const dateStr = compDate ? new Date(compDate).toISOString().split('T')[0] : '-';

          return `${idx + 1}. [NO] Toko: ${storeName} (Tgl: ${dateStr}) | Auditor: ${auditorName}\n   • Kategori: ${catName} | Prioritas: ${priority}\n   • Butir Pertanyaan: "${taskDesc}"\n   • ${comment}`;
        });

        sections.push(
          `[6. TEMUAN KETIDAKSESUAIAN SOP TERKINI (HASIL JAWABAN 'NO' DARI LAPANGAN)]\n` +
          `⚠️ Terdapat ${findings.length} butir temuan "NO" aktif yang terdeteksi di database:\n\n` +
          findingLines.join('\n\n')
        );
      } else {
        sections.push(
          `[6. TEMUAN KETIDAKSESUAIAN SOP TERKINI]\nTidak ditemukan temuan 'NO' yang belum diselesaikan pada database untuk lingkup saat ini.`
        );
      }

      // Gabungkan semua section
      if (sections.length === 0) {
        return 'Basis Data Riil Toko: Belum ada data jadwal, template, atau laporan audit yang tersimpan di sistem.';
      }

      return (
        `=== DATA REALTIME SISTEM AUDIT TOKO DARI DATABASE TERKINI ===\n\n` +
        sections.join('\n\n') +
        `\n\n=== AKHIR DATA DATABASE ===`
      );
    } catch (error) {
      console.warn('⚠️ [AuditContextService] Gagal mengambil konteks live database:', error.message);
      return 'Catatan Sistem: Database audit sedang sibuk, jawaban akan menggunakan basis pengetahuan standar retail.';
    }
  },
};

module.exports = AuditContextService;
