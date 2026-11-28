const prisma = require('../config/prisma');

// Batas karakter maksimal konteks (~2.200–2.500 token) agar biaya API tetap hemat & terkontrol
const MAX_CONTEXT_CHARS = 9500;

const GREETING_REGEX =
  /^(halo|hai|hi|hello|pagi|siang|sore|malam|permisi|tes|test|oke|ok|makasih|terima kasih|thanks|siapa kamu|kamu siapa|halo ai|apa kabar)[!?. ]*$/i;

/**
 * Mengklasifikasikan maksud pertanyaan secara spesifik agar AI hanya menerima
 * data tabel yang relevan (Selective Context Loading).
 */
function classifyQuestionIntents(q) {
  const trimmed = (q || '').trim();
  const lower = trimmed.toLowerCase();

  if (GREETING_REGEX.test(lower) || (trimmed.length <= 20 && /^(halo|hai|hi|tes)\b/i.test(lower))) {
    return {
      isGreetingOnly: true,
      wantsStores: false,
      wantsHolidays: false,
      wantsTemplates: false,
      wantsSchedules: false,
      wantsReports: false,
      wantsFindings: false,
      isBroadOverview: false,
    };
  }

  const wantsStores = /\b(toko|gerai|cabang|outlet|lokasi|kota|alamat|store)\b/.test(lower);
  const wantsHolidays = /\b(libur|holiday|tutup|cuti|off|liburan)\b/.test(lower);
  const wantsTemplates = /\b(template|checklist|kategori|pertanyaan|butir|soal|item|form|formulir)\b/.test(lower);
  const wantsSchedules = /\b(jadwal|schedule|pic|petugas|jam|shift|perulangan|rutin|harian)\b/.test(lower);
  const wantsReports =
    /\b(laporan|report|kepatuhan|skor|nilai|statistik|rekap|total|berapa|persen|performa|kelalaian|terlewat|alpa|terlambat|selesai|completed|submitted)\b/.test(
      lower
    ) || lower.includes('tidak mengerjakan') || lower.includes('tidak_mengerjakan') || lower.includes('belum mengerjakan');
  const wantsFindings =
    /\b(temuan|masalah|gagal|deviasi|pelanggaran|kritis|mayor|minor|capa|memo|instruksi|korektif|perbaikan|k3|apar|kasir|pos|chiller|freezer|kebersihan|kendala|catatan|komentar|sop)\b/.test(
      lower
    ) || /\bno\b/.test(lower) || lower.includes('tidak sesuai');

  const hasSpecificIntent =
    wantsStores || wantsHolidays || wantsTemplates || wantsSchedules || wantsReports || wantsFindings;

  return {
    isGreetingOnly: false,
    wantsStores: wantsStores || !hasSpecificIntent,
    wantsHolidays,
    wantsTemplates,
    wantsSchedules,
    wantsReports: wantsReports || !hasSpecificIntent,
    wantsFindings: wantsFindings || !hasSpecificIntent,
    isBroadOverview: !hasSpecificIntent,
  };
}

/**
 * Deteksi filter status laporan spesifik dari pertanyaan user
 */
function detectReportIntent(lower) {
  if (
    lower.includes('tidak_mengerjakan') ||
    lower.includes('tidak mengerjakan') ||
    lower.includes('kelalaian') ||
    lower.includes('terlewat') ||
    lower.includes('alpa') ||
    lower.includes('belum mengerjakan') ||
    /\blewat\b/.test(lower)
  ) {
    return { status: 'tidak_mengerjakan', take: 35 };
  }
  if (lower.includes('terlambat')) {
    return { status: 'terlambat', take: 25 };
  }
  if ((lower.includes('selesai') || lower.includes('completed')) && !lower.includes('belum')) {
    return { status: 'completed', take: 25 };
  }
  if (lower.includes('submitted')) {
    return { status: 'submitted', take: 25 };
  }
  return { status: null, take: 20 };
}

/**
 * Mencocokkan nama toko atau kota yang disebut spesifik di pertanyaan user
 * agar query hanya mengambil rincian milik toko/kota terkait.
 */
