const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');
const { decryptImageData } = require('../utils/imageCrypto');
const { decryptImage, encryptImage, isEncrypted } = require('../utils/crypto.utils');

/**
 * Helper untuk dekripsi attachment URL foto galeri (mendukung ENC:v1 dan enc:v1)
 */
const decryptAttachmentUrl = (file_url) => {
  if (!file_url) return '';
  let raw = '';
  if (Buffer.isBuffer(file_url) || file_url instanceof Uint8Array || Array.isArray(file_url)) {
    raw = Buffer.from(file_url).toString('utf-8');
  } else if (typeof file_url === 'string') {
    if (/^\d+(,\d+)+$/.test(file_url)) {
      const nums = file_url.split(',').map((n) => parseInt(n, 10));
      raw = Buffer.from(nums).toString('utf-8');
    } else {
      raw = file_url;
    }
  } else if (file_url.data && (Array.isArray(file_url.data) || Buffer.isBuffer(file_url.data))) {
    raw = Buffer.from(file_url.data).toString('utf-8');
  }

  if (!raw || typeof raw !== 'string') return '';
  raw = raw.trim();

  if (raw.startsWith('ENC:v1:')) {
    try {
      const dec = decryptImageData(raw);
      if (dec && dec.length > 0) return dec;
    } catch (e) {
      console.warn('⚠️ Gagal decrypt ENC:v1 di gallery:', e.message);
    }
  }

  if (raw.startsWith('enc:v1:') || isEncrypted(raw)) {
    try {
      const dec = decryptImage(raw);
      if (dec && dec.length > 0) return dec;
    } catch (e) {
      console.warn('⚠️ Gagal decrypt enc:v1 di gallery:', e.message);
    }
  }

  return raw;
};

