const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');
const { encryptImage, decryptImage, isEncrypted } = require('../utils/crypto.utils');

// Koleksi visual gerai toko ritel/kuliner modern sebagai visualisasi gerai yang valid
const STORE_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?q=80&w=700&auto=format&fit=crop',
];

const getStoreVisual = (storeName = '', storeId = 1) => {
  const index = Math.abs(Number(storeId) || 0) % STORE_FALLBACK_IMAGES.length;
  return STORE_FALLBACK_IMAGES[index];
};

/**
 * Format entitas Store dari DB PostgreSQL ke interface yang siap dikonsumsi oleh Frontend
 */
const formatStore = (s) => {
  let tzLabel = 'WIB (UTC+7)';
  let tzFull = 'WIB (UTC+7) - Asia/Jakarta';
  const rawTz = s.time_zone || '';
  if (rawTz.includes('Makassar') || rawTz.includes('WITA') || rawTz.includes('+8')) {
    tzLabel = 'WITA (UTC+8)';
    tzFull = 'WITA (UTC+8) - Asia/Makassar';
  } else if (rawTz.includes('Jayapura') || rawTz.includes('WIT') || rawTz.includes('+9')) {
    tzLabel = 'WIT (UTC+9)';
    tzFull = 'WIT (UTC+9) - Asia/Jayapura';
  }

  // Koordinat default teruji (Jawa Timur / Malang / Jakarta) jika di DB null
  const defaultLat = -7.9826;
  const defaultLng = 112.6308;

  let computedCity = s.city;
  if (!computedCity && s.address) {
    if (s.address.includes('Malang')) computedCity = 'Kota Malang';
    else if (s.address.includes('Surabaya')) computedCity = 'Kota Surabaya';
    else if (s.address.includes('Bandung')) computedCity = 'Kota Bandung';
    else if (s.address.includes('Jakarta')) computedCity = 'DKI Jakarta';
    else if (s.address.includes('Denpasar') || s.address.includes('Bali')) computedCity = 'Kota Denpasar';
    else computedCity = 'Indonesia';
  }

  // --- LOGIKA ENKRIPSI & DEKRIPSI GAMBAR FOTO TOKO ---
  const rawPic = s.store_picture;
  let resolvedPicture = null;
  let isImageEncrypted = false;
  let encryptedPayload = null;

  if (rawPic && typeof rawPic === 'string' && rawPic.trim() !== '') {
    const hasEncryptedTag = isEncrypted(rawPic);
    isImageEncrypted = hasEncryptedTag;
    resolvedPicture = hasEncryptedTag ? decryptImage(rawPic) : rawPic;

    // Jika URL di database adalah link dummy googleapis yang broken (403), gantikan dengan visual outlet valid
    if (resolvedPicture && resolvedPicture.includes('storage.googleapis.com')) {
      resolvedPicture = getStoreVisual(s.store_name, s.store_id);
    }
    encryptedPayload = hasEncryptedTag ? rawPic : encryptImage(resolvedPicture);
  }

  return {
    id: s.store_id.toString(),
    storeId: s.store_id.toString(),
    name: s.store_name,
    storeName: s.store_name,
    city: computedCity || 'Kota Malang',
    address: s.address || '-',
    timezone: tzLabel,
    timezoneLabel: tzFull,
    geofenceRadius: s.location_radius_gps ? Number(s.location_radius_gps) : 100,
    latitude: s.latitude ? Number(s.latitude) : defaultLat,
    longitude: s.longitude ? Number(s.longitude) : defaultLng,
    operationalHours: 'Setiap hari • 10:00 - 22:00 WIB',
    description: s.description || `Gerai resmi ${s.store_name}. Terhubung dengan sistem Audit Pro.`,
    findingsCount: 0,
    status: s.status === 'inactive' || s.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
    rawStatus: s.status || 'active',
    workspace: s.workspace ? s.workspace.company_name : 'Workspace',
    workspaceId: s.workspace_id ? s.workspace_id.toString() : null,
    managerName: s.admin ? s.admin.name : '-',
    phone: s.admin ? (s.admin.phone_number || '0812-3456-7890') : '-',
    // Foto toko (Hasil dekripsi yang siap dirender langsung oleh browser tag <img>)
    storePicture: resolvedPicture,
    isImageEncrypted: isImageEncrypted || (resolvedPicture ? true : false),
    createdAt: s.created_at
      ? new Date(s.created_at).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '-',
  };
};