function findMentionedStores(lowerQuestion, stores) {
  if (!lowerQuestion || !Array.isArray(stores) || stores.length === 0) {
    return { storeIds: [], cities: [] };
  }

  const matchedIds = [];
  const matchedCities = new Set();

  for (const s of stores) {
    const nameLower = (s.store_name || '').trim().toLowerCase();
    const cityLower = (s.city || '').trim().toLowerCase();

    // Cocokkan nama toko utuh atau kata khas (>3 huruf, bukan kata umum "toko"/"cabang"/"gerai")
    const meaningfulWords = nameLower
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !['toko', 'cabang', 'gerai', 'outlet', 'store'].includes(w));

    const nameMatched =
      (nameLower && lowerQuestion.includes(nameLower)) ||
      meaningfulWords.some((w) => lowerQuestion.includes(w));

    const cityMatched = cityLower && cityLower.length >= 4 && lowerQuestion.includes(cityLower);

    if (nameMatched || cityMatched) {
      matchedIds.push(s.store_id);
      if (cityMatched) matchedCities.add(s.city);
    }
  }

  return { storeIds: matchedIds, cities: Array.from(matchedCities) };
}

const trimText = (val, maxLen = 110) => {
  if (!val) return '';
  const clean = String(val).replace(/\s+/g, ' ').trim();
  return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean;
};

const toIsoDate = (d) => {
  if (!d) return '-';
  try {
    return new Date(d).toISOString().split('T')[0];
  } catch {
    return '-';
  }
};

const getWibDateString = () => {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return wib.toISOString().split('T')[0];
};

/**
 * Service untuk mengumpulkan data riil dari PostgreSQL secara hemat token (standar industri):
 * 1. Selective Context Routing berdasarkan intent pertanyaan (greetings = 0 baris DB).
 * 2. Entity-Scoped Filtering otomatis jika pertanyaan menyebut nama cabang/kota tertentu.
 * 3. Format tabel ringkas ber-header (pipe-delimited) yang memangkas ~50% token tanpa kehilangan akurasi.
 * 4. Agregasi resmi database tetap utuh (`count` & `groupBy`) + hard token budget guard.
 */
