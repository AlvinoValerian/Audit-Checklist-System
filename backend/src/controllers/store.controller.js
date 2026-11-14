const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');
const { encryptImage, decryptImage, isEncrypted } = require('../utils/crypto.utils');
const {
  isTeknisUser,
  toBigIntSafe,
  getTeknisWorkspaceWhere,
  isWorkspaceInTeknisScope,
  resolveTeknisTargetWorkspaceId,
} = require('../utils/teknisScope');
const {
  assertWorkspaceAccess,
  resolveScopedWorkspaceContext,
  assertStoreAccess,
  sendSafeError,
} = require('../utils/tenantScope');

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

  if (rawPic && typeof rawPic === 'string' && rawPic.trim() !== '') {
    const hasEncryptedTag = isEncrypted(rawPic);
    isImageEncrypted = hasEncryptedTag;
    resolvedPicture = hasEncryptedTag ? decryptImage(rawPic) : rawPic;

    // Jika URL di database adalah link dummy googleapis yang broken (403), gantikan dengan visual outlet valid
    if (resolvedPicture && resolvedPicture.includes('storage.googleapis.com')) {
      resolvedPicture = getStoreVisual(s.store_name, s.store_id);
    }
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
    const user = req.user || (await extractUser(req));
    const requestedWsId = req.query.workspaceId || req.headers['x-workspace-id'];

    const scope = await resolveScopedWorkspaceContext(user, requestedWsId, {
      teknisUseSingleDefaultOnAll: true,
    });
    if (!scope.ok) {
      return res.status(scope.status).json({
        status: 'error',
        message: scope.message,
      });
    }
    if (scope.workspaceIds.length === 0) {
      return res.status(200).json({ status: 'success', total: 0, data: [] });
    }

    const where = scope.prismaWorkspaceWhere.workspace_id
      ? { workspace_id: scope.prismaWorkspaceWhere.workspace_id }
      : { workspace: scope.prismaWorkspaceWhere };

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
    return sendSafeError(res, error, 'Gagal mengambil data toko dari database');
  }
};

/**
 * GET /api/stores/:id
 * Mengambil detail 1 toko berdasarkan ID
 */