/**
 * GET /api/stores
 * Mengambil daftar toko yang tersinkronisasi dan disesuaikan dengan Workspace
 */
exports.getAllStores = async (req, res) => {
  try {
    const user = await extractUser(req);
    const requestedWsId = req.query.workspaceId || req.headers['x-workspace-id'];
    const where = {};

    // 1. Logika penentuan workspace:
    if (user && (user.role === 'Divisi Teknis' || user.role === 'Teknis') && user.workspaceId) {
      // Divisi Teknis: Terisolasi mutlak ke sandbox internal untuk testing
      where.workspace_id = BigInt(user.workspaceId);
    } else if (requestedWsId && requestedWsId !== 'all') {
      const cleanWs = BigInt(requestedWsId.toString().replace(/^ws-/, ''));
      where.workspace_id = cleanWs;
    } else if (user && user.role === 'Admin' && user.workspaceId) {
      // Jika Admin biasa: batasi mutlak ke workspace miliknya
      where.workspace_id = BigInt(user.workspaceId);
    } else if (user && user.role === 'Super Admin' && user.rawId) {
      // Jika Super Admin tanpa filter workspace spesifik: tampilkan seluruh toko di bawah perusahaannya
      const cleanSaId = BigInt(user.rawId);
      where.workspace = {
        super_admin_id: cleanSaId,
      };
    } else if (req.query.superAdminId) {
      const cleanSaId = BigInt(req.query.superAdminId.toString().replace(/^sa-/, ''));
      where.workspace = {
        super_admin_id: cleanSaId,
      };
    }

    // 2. Filter Status jika diberikan
    if (req.query.status && req.query.status !== 'Semua') {
      const st = req.query.status.toLowerCase();
      if (st === 'aktif' || st === 'active') {
        where.status = 'active';
      } else if (st === 'nonaktif' || st === 'inactive') {
        where.status = 'inactive';
      }
    }

    // 3. Filter Pencarian kata kunci
    if (req.query.search) {
      const q = req.query.search.trim();
      where.OR = [
        { store_name: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }

    const stores = await prisma.store.findMany({
      where,
      include: {
        workspace: true,
        admin: true,
      },
      orderBy: {
        store_id: 'asc',
      },
    });

    // Deduplikasi jika ada nama toko ganda dalam satu workspace
    const seenNames = new Set();
    const uniqueStores = [];
    for (const s of stores) {
      const key = `${s.workspace_id || ''}-${(s.store_name || '').trim().toLowerCase()}`;
      if (!seenNames.has(key)) {
        seenNames.add(key);
        uniqueStores.push(s);
      }
    }

    const formatted = uniqueStores.map(formatStore);

    return res.status(200).json({
      status: 'success',
      total: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error('❌ Error in getAllStores:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data toko dari database',
      error: error.message,
    });
  }
};

/**
 * GET /api/stores/:id
 * Mengambil detail 1 toko berdasarkan ID
 */
exports.getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/^toko-/, ''));

    const s = await prisma.store.findUnique({
      where: { store_id: cleanId },
      include: {
        workspace: true,
        admin: true,
      },
    });

    if (!s) {
      return res.status(404).json({
        status: 'error',
        message: 'Toko tidak ditemukan.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: formatStore(s),
    });
  } catch (error) {
    console.error('❌ Error in getStoreById:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memuat detail toko',
      error: error.message,
    });
  }
};

/**
 * POST /api/stores
 * Menambahkan toko baru ke database dengan enkripsi foto toko otomatis
 */