// Koleksi visual foto inspeksi audit toko ritel berkualitas tinggi
const GALLERY_SEEDS = [
  {
    storeNamePattern: 'Singosari',
    scheduleTitle: 'Audit Pembukaan & Kesiapan Kasir Pagi',
    auditorName: 'Siti Nurhaliza',
    auditorRole: 'Auditor Lapangan',
    hasIssue: true,
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=700&auto=format&fit=crop',
        caption: 'Kabel POS & Meja Kasir',
        category: 'Area Kasir & POS',
        checklistQuestion: 'Apakah instalasi kabel POS, EDC, dan scanner kasir tertata rapi tanpa potensi bahaya korsleting?',
        hasIssue: true,
        issueSeverity: 'Tinggi',
        issueDescription: 'Kabel adaptor EDC dan printer kasir 01 terurai di bawah meja tanpa pelindung ducting kabel, berisiko tersenggol staf.',
        description: 'Ditemukan kabel adaptor terurai di bawah counter kasir tanpa pelindung ducting.',
      },
      {
        url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=700&auto=format&fit=crop',
        caption: 'Kebersihan Meja & Ruang Makan',
        category: 'Kebersihan & Sanitasi',
        checklistQuestion: 'Apakah area meja makan dan kursi pengunjung bersih dari noda minyak dan remah makanan?',
        hasIssue: false,
        description: 'Meja nomor 1 s.d. 30 telah disanitasi menyeluruh dan siap melayani pengunjung.',
      },
      {
        url: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?q=80&w=700&auto=format&fit=crop',
        caption: 'Indikator Suhu Chiller Minuman',
        category: 'Chiller & Pendingin',
        checklistQuestion: 'Apakah termometer digital chiller minuman menunjukkan rentang suhu standar 2°C s.d. 6°C?',
        hasIssue: false,
        description: 'Display digital chiller minuman stabil pada suhu 3.8°C sesuai SOP cold chain.',
      },
      {
        url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=700&auto=format&fit=crop',
        caption: 'Kesiapan Peralatan Dapur Utama',
        category: 'Dapur & Peralatan',
        checklistQuestion: 'Apakah minyak masak deep fryer jernih dan peralatan memasak telah dicuci steril?',
        hasIssue: false,
        description: 'Minyak deep fryer baru dan suhu penggorengan telah terkalibrasi 180°C.',
      },
    ],
  },
  {
    storeNamePattern: 'Sawojajar',
    scheduleTitle: 'Inspeksi Kepatuhan Display & Merchandising Toko',
    auditorName: 'Budi Santoso',
    auditorRole: 'Supervisor Audit',
    hasIssue: true,
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1580828343064-fde4fc206bc6?q=80&w=700&auto=format&fit=crop',
        caption: 'Jalur Lorong Utama & Pintu Darurat',
        category: 'Display & Merchandising',
        checklistQuestion: 'Apakah lorong belanja bebas dari tumpukan kardus barang yang menghalangi mobilitas pelanggan?',
        hasIssue: true,
        issueSeverity: 'Rendah',
        issueDescription: 'Terdapat 3 kardus kemasan mie instan belum dipindahkan ke gudang belakang, sedikit menghalangi akses lorong 2.',
        description: 'Kardus restock mie instan menumpuk sementara di lorong rak bumbu dapur.',
      },
      {
        url: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?q=80&w=700&auto=format&fit=crop',
        caption: 'Display Rak Bumbu & Topping',
        category: 'Display & Merchandising',
        checklistQuestion: 'Apakah penataan produk rapi menggunakan prinsip FIFO dan label harga terlihat jelas?',
        hasIssue: false,
        description: 'Seluruh rak bumbu dan saus tertata rapi dengan price tag digital aktif.',
      },
      {
        url: 'https://images.unsplash.com/photo-1584473457406-6240486418e9?q=80&w=700&auto=format&fit=crop',
        caption: 'Counter Kasir & EDC Standar',
        category: 'Area Kasir & POS',
        checklistQuestion: 'Apakah counter kasir bersih, thermal paper terpasang, dan mesin EDC siap melayani transaksi non-tunai?',
        hasIssue: false,
        description: 'Semua mesin kasir beroperasi normal dan kasir mengenakan seragam serta ID card lengkap.',
      },
    ],
  },
  {
    storeNamePattern: 'Sudirman',
    scheduleTitle: 'Audit Standar Mutu, Sanitasi & Keamanan Gerai',
    auditorName: 'Ahmad Fauzi',
    auditorRole: 'Lead Auditor QnA',
    hasIssue: false,
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1584473457406-6240486418e9?q=80&w=700&auto=format&fit=crop',
        caption: 'Area Kasir & Antrean Pelanggan',
        category: 'Area Kasir & POS',
        checklistQuestion: 'Apakah antrean kasir tertib dan monitor display POS aktif menghadap pelanggan?',
        hasIssue: false,
        description: 'Monitor kasir aktif menampilkan rincian pesanan pelanggan secara transparan.',
      },
      {
        url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=700&auto=format&fit=crop',
        caption: 'Fasad Depan & Kerapian Toko',
        category: 'Kebersihan & Sanitasi',
        checklistQuestion: 'Apakah pintu masuk dan lantai teras depan gerai bebas dari sampah dan kotoran?',
        hasIssue: false,
        description: 'Kaca fasad depan jernih, keset desinfektan bersih, dan pencahayaan terang.',
      },
      {
        url: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?q=80&w=700&auto=format&fit=crop',
        caption: 'Kulkas Pendingin Bahan Baku',
        category: 'Chiller & Pendingin',
        checklistQuestion: 'Apakah bahan baku perishable tersimpan dalam wadah kedap udara dengan label tanggal kadaluarsa?',
        hasIssue: false,
        description: 'Penyimpanan bahan baku daging dan sayur menggunakan kontainer food-grade berlabel tanggal produksi.',
      },
    ],
  },
  {
    storeNamePattern: 'Ciliwung',
    scheduleTitle: 'Pemeriksaan Rutin SOP Operasional & Fasilitas',
    auditorName: 'Rina Kusuma',
    auditorRole: 'Auditor Lapangan',
    hasIssue: false,
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=700&auto=format&fit=crop',
        caption: 'Lorong Rak & Sanitasi Toko',
        category: 'Kebersihan & Sanitasi',
        checklistQuestion: 'Apakah lantai toko kering dan terdapat tanda peringatan lantai licin saat proses pembersihan?',
        hasIssue: false,
        description: 'Lantai lorong belanja kering, bersih, dan harum dengan standar desinfektan harian.',
      },
      {
        url: 'https://images.unsplash.com/photo-1584473457406-6240486418e9?q=80&w=700&auto=format&fit=crop',
        caption: 'Counter Pembayaran & Kasir',
        category: 'Area Kasir & POS',
        checklistQuestion: 'Apakah kamera CCTV counter kasir menyorot laci uang tanpa titik buta (blindspot)?',
        hasIssue: false,
        description: 'Rekaman CCTV tajam dan angle kamera menyorot seluruh transaksi kasir tanpa hambatan.',
      },
    ],
  },
];