exports.getStoreById = async (req, res) => {
  try {
    const user = req.user || (await extractUser(req));
    const storeAccess = await assertStoreAccess(user, req.params.id);
    if (!storeAccess.ok) {
      return res.status(storeAccess.status).json({
        status: 'error',
        message: storeAccess.message,
      });
    }

    const s = await prisma.store.findUnique({
      where: { store_id: storeAccess.storeId },
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
    return sendSafeError(res, error, 'Gagal memuat detail toko');
  }
};

/**
 * POST /api/stores
 * Menambahkan toko baru ke database dengan enkripsi foto toko otomatis
 */
exports.createStore = async (req, res) => {
  try {
    const user = req.user || (await extractUser(req));
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

    // Tentukan Workspace ID tujuan secara ketat di dalam lingkup akun
    let cleanWsId = null;

    if (isTeknisUser(user)) {
      const explicitWs = workspaceId || req.headers['x-workspace-id'] || req.query.workspaceId;
      if (explicitWs && explicitWs !== 'all') {
        const parsedWs = toBigIntSafe(explicitWs, ['ws-']);
        if (!parsedWs || !(await isWorkspaceInTeknisScope(parsedWs))) {
          return res.status(403).json({
            status: 'error',
            message: 'Anda tidak memiliki akses untuk menambah toko di workspace tenant lain.',
          });
        }
        cleanWsId = parsedWs;
      } else if (workspace) {
        const teknisWhere = await getTeknisWorkspaceWhere();
        const foundWs = await prisma.workspace.findFirst({
          where: {
            AND: [{ company_name: workspace.trim() }, teknisWhere],
          },
          select: { workspace_id: true },
        });
        if (!foundWs) {
          return res.status(403).json({
            status: 'error',
            message: 'Workspace yang dipilih berada di luar lingkup Divisi Teknis.',
          });
        }
        cleanWsId = foundWs.workspace_id;
      } else {
        cleanWsId = await resolveTeknisTargetWorkspaceId(null, user.workspaceId);
      }
    } else {
      const scope = await resolveScopedWorkspaceContext(
        user,
        workspaceId || req.headers['x-workspace-id'] || req.query.workspaceId
      );
      if (!scope.ok) {
        return res.status(scope.status).json({ status: 'error', message: scope.message });
      }
      if (!workspaceId && workspace) {
        const foundWs = await prisma.workspace.findFirst({
          where: {
            AND: [{ company_name: workspace.trim() }, scope.prismaWorkspaceWhere],
          },
          select: { workspace_id: true },
        });
        if (!foundWs) {
          return res.status(403).json({
            status: 'error',
            message: 'Workspace yang dipilih tidak ditemukan dalam lingkup akun Anda.',
          });
        }
        cleanWsId = foundWs.workspace_id;
      } else {
        cleanWsId = scope.targetWorkspaceId;
      }
    }

    if (!cleanWsId) {
      return res.status(400).json({
        status: 'error',
        message: 'ID Workspace tidak ditemukan. Silakan pilih workspace terlebih dahulu.',
      });
    }

    const wsAccess = await assertWorkspaceAccess(user, cleanWsId);
    if (!wsAccess.ok) {
      return res.status(wsAccess.status).json({ status: 'error', message: wsAccess.message });
    }

    const targetWs = wsAccess.workspace;
    if (targetWs.status === 'inactive' || targetWs.status === 'Nonaktif') {
      return res.status(403).json({
        status: 'error',
        message: 'Workspace ini sedang dinonaktifkan. Seluruh sistem operasional dan penambahan toko diberhentikan.',
      });
    }

    // Pastikan Admin penanggung jawab toko memang berada pada workspace yang sama
    let assignedAdminId = null;
    if (adminId) {
      const parsedAdminId = toBigIntSafe(adminId, ['adm-']);
      if (parsedAdminId) {
        const admOwner = await prisma.admin.findFirst({
          where: { admin_id: parsedAdminId, workspace_id: cleanWsId },
          select: { admin_id: true },
        });
        if (!admOwner) {
          return res.status(403).json({
            status: 'error',
            message: 'Admin penanggung jawab tidak berada dalam workspace ini.',
          });
        }
        assignedAdminId = admOwner.admin_id;
      }
    }

    if (!assignedAdminId) {
      const existingAdmin = await prisma.admin.findFirst({
        where: { workspace_id: cleanWsId },
      });

      if (existingAdmin) {
        assignedAdminId = existingAdmin.admin_id;
      } else {
        const wsIdStr = cleanWsId.toString();
        const randomHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
        const createdAdmin = await prisma.admin.create({
          data: {
            workspace_id: cleanWsId,
            name: `Admin Operasional ${wsIdStr}`,
            email: `admin.ops.ws${wsIdStr}_${Date.now()}@auditcorp.com`,
            password: randomHash,
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
    return sendSafeError(res, error, 'Gagal menambahkan toko ke database');
  }
};

/**
 * PUT /api/stores/:id
 * Memperbarui data toko di database dengan enkripsi foto toko
 */
exports.updateStore = async (req, res) => {
  try {
    const user = req.user || (await extractUser(req));
    const storeAccess = await assertStoreAccess(user, req.params.id);
    if (!storeAccess.ok) {
      return res.status(storeAccess.status).json({
        status: 'error',
        message: storeAccess.message,
      });
    }
    const cleanId = storeAccess.storeId;

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
    return sendSafeError(res, error, 'Gagal memperbarui data toko di database');
  }
};

/**
 * DELETE /api/stores/:id
 * Menghapus atau me-nonaktifkan toko dari database
 */
exports.deleteStore = async (req, res) => {
  try {
    const user = req.user || (await extractUser(req));
    const storeAccess = await assertStoreAccess(user, req.params.id);
    if (!storeAccess.ok) {
      return res.status(storeAccess.status).json({
        status: 'error',
        message: storeAccess.message,
      });
    }
    const cleanId = storeAccess.storeId;
    const existingStore = storeAccess.store;
    const isPermanent = req.query.permanent === 'true';

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
    return sendSafeError(res, error, 'Gagal menghapus toko dari database');
  }
};