const AuditContextService = {
  /**
   * Mengambil dan merangkum konteks data audit terkini untuk AI secara efisien
   * @param {Object} user - Identitas user (role, workspaceId, rawId)
   * @param {string} userQuestion - Pertanyaan user
   * @returns {Promise<string>} String ringkasan data terkompresi untuk AI
   */
  async getLiveAuditDatabaseContext(user, userQuestion = '') {
    try {
      const q = (userQuestion || '').toLowerCase().trim();
      const intents = classifyQuestionIntents(userQuestion);

      // Fast-path untuk sapaan/pertanyaan umum tanpa butuh query data operasional
      if (intents.isGreetingOnly) {
        return `Tanggal Server (WIB): ${getWibDateString()}\nStatus Sistem: Basis data audit retail aktif. Siap menjawab seputar toko, jadwal, laporan, temuan 'NO', dan libur toko.`;
      }

      // 1. Tentukan Filter Workspace Secara Ketat (Multi-Tenant Isolation)
      let wsIds = null;
      if (Array.isArray(user?.workspaceIds)) {
        wsIds = user.workspaceIds
          .map((id) => {
            try {
              const clean = String(id).replace(/^ws-/, '').trim();
              return /^\d+$/.test(clean) ? BigInt(clean) : null;
            } catch {
              return null;
            }
          })
          .filter((v) => v !== null);

        if (wsIds.length === 0) {
          return 'Basis Data Riil Toko: Belum ada workspace atau data audit yang terdaftar pada cakupan akun Anda.';
        }
      } else if (user?.workspaceId) {
        try {
          const cleanWs = user.workspaceId.toString().replace(/^ws-/, '').trim();
          if (/^\d+$/.test(cleanWs)) {
            wsIds = [BigInt(cleanWs)];
          }
        } catch (e) {}
      } else if (String(user?.role || '').toLowerCase() === 'super admin' && user?.rawId) {
        const cleanSa = String(user.rawId).replace(/^sa-/, '').trim();
        if (/^\d+$/.test(cleanSa)) {
          const ownedWs = await prisma.workspace.findMany({
            where: { super_admin_id: BigInt(cleanSa) },
            select: { workspace_id: true },
          });
          wsIds = ownedWs.map((w) => w.workspace_id);
          if (wsIds.length === 0) {
            return 'Basis Data Riil Toko: Belum ada workspace atau data audit yang terdaftar pada akun Super Admin Anda.';
          }
        }
      }

      const wsCondition =
        wsIds && wsIds.length > 0
          ? wsIds.length === 1
            ? wsIds[0]
            : { in: wsIds }
          : null;

      const storeWhere = wsCondition
        ? { workspace_id: wsCondition, status: { not: 'deleted' } }
        : { status: { not: 'deleted' } };

      // 2. Ambil daftar ringkas toko terlebih dahulu untuk deteksi entitas cabang/kota
      const stores = await prisma.store.findMany({
        where: storeWhere,
        select: {
          store_id: true,
          store_name: true,
          city: true,
          status: true,
        },
        take: 30,
      });

      const { storeIds: mentionedStoreIds } = findMentionedStores(q, stores);
      const hasStoreScope = mentionedStoreIds.length > 0;
      const storeScopeFilter = hasStoreScope
        ? { store_id: { in: mentionedStoreIds } }
        : {};

      const reportBaseWhere = {
        ...(wsCondition ? { schedule: { store: { workspace_id: wsCondition } } } : {}),
      };
      const reportIntent = detectReportIntent(q);
      const reportDetailWhere = {
        ...(wsCondition || hasStoreScope
          ? {
              schedule: {
                store: {
                  ...(wsCondition ? { workspace_id: wsCondition } : {}),
                  ...(hasStoreScope ? { store_id: { in: mentionedStoreIds } } : {}),
                },
              },
            }
          : {}),
        ...(reportIntent.status ? { status: reportIntent.status } : {}),
      };

      const isExplicitFindingsFocus =
        intents.wantsFindings && !intents.isBroadOverview;
      const findingsTake = isExplicitFindingsFocus ? 25 : 12;
      const reportsTake = intents.isBroadOverview ? 12 : reportIntent.take;

      // 3. Jalankan HANYA query untuk intent yang relevan secara paralel
      const [
        holidays,
        schedules,
        templates,
        totalReportsCount,
        statusGroups,
        reports,
        findings,
      ] = await Promise.all([
        intents.wantsHolidays
          ? prisma.store_holiday.findMany({
              where: {
                deleted_at: null,
                ...(wsCondition ? { workspace_id: wsCondition } : {}),
                ...(hasStoreScope ? { store_id: { in: mentionedStoreIds } } : {}),
              },
              select: {
                store_name: true,
                start_date: true,
                end_date: true,
                duration_days: true,
                reason: true,
                status: true,
              },
              orderBy: { start_date: 'desc' },
              take: 10,
            })
          : Promise.resolve(null),

        intents.wantsSchedules
          ? prisma.schedule.findMany({
              where: {
                status: { not: 'deleted' },
                ...(wsCondition ? { store: { workspace_id: wsCondition } } : {}),
                ...storeScopeFilter,
              },
              include: {
                store: { select: { store_name: true } },
                checklist_template: { select: { template_name: true } },
                schedule_staff: { include: { staff: { select: { name: true } } } },
              },
              orderBy: { created_at: 'desc' },
              take: 15,
            })
          : Promise.resolve(null),

        intents.wantsTemplates
          ? prisma.checklist_template.findMany({
              where: {
                status: { not: 'deleted' },
                ...(wsCondition ? { store: { workspace_id: wsCondition } } : {}),
                ...storeScopeFilter,
              },
              include: {
                store: { select: { store_name: true } },
                template_category: {
                  include: {
                    template_task: { select: { task_id: true } },
                  },
                },
              },
              take: 10,
            })
          : Promise.resolve(null),

        intents.wantsReports
          ? prisma.checklist_report.count({ where: reportBaseWhere })
          : Promise.resolve(null),

        intents.wantsReports
          ? prisma.checklist_report.groupBy({
              by: ['status'],
              where: reportBaseWhere,
              _count: { report_id: true },
            })
          : Promise.resolve(null),

        intents.wantsReports
          ? prisma.checklist_report.findMany({
              where: reportDetailWhere,
              include: {
                schedule: {
                  include: {
                    store: { select: { store_name: true } },
                  },
                },
                staff: { select: { name: true } },
              },
              orderBy: { created_at: 'desc' },
              take: reportsTake,
            })
          : Promise.resolve(null),

        intents.wantsFindings
          ? prisma.checklist_answer.findMany({
              where: {
                answer: { in: ['no', 'NO', 'No'] },
                ...(wsCondition || hasStoreScope
                  ? {
                      checklist_report: {
                        schedule: {
                          store: {
                            ...(wsCondition ? { workspace_id: wsCondition } : {}),
                            ...(hasStoreScope ? { store_id: { in: mentionedStoreIds } } : {}),
                          },
                        },
                      },
                    }
                  : {}),
              },
              include: {
                checklist_report: {
                  include: {
                    schedule: {
                      include: {
                        store: { select: { store_name: true } },
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
              take: findingsTake,
            })
          : Promise.resolve(null),
      ]);

      // 4. Susun Konteks Ringkas Ber-Header (Pipe-Delimited)
      const sections = [];
      sections.push(`Tanggal Referensi (WIB): ${getWibDateString()}`);

      // Section 1: Daftar Toko (dikirim ringkas jika relevan atau saat overview)
      if (stores.length > 0 && (intents.wantsStores || hasStoreScope)) {
        const displayStores = hasStoreScope
          ? stores.filter((s) => mentionedStoreIds.includes(s.store_id))
          : stores;
        const storeItems = displayStores.map(
          (s) => `${s.store_name} (${s.city || '-'}, ${s.status || 'active'})`
        );
        sections.push(`[1. TOKO (${stores.length} total)]\n${storeItems.join('; ')}`);
      }

      // Section 2: Libur Toko
      if (holidays !== null) {
        if (holidays.length > 0) {
          const lines = holidays.map(
            (h) =>
              `${h.store_name}|${toIsoDate(h.start_date)}..${toIsoDate(h.end_date)} (${h.duration_days || 1}h)|${trimText(h.reason, 60)}|${h.status || 'Terjadwal'}`
          );
          sections.push(`[2. LIBUR TOKO (Toko|Tgl|Alasan|Status)]\n${lines.join('\n')}`);
        } else {
          sections.push(`[2. LIBUR TOKO]\nTidak ada jadwal libur toko tercatat.`);
        }
      }

      // Section 3: Template Checklist
      if (templates !== null && templates.length > 0) {
        const lines = templates.map((t) => {
          const catCount = t.template_category?.length || 0;
          const taskCount = (t.template_category || []).reduce(
            (acc, c) => acc + (c.template_task?.length || 0),
            0
          );
          const catNames = (t.template_category || [])
            .map((c) => c.category_name)
            .filter(Boolean)
            .slice(0, 3)
            .join(', ');
          return `#${t.template_id}|${t.template_name}|${t.store?.store_name || 'Umum'}|${catCount}kat/${taskCount}butir${catNames ? `|${catNames}` : ''}`;
        });
        sections.push(`[3. TEMPLATE (ID|Nama|Toko|Isi|Kategori)]\n${lines.join('\n')}`);
      }

      // Section 4: Jadwal Audit
      if (schedules !== null) {
        if (schedules.length > 0) {
          const lines = schedules.map((sch) => {
            const pic =
              (sch.schedule_staff || [])
                .map((st) => st.staff?.name)
                .filter(Boolean)
                .join(', ') || '-';
            const stTime = sch.start_time ? new Date(sch.start_time).toTimeString().substring(0, 5) : '08:00';
            const endTime = sch.end_time ? new Date(sch.end_time).toTimeString().substring(0, 5) : '17:00';
            return `${sch.title}|${sch.store?.store_name || '-'}|${sch.checklist_template?.template_name || '-'}|${stTime}-${endTime}|${sch.repeat_time || 'daily'}|${sch.status || 'active'}|${pic}`;
          });
          sections.push(`[4. JADWAL AUDIT (Judul|Toko|Template|Jam|Ulang|Status|PIC)]\n${lines.join('\n')}`);
        } else {
          sections.push(`[4. JADWAL AUDIT]\nTidak ada jadwal audit aktif.`);
        }
      }

      // Section 5: Rekapitulasi Resmi & Rincian Laporan Audit
      if (reports !== null && totalReportsCount !== null) {
        if (totalReportsCount > 0) {
          const statusSummary = (statusGroups || [])
            .map((g) => `• ${g.status || 'unknown'}: ${g._count.report_id}`)
            .join(' | ');

          const storeCounts = {};
          const staffCounts = {};
          reports.forEach((r) => {
            const sName = r.schedule?.store?.store_name || 'Lainnya';
            const stName = r.staff?.name || 'Staff';
            storeCounts[sName] = (storeCounts[sName] || 0) + 1;
            staffCounts[stName] = (staffCounts[stName] || 0) + 1;
          });

          const topStores = Object.entries(storeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([n, c]) => `${n}(${c})`)
            .join(', ');

          const topStaff = Object.entries(staffCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([n, c]) => `${n}(${c})`)
            .join(', ');

          const reportLines = reports.map((r) => {
            const compDate = r.completed_at || r.started_at || r.created_at;
            const totalQ = r.total_questions || 0;
            const answeredQ = r.answered_questions || 0;
            const pct =
              totalQ > 0
                ? Math.round((answeredQ / totalQ) * 100)
                : r.status === 'tidak_mengerjakan'
                ? 0
                : 100;
            return `#${r.report_id}|${r.schedule?.store?.store_name || '-'}|${trimText(r.schedule?.title || '-', 32)}|${r.staff?.name || 'Staff'}|${toIsoDate(compDate)}|${r.status || 'completed'}|${answeredQ}/${totalQ}(${pct}%)`;
          });

          const filterNote = hasStoreScope ? ' [Filter: Toko Disebut]' : reportIntent.status ? ` [Filter: ${reportIntent.status}]` : '';
          sections.push(
            `[5. LAPORAN AUDIT${filterNote}]\n` +
              `DATA REKAPITULASI RESMI DATABASE (TOTAL KESELURUHAN: ${totalReportsCount} LAPORAN):\n` +
              `${statusSummary}\n` +
              (topStores ? `Gerai Sampel: ${topStores} | Auditor Sampel: ${topStaff}\n` : '') +
              `Rincian (${reports.length} terbaru | #ID|Toko|Jadwal|Auditor|Tgl|Status|Skor):\n` +
              (reportLines.length > 0 ? reportLines.join('\n') : 'Tidak ada rincian cocok dengan filter.')
          );
        } else {
          sections.push(`[5. LAPORAN AUDIT]\nBelum ada laporan audit tercatat.`);
        }
      }

      // Section 6: Temuan Ketidaksesuaian ('NO') dengan deduplikasi ringkas
      if (findings !== null) {
        if (findings.length > 0) {
          const seen = new Set();
          const findingLines = [];
          for (const f of findings) {
            const storeName = f.checklist_report?.schedule?.store?.store_name || 'Toko';
            const taskDesc = trimText(f.template_task?.task_description || 'Butir', 90);
            const comment = trimText(f.comment || '', 90);
            const dedupKey = `${storeName}|${taskDesc}|${comment}`;
            if (seen.has(dedupKey)) continue;
            seen.add(dedupKey);

            const auditor = f.checklist_report?.staff?.name || 'Auditor';
            const cat = f.template_task?.template_category?.category_name || 'Operasional';
            const prio = f.template_task?.priority || 'Medium';
            const dt = toIsoDate(f.answered_at || f.checklist_report?.completed_at || f.created_at);

            findingLines.push(
              `${findingLines.length + 1}|${storeName}|${dt}|${auditor}|${cat}|${prio}|${taskDesc}${comment ? `|Catatan:${comment}` : ''}`
            );
          }

          sections.push(
            `[6. TEMUAN 'NO' (${findingLines.length} unik | No|Toko|Tgl|Auditor|Kat|Prio|Butir|Catatan)]\n` +
              findingLines.join('\n')
          );
        } else {
          sections.push(
            `[6. TEMUAN 'NO']\nTidak ada temuan 'NO' aktif pada lingkup pertanyaan ini.`
          );
        }
      }

      if (sections.length <= 1) {
        return 'Basis Data Riil Toko: Belum ada data jadwal, template, atau laporan audit yang tersimpan di sistem.';
      }

      let output =
        `=== DATA REALTIME SISTEM AUDIT TOKO ===\n\n` +
        sections.join('\n\n') +
        `\n\n=== AKHIR DATA DATABASE ===`;

      if (output.length > MAX_CONTEXT_CHARS) {
        output =
          output.slice(0, MAX_CONTEXT_CHARS - 60) +
          `\n...[ringkasan dipotong demi efisiensi token]\n=== AKHIR DATA DATABASE ===`;
      }

      return output;
    } catch (error) {
      console.warn('⚠️ [AuditContextService] Gagal mengambil konteks live database:', error.message);
      return 'Catatan Sistem: Database audit sedang sibuk, jawaban akan menggunakan basis pengetahuan standar retail.';
    }
  },
};

module.exports = AuditContextService;