exports.createStore = async (req, res) => {
  try {
    const user = await extractUser(req);
    const {
      name,
      storeName,
      address,
      city,
      timezone,
      timeZone,
      geofenceRadius,
      locationRadiusGps,
      latitude,
      longitude,
      description,
      status,
      workspaceId,
      workspace,
      adminId,
      storePicture,
      store_picture,
      image,
    } = req.body;

    const rawName = (name || storeName || '').trim();
    if (!rawName) {
      return res.status(400).json({
        status: 'error',
        message: 'Nama toko wajib diisi.',
      });
    }

    // Tentukan Workspace ID tujuan
    let targetWsId =
      (user && (user.role === 'Divisi Teknis' || user.role === 'Teknis') && user.workspaceId)
        ? user.workspaceId
        : (workspaceId ||
           (user && user.workspaceId ? user.workspaceId : null) ||
           req.headers['x-workspace-id']);

    if (!targetWsId && workspace) {
      const foundWs = await prisma.workspace.findFirst({
        where: { company_name: workspace.trim() },
      });
      if (foundWs) {
        targetWsId = foundWs.workspace_id.toString();
      }
    }

    if (!targetWsId) {
      if (user && user.rawId) {
        const firstWs = await prisma.workspace.findFirst({
          where: { super_admin_id: BigInt(user.rawId) },
        });
        if (firstWs) targetWsId = firstWs.workspace_id.toString();
      }
    }

    if (!targetWsId) {
      return res.status(400).json({
        status: 'error',
        message: 'ID Workspace tidak ditemukan. Silakan pilih workspace terlebih dahulu.',
      });
    }

    const cleanWsId = BigInt(targetWsId.toString().replace(/^ws-/, ''));

    // Validasi Workspace: jika workspace dinonaktifkan, hentikan penambahan toko
    const targetWs = await prisma.workspace.findUnique({
      where: { workspace_id: cleanWsId },
      select: { status: true },
    });
    if (targetWs && (targetWs.status === 'inactive' || targetWs.status === 'Nonaktif')) {
      return res.status(403).json({
        status: 'error',
        message: 'Workspace ini sedang dinonaktifkan. Seluruh sistem operasional dan penambahan toko diberhentikan.',
      });
    }

    // Pastikan ada Admin yang terhubung ke workspace ini
    let assignedAdminId = adminId ? BigInt(adminId.toString().replace(/^adm-/, '')) : null;

    if (!assignedAdminId) {
      const existingAdmin = await prisma.admin.findFirst({
        where: { workspace_id: cleanWsId },
      });

      if (existingAdmin) {
        assignedAdminId = existingAdmin.admin_id;
      } else {
        const createdAdmin = await prisma.admin.create({
          data: {
            workspace_id: cleanWsId,
            name: `Admin Operasional ${targetWsId}`,
            email: `admin.ops.ws${targetWsId}_${Date.now()}@auditcorp.com`,
            password: 'default_admin_pass',
            status: 'active',
          },
        });
        assignedAdminId = createdAdmin.admin_id;
      }
    }

    // Mapping timezone
    let cleanTz = timezone || timeZone || 'Asia/Jakarta';
    if (cleanTz.includes('WIB')) cleanTz = 'Asia/Jakarta';
    else if (cleanTz.includes('WITA')) cleanTz = 'Asia/Makassar';
    else if (cleanTz.includes('WIT')) cleanTz = 'Asia/Jayapura';

    const cleanRadius = geofenceRadius || locationRadiusGps || 100;
    const dbStatus =
      status === 'Nonaktif' || status === 'inactive' ? 'inactive' : 'active';

    // Enkripsi gambar foto toko sebelum disimpan ke database
    const incomingPic = storePicture || store_picture || image;
    const encryptedStorePic = incomingPic ? encryptImage(incomingPic) : null;

    const newStore = await prisma.store.create({
      data: {
        workspace_id: cleanWsId,
        admin_id: assignedAdminId,
        store_name: rawName,
        address: address ? address.trim() : '-',
        city: city ? city.trim() : null,
        time_zone: cleanTz,
        location_radius_gps: String(cleanRadius),
        latitude: latitude ? String(latitude) : null,
        longitude: longitude ? String(longitude) : null,
        description: description ? description.trim() : null,
        store_picture: encryptedStorePic,
        status: dbStatus,
      },
      include: {
        workspace: true,
        admin: true,
      },
    });

    return res.status(201).json({
      status: 'success',
      message: `Toko "${rawName}" berhasil ditambahkan ke database!`,
      data: formatStore(newStore),
    });
  } catch (error) {
    console.error('❌ Error creating store:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menambahkan toko ke database',
      error: error.message,
    });
  }
};

/**
 * PUT /api/stores/:id
 * Memperbarui data toko di database dengan enkripsi foto toko
 */