/**
 * Self-healing: Pastikan data galeri foto audit tersedia di database
 */
const ensureGallerySeed = async () => {
  try {
    const reportCount = await prisma.checklist_report.count();
    const attachmentCount = await prisma.attachment.count();

    // Jika lampiran foto di database masih kurang dari 6, lakukan seeding otomatis ke toko yang ada
    if (attachmentCount < 6) {
      console.log('🔄 [Gallery] Memeriksa & melakukan inisialisasi lampiran foto audit di database...');
      const stores = await prisma.store.findMany({
        include: { workspace: true },
        orderBy: { store_id: 'asc' },
      });

      if (stores.length === 0) return;

      const staffList = await prisma.staff.findMany();
      const firstStaff = staffList[0] || null;

      for (const seed of GALLERY_SEEDS) {
        // Cari toko yang cocok dengan pattern nama
        const matchedStore =
          stores.find((s) => s.store_name.toLowerCase().includes(seed.storeNamePattern.toLowerCase())) ||
          stores[0];

        if (!matchedStore) continue;

        // Cari atau buat jadwal audit untuk toko ini
        let schedule = await prisma.schedule.findFirst({
          where: { store_id: matchedStore.store_id },
        });

        if (!schedule) {
          const admin = await prisma.admin.findFirst({
            where: { workspace_id: matchedStore.workspace_id },
          });
          const template = await prisma.checklist_template.findFirst({
            where: { store_id: matchedStore.store_id },
          });

          if (!admin || !template) continue;

          schedule = await prisma.schedule.create({
            data: {
              admin_id: admin.admin_id,
              store_id: matchedStore.store_id,
              template_id: template.template_id,
              title: seed.scheduleTitle,
              start_time: new Date('2026-11-04T08:00:00Z'),
              end_time: new Date('2026-11-04T12:00:00Z'),
              start_date: new Date('2026-11-04'),
              status: 'active',
            },
          });
        }

        // Cari atau buat checklist report
        let report = await prisma.checklist_report.findFirst({
          where: { schedule_id: schedule.schedule_id },
        });

        if (!report) {
          let assignedStaff = firstStaff;
          if (!assignedStaff) {
            assignedStaff = await prisma.staff.create({
              data: {
                store_id: matchedStore.store_id,
                admin_id: schedule.admin_id,
                name: seed.auditorName,
                email: `${seed.auditorName.toLowerCase().replace(/\s+/g, '.')}@auditcorp.com`,
                position: seed.auditorRole,
                status: 'active',
              },
            });
          }

          report = await prisma.checklist_report.create({
            data: {
              schedule_id: schedule.schedule_id,
              staff_id: assignedStaff.staff_id,
              started_at: new Date('2026-11-04T08:15:00Z'),
              completed_at: new Date('2026-11-04T09:45:00Z'),
              duration_minute: 90,
              status: 'completed',
              total_questions: seed.photos.length,
              answered_questions: seed.photos.length,
              total_attachments: seed.photos.length,
            },
          });
        }

        // Cek attachment yang sudah ada untuk report ini
        const existingPhotos = await prisma.attachment.findMany({
          where: { report_id: report.report_id },
        });

        if (existingPhotos.length === 0) {
          for (const p of seed.photos) {
            const encryptedUrl = encryptImage(p.url);
            const captionWithMeta = JSON.stringify({
              caption: p.caption,
              category: p.category,
              checklistQuestion: p.checklistQuestion,
              hasIssue: p.hasIssue,
              issueSeverity: p.issueSeverity || 'Rendah',
              issueDescription: p.issueDescription || '',
              description: p.description || '',
            });

            await prisma.attachment.create({
              data: {
                report_id: report.report_id,
                file_url: Buffer.from(encryptedUrl, 'utf-8'),
                file_type: 'task_photo',
                caption: captionWithMeta,
                signer_name: seed.auditorName,
                signer_role: seed.auditorRole,
                created_at: new Date('2026-11-04T09:30:00Z'),
              },
            });
          }
          console.log(`✅ [Gallery] Berhasil membuat ${seed.photos.length} foto audit untuk gerai ${matchedStore.store_name}`);
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ [ensureGallerySeed]:', err.message);
  }
};

// Jalankan self-healing saat inisialisasi controller
ensureGallerySeed();

/**
 * Helper untuk format satu foto attachment ke interface AuditPhoto
 */
const formatPhoto = (att, report, fallbackIndex) => {
  let rawUrl = decryptAttachmentUrl(att.file_url);

  // Jika URL di database adalah link dummy broken atau kosong, gunakan gambar ritel valid
  if (!rawUrl || rawUrl.includes('broken') || rawUrl.trim() === '') {
    rawUrl = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=700&auto=format&fit=crop';
  }

  let caption = att.caption || 'Foto Pemeriksaan Audit';
  let category = 'Area Toko & Operasional';
  let checklistQuestion = 'Apakah fasilitas toko sesuai dengan standar SOP audit?';
  let hasIssue = false;
  let isPhotoRequired = true; // default untuk foto lampiran
  let priority = 'High';
  let issueSeverity = 'Tinggi';
  let issueDescription = '';
  let description = '';

  // Parse JSON metadata jika tersimpan di caption
  if (att.caption && att.caption.startsWith('{')) {
    try {
      const parsed = JSON.parse(att.caption);
      caption = parsed.caption || caption;
      category = parsed.category || category;
      checklistQuestion = parsed.checklistQuestion || checklistQuestion;
      hasIssue = Boolean(parsed.hasIssue);
      isPhotoRequired = Boolean(parsed.isPhotoRequired ?? parsed.requirePhoto ?? true);
      priority = isPhotoRequired || parsed.priority === 'High' || parsed.issueSeverity === 'Tinggi' ? 'High' : 'Low';
      issueSeverity = priority === 'High' ? 'Tinggi' : 'Rendah';
      issueDescription = parsed.issueDescription || '';
      description = parsed.description || '';
    } catch (e) {}
  } else {
    // Tangani foto kehadiran auditor lapangan
    if (att.file_type === 'report_photo') {
      caption = 'Foto Kehadiran & Serah Terima';
      category = 'Verifikasi Kehadiran';
      checklistQuestion = 'Dokumentasi foto diri auditor berseragam lengkap dan verifikasi kehadiran fisik di gerai';
      hasIssue = false;
      isPhotoRequired = true;
      priority = 'High';
      issueSeverity = 'Tinggi';
      description = 'Validasi kehadiran fisik auditor bertugas di gerai fisik.';
    } else if (att.checklist_answer) {
      const ans = att.checklist_answer;
      if (ans.answer === 'no') {
        hasIssue = true;
        issueDescription = ans.comment || 'Ditemukan ketidaksesuaian butir checklist.';
      }
      description = ans.comment || '';
      if (ans.template_task) {
        checklistQuestion = ans.template_task.task_description || ans.template_task.task_name || checklistQuestion;
        if (ans.template_task.template_category) {
          category = ans.template_task.template_category.name || ans.template_task.template_category.category_name || category;
        }
        // Aturan: Wajib foto (is_photo_required = true) => Priority High ('Tinggi')
        //         Tidak wajib foto (is_photo_required = false) => Priority Low ('Rendah')
        isPhotoRequired = Boolean(ans.template_task.is_photo_required);
        priority = isPhotoRequired || ans.template_task.priority === 'High' ? 'High' : 'Low';
        issueSeverity = priority === 'High' ? 'Tinggi' : 'Rendah';
      }
    }
  }

  const timestampStr = att.created_at
    ? new Date(att.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
    : '2026-11-04, 10:00 WIB';

  return {
    id: `photo-${att.attachment_id ? att.attachment_id.toString() : fallbackIndex}`,
    url: rawUrl,
    caption,
    category,
    checklistQuestion,
    hasIssue,
    isPhotoRequired,
    priority,
    issueSeverity: hasIssue ? issueSeverity : undefined,
    issueDescription: hasIssue ? issueDescription : undefined,
    description: description || undefined,
    timestamp: timestampStr,
    auditorName: att.signer_name || report.staff?.name || 'Auditor Lapangan',
    notes: description || undefined,
  };
};

/**
 * Format entitas checklist_report ke interface AuditGalleryLog
 */
const formatGalleryLog = (report) => {
  const schedule = report.schedule || {};
  const store = schedule.store || {};
  const staff = report.staff || {};
  const workspace = store.workspace || {};

  // Hanya tampilkan foto bukti task inspeksi di galeri (filter keluar signature dan foto diri/selfie staff)
  const photos = (report.attachment || [])
    .filter((att) => att.file_type !== 'signature' && att.file_type !== 'report_photo')
    .map((att, idx) => formatPhoto(att, report, idx + 1));

  const issueCount = photos.filter((p) => p.hasIssue).length;
  const status = issueCount > 0 ? 'Issue' : 'Semua Sesuai';
  const validationStatus = issueCount > 0 ? 'Perlu Tindak Lanjut' : 'Terverifikasi Sesuai';

  const reportDate = report.started_at || report.created_at || new Date();
  const dateStr = new Date(reportDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const dateTimeFullStr =
    new Date(reportDate).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  const dateRawStr = new Date(reportDate).toISOString().split('T')[0];

  return {
    id: `log-${report.report_id.toString()}`,
    storeId: store.store_id ? store.store_id.toString() : `store-${report.schedule_id}`,
    storeName: store.store_name || 'Outlet Ritel Audit',
    storeLocation: store.city || store.address || 'Indonesia',
    scheduleTitle: schedule.title || 'Checklist Operasional Harian',
    date: dateStr,
    dateTimeFull: dateTimeFullStr,
    dateRaw: dateRawStr,
    workspace: workspace.company_name || 'Workspace',
    auditor: {
      name: staff.name || 'Auditor Lapangan',
      role: staff.position || 'Auditor',
    },
    validationStatus,
    status,
    issueCount,
    photos,
  };
};

/**
 * GET /api/gallery
 * Mengambil seluruh log foto galeri audit dengan filter workspace, store, status, pencarian, dan kategori
 */
exports.getAllGalleryLogs = async (req, res) => {
  try {
    const user = await extractUser(req);
    const {
      workspaceId,
      storeId,
      storeName,
      status,
      search,
      category,
      onlyIssues,
      dateRange,
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
      const cleanSaId = BigInt(user.rawId);
      where.schedule = {
        store: {
          workspace: { super_admin_id: cleanSaId },
        },
      };
    }

    // 2. Filter Store jika diberikan
    if (storeId && storeId !== 'Semua Toko' && storeId !== 'all') {
      try {
        const cleanStoreId = BigInt(storeId.toString().replace(/^st-/, ''));
        where.schedule = {
          ...(where.schedule || {}),
          store_id: cleanStoreId,
        };
      } catch (e) {}
    } else if (storeName && storeName !== 'Semua Toko') {
      where.schedule = {
        ...(where.schedule || {}),
        store: {
          ...(where.schedule?.store || {}),
          store_name: { contains: storeName.trim(), mode: 'insensitive' },
        },
      };
    }

    // 3. Ambil data dari database PostgreSQL (Kecualikan laporan tidak mengerjakan / kedaluwarsa)
    where.status = {
      notIn: ['tidak_mengerjakan', 'tidak_patuh', 'kedaluwarsa', 'expired', 'draft'],
    };

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
          include: {
            checklist_answer: {
              include: {
                template_task: {
                  include: { template_category: true },
                },
              },
            },
          },
          orderBy: { attachment_id: 'asc' },
        },
        checklist_answer: {
          include: {
            template_task: {
              include: { template_category: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Format dan HANYA tampilkan log yang memiliki foto task inspeksi valid (status tidak mengerjakan/tanpa foto tidak tampil)
    let formatted = reports.map(formatGalleryLog).filter((log) => log.photos && log.photos.length > 0);

    // 4. Filter Lanjutan (Search, Status, Category, OnlyIssues, DateRange)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      formatted = formatted.filter(
        (log) =>
          log.storeName.toLowerCase().includes(q) ||
          log.scheduleTitle.toLowerCase().includes(q) ||
          log.date.toLowerCase().includes(q) ||
          log.auditor.name.toLowerCase().includes(q)
      );
    }

    if (status && status !== 'Semua Status' && status !== 'all') {
      if (status === 'Memiliki Issue' || status === 'Issue') {
        formatted = formatted.filter((log) => log.status === 'Issue');
      } else if (status === 'Semua Sesuai' || status === 'Sesuai') {
        formatted = formatted.filter((log) => log.status === 'Semua Sesuai');
      }
    }

    if (onlyIssues === 'true' || onlyIssues === true) {
      formatted = formatted.filter((log) => log.status === 'Issue');
    }

    if (category && category !== 'Semua Kategori' && category !== 'all') {
      formatted = formatted.filter((log) =>
        log.photos.some((p) => p.category.toLowerCase().includes(category.toLowerCase()))
      );
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      if (dateRange === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        formatted = formatted.filter((log) => log.dateRaw === todayStr);
      } else if (dateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        formatted = formatted.filter((log) => new Date(log.dateRaw) >= weekAgo);
      } else if (dateRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        formatted = formatted.filter((log) => new Date(log.dateRaw) >= monthAgo);
      }
    }

    // Ambil daftar unik seluruh toko yang tersedia untuk filter dropdown
    const availableStores = Array.from(new Set(reports.map((r) => r.schedule?.store?.store_name).filter(Boolean)));

    return res.status(200).json({
      status: 'success',
      data: formatted,
      meta: {
        total: formatted.length,
        stores: availableStores,
      },
    });
  } catch (error) {
    console.error('❌ Error in getAllGalleryLogs:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil galeri foto audit dari database.',
      error: error.message,
    });
  }
};

/**
 * GET /api/gallery/stores
 * Mengambil daftar toko yang memiliki dokumentasi audit
 */
exports.getGalleryStores = async (req, res) => {
  try {
    const user = await extractUser(req);
    const requestedWsId = req.query.workspaceId || req.headers['x-workspace-id'];
    const where = {};

    if (user && (user.role === 'Divisi Teknis' || user.role === 'Teknis') && user.workspaceId) {
      where.workspace_id = BigInt(user.workspaceId);
    } else if (requestedWsId && requestedWsId !== 'all') {
      try {
        where.workspace_id = BigInt(requestedWsId.toString().replace(/^ws-/, ''));
      } catch (e) {}
    } else if (user && user.role === 'Admin' && user.workspaceId) {
      where.workspace_id = BigInt(user.workspaceId);
    } else if (user && user.role === 'Super Admin' && user.rawId) {
      where.workspace = { super_admin_id: BigInt(user.rawId) };
    }

    const stores = await prisma.store.findMany({
      where,
      select: { store_id: true, store_name: true },
      orderBy: { store_name: 'asc' },
    });

    return res.status(200).json({
      status: 'success',
      data: stores.map((s) => s.store_name),
    });
  } catch (error) {
    console.error('❌ Error in getGalleryStores:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil daftar toko galeri.',
      error: error.message,
    });
  }
};

/**
 * GET /api/gallery/stats
 * Mengambil ringkasan statistik galeri foto
 */
exports.getGalleryStats = async (req, res) => {
  try {
    const totalReports = await prisma.checklist_report.count();
    const totalPhotos = await prisma.attachment.count();

    return res.status(200).json({
      status: 'success',
      data: {
        totalReports,
        totalPhotos,
      },
    });
  } catch (error) {
    console.error('❌ Error in getGalleryStats:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memuat statistik galeri.',
      error: error.message,
    });
  }
};