exports.updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/^toko-/, ''));

    const existingStore = await prisma.store.findUnique({
      where: { store_id: cleanId },
    });

    if (!existingStore) {
      return res.status(404).json({
        status: 'error',
        message: 'Data toko yang akan diubah tidak ditemukan.',
      });
    }

    const {
      name,
      storeName,
      address,
      city,
      timezone,
      timeZone,
      geofenceRadius,
      locationRadiusGps,
      latitude,
      longitude,
      description,
      status,
      storePicture,
      store_picture,
      image,
    } = req.body;

    const dataToUpdate = {
      updated_at: new Date(),
    };

    if (name || storeName) dataToUpdate.store_name = (name || storeName).trim();
    if (address !== undefined) dataToUpdate.address = address.trim();
    if (city !== undefined) dataToUpdate.city = city.trim();
    if (description !== undefined) dataToUpdate.description = description.trim();

    // Update & Enkripsi foto toko (Mendukung simpan foto baru atau hapus foto toko menjadi null)
    if (storePicture !== undefined || store_picture !== undefined || image !== undefined) {
      const incomingPic =
        storePicture !== undefined
          ? storePicture
          : (store_picture !== undefined ? store_picture : image);

      if (!incomingPic || incomingPic === '' || incomingPic === 'null' || incomingPic === null) {
        // Foto toko dihapus
        dataToUpdate.store_picture = null;
      } else {
        dataToUpdate.store_picture = encryptImage(incomingPic);
      }
    }

    if (timezone || timeZone) {
      let cleanTz = timezone || timeZone;
      if (cleanTz.includes('WIB')) cleanTz = 'Asia/Jakarta';
      else if (cleanTz.includes('WITA')) cleanTz = 'Asia/Makassar';
      else if (cleanTz.includes('WIT')) cleanTz = 'Asia/Jayapura';
      dataToUpdate.time_zone = cleanTz;
    }

    if (geofenceRadius !== undefined || locationRadiusGps !== undefined) {
      dataToUpdate.location_radius_gps = String(geofenceRadius || locationRadiusGps);
    }

    if (latitude !== undefined) {
      dataToUpdate.latitude = latitude ? String(latitude) : null;
    }
    if (longitude !== undefined) {
      dataToUpdate.longitude = longitude ? String(longitude) : null;
    }

    if (status !== undefined) {
      dataToUpdate.status =
        status === 'Nonaktif' || status === 'inactive' ? 'inactive' : 'active';
    }

    const updatedStore = await prisma.store.update({
      where: { store_id: cleanId },
      data: dataToUpdate,
      include: {
        workspace: true,
        admin: true,
      },
    });

    return res.status(200).json({
      status: 'success',
      message: `Data toko "${updatedStore.store_name}" berhasil diperbarui!`,
      data: formatStore(updatedStore),
    });
  } catch (error) {
    console.error('❌ Error updating store:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memperbarui data toko di database',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/stores/:id
 * Menghapus atau me-nonaktifkan toko dari database
 */
exports.deleteStore = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/^toko-/, ''));
    const isPermanent = req.query.permanent === 'true';

    const existingStore = await prisma.store.findUnique({
      where: { store_id: cleanId },
    });

    if (!existingStore) {
      return res.status(404).json({
        status: 'error',
        message: 'Toko tidak ditemukan.',
      });
    }

    if (isPermanent) {
      await prisma.store.delete({
        where: { store_id: cleanId },
      });
      return res.status(200).json({
        status: 'success',
        message: `Toko "${existingStore.store_name}" telah dihapus secara permanen.`,
      });
    }

    // Default: Soft Delete (Nonaktifkan)
    const newStatus = existingStore.status === 'active' ? 'inactive' : 'active';
    const updated = await prisma.store.update({
      where: { store_id: cleanId },
      data: {
        status: newStatus,
        updated_at: new Date(),
      },
      include: {
        workspace: true,
        admin: true,
      },
    });

    return res.status(200).json({
      status: 'success',
      message:
        newStatus === 'inactive'
          ? `Toko "${updated.store_name}" dinonaktifkan sementara.`
          : `Toko "${updated.store_name}" telah diaktifkan kembali.`,
      data: formatStore(updated),
    });
  } catch (error) {
    console.error('❌ Error deleting store:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menghapus toko dari database',
      error: error.message,
    });
  }
};
