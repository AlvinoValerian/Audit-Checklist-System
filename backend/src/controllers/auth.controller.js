const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { encryptImageData } = require('../utils/imageCrypto');
const { findEmailConflict } = require('../utils/emailUniqueness');
const {
  AUTH_COOKIE_NAME,
  getJwtSecret,
  ensureTokenVersionColumns,
  getRecordTokenVersion,
  bumpTokenVersion,
  extractUser,
} = require('../middlewares/auth.middleware');
const { sendSafeError, isStaffRole, isSuperAdminRole } = require('../utils/tenantScope');

const DASHBOARD_JWT_EXPIRES_IN = '4h';
const DASHBOARD_COOKIE_MAX_AGE_MS = 4 * 60 * 60 * 1000;
const STAFF_JWT_EXPIRES_IN = '12h';
const STAFF_COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

const setAuthCookie = (req, res, token, maxAgeMs) => {
  const isHttps = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: isHttps,
    maxAge: maxAgeMs,
  });
};

const clearAuthCookie = (req, res) => {
  const isHttps = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: isHttps,
  });
};

/**
 * Helper untuk mengambil kolom tambahan staff (position, deleted_at)
 * yang belum didefinisikan pada Prisma schema statik
 */
const getStaffExtra = async (staffId) => {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT position, deleted_at, COALESCE(token_version, 0) AS token_version FROM staff WHERE staff_id = $1 LIMIT 1`,
      staffId
    );
    return rows && rows[0] ? rows[0] : {};
  } catch (e) {
    return {};
  }
};

/**
 * Helper untuk format response Super Admin
 */
const formatAuthSuperAdmin = (sa, token) => {
  return {
    token,
    user: {
      id: `sa-${sa.super_admin_id.toString()}`,
      rawId: sa.super_admin_id.toString(),
      fullName: sa.name,
      email: sa.email,
      phone: sa.phone_number || '-',
      companyName: sa.company_name || 'Audit Pro System',
      role: 'Super Admin',
      status: 'Aktif',
      profilePicture: sa.profile_picture || null,
    },
  };
};

/**
 * POST /api/auth/register
 * Mendaftarkan akun baru dan secara otomatis menjadikannya sebagai SUPER ADMIN
 */
exports.register = async (req, res) => {
  try {
    await ensureTokenVersionColumns();

    console.log('📥 [POST /api/auth/register] Menerima data pendaftaran:', {
      ...req.body,
      password: req.body.password ? '******' : undefined,
    });

    const {
      fullName,
      name,
      companyEmail,
      email,
      phoneNumber,
      phone,
      companyName,
      password,
    } = req.body;

    const rawName = (fullName || name || '').trim();
    const rawEmail = (companyEmail || email || '').trim().toLowerCase();
    const rawPhone = (phoneNumber || phone || '').trim();
    const rawCompany = (companyName || '').trim();
    const rawPassword = password || '';

    // 1. Validasi Nama Lengkap: Wajib diisi, hanya huruf dan spasi (tanpa angka dan simbol)
    if (!rawName) {
      return res.status(400).json({
        status: 'error',
        message: 'Nama lengkap wajib diisi.',
      });
    }
    if (!/^[a-zA-Z\s]+$/.test(rawName)) {
      return res.status(400).json({
        status: 'error',
        message: 'Nama lengkap hanya boleh berisi huruf dan spasi (tidak boleh menggunakan angka atau simbol).',
      });
    }

    // 2. Validasi Email Perusahaan: Wajib diisi, format email standar dengan domain valid (.com, .co.id, dll)
    if (!rawEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'Email perusahaan wajib diisi.',
      });
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(rawEmail)) {
      return res.status(400).json({
        status: 'error',
        message: 'Format email tidak valid. Pastikan menyertakan domain yang valid (contoh: nama@perusahaan.com atau nama@gmail.com).',
      });
    }

    // 3. Validasi Nomor Telepon: Wajib diisi, hanya angka (10-15 digit)
    if (!rawPhone) {
      return res.status(400).json({
        status: 'error',
        message: 'Nomor telepon wajib diisi.',
      });
    }
    if (!/^\d+$/.test(rawPhone)) {
      return res.status(400).json({
        status: 'error',
        message: 'Nomor telepon hanya boleh berisi angka (tanpa huruf atau simbol).',
      });
    }
    if (rawPhone.length < 10 || rawPhone.length > 15) {
      return res.status(400).json({
        status: 'error',
        message: 'Nomor telepon harus terdiri dari 10 hingga 15 digit angka.',
      });
    }

    // 4. Validasi Nama Perusahaan: Wajib diisi, hanya huruf, angka, dan spasi (tanpa simbol)
    if (!rawCompany) {
      return res.status(400).json({
        status: 'error',
        message: 'Nama perusahaan wajib diisi.',
      });
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(rawCompany)) {
      return res.status(400).json({
        status: 'error',
        message: 'Nama perusahaan hanya boleh berisi huruf, angka, dan spasi (tidak boleh menggunakan simbol).',
      });
    }

    // 5. Validasi Kata Sandi:
    // - Minimal 8 karakter
    // - Tidak boleh menggunakan simbol (hanya huruf dan angka)
    // - Harus ada huruf kapital
    // - Kombinasi wajib: harus ada huruf dan angka
    if (!rawPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Kata sandi wajib diisi.',
      });
    }
    if (rawPassword.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Kata sandi minimal 8 karakter.',
      });
    }
    if (/[^a-zA-Z0-9]/.test(rawPassword)) {
      return res.status(400).json({
        status: 'error',
        message: 'Kata sandi tidak boleh menggunakan simbol, hanya boleh kombinasi huruf dan angka.',
      });
    }
    if (!/[A-Z]/.test(rawPassword)) {
      return res.status(400).json({
        status: 'error',
        message: 'Kata sandi harus mengandung minimal 1 huruf kapital (huruf besar).',
      });
    }
    if (!/[a-zA-Z]/.test(rawPassword) || !/[0-9]/.test(rawPassword)) {
      return res.status(400).json({
        status: 'error',
        message: 'Kata sandi harus mengombinasikan huruf dan angka (keduanya wajib ada).',
      });
    }

    // Cek duplikasi email lintas tabel super_admin, admin, dan staff
    const emailConflict = await findEmailConflict(rawEmail);

    if (emailConflict) {
      return res.status(400).json({
        status: 'error',
        message: `Email "${rawEmail}" sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.`,
      });
    }

    // Hash kata sandi dengan bcrypt
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // 1. Simpan akun ke tabel super_admin
    const newSuperAdmin = await prisma.super_admin.create({
      data: {
        name: rawName,
        email: rawEmail,
        phone_number: rawPhone || null,
        company_name: rawCompany || 'Perusahaan Retail',
        password: hashedPassword,
      },
    });

    console.log('✅ [POST /api/auth/register] Berhasil membuat Super Admin:', newSuperAdmin.name, `(ID: ${newSuperAdmin.super_admin_id})`);

    // 2. Buat workspace default untuk super admin baru ini
    let createdWorkspace = null;
    try {
      createdWorkspace = await prisma.workspace.create({
        data: {
          super_admin_id: newSuperAdmin.super_admin_id,
          company_name: rawCompany || `${rawName}'s Workspace`,
          description: `Workspace utama untuk ${rawCompany || rawName}`,
          category: 'Retail',
          pic_name: rawName,
          pic_contact: rawPhone || '-',
          head_office_address: '-',
          status: 'active',
        },
      });
      console.log('✅ [POST /api/auth/register] Berhasil membuat default workspace:', createdWorkspace.company_name);
    } catch (wsErr) {
      console.warn('⚠️ Gagal membuat default workspace otomatis (namun Super Admin tetap berhasil dibuat):', wsErr.message);
    }

    const dbTv = await getRecordTokenVersion('super_admin', 'super_admin_id', newSuperAdmin.super_admin_id);

    // 3. Generate token JWT + set HttpOnly cookie
    const token = jwt.sign(
      {
        id: `sa-${newSuperAdmin.super_admin_id.toString()}`,
        rawId: newSuperAdmin.super_admin_id.toString(),
        email: newSuperAdmin.email,
        role: 'Super Admin',
        tv: dbTv,
      },
      getJwtSecret(),
      { expiresIn: DASHBOARD_JWT_EXPIRES_IN }
    );

    setAuthCookie(req, res, token, DASHBOARD_COOKIE_MAX_AGE_MS);
    const formattedData = formatAuthSuperAdmin(newSuperAdmin, token);

    return res.status(201).json({
      status: 'success',
      message: 'Registrasi berhasil! Akun Anda telah terdaftar sebagai Super Admin.',
      data: {
        ...formattedData,
        workspace: createdWorkspace
          ? {
              id: createdWorkspace.workspace_id.toString(),
              name: createdWorkspace.company_name,
            }
          : null,
      },
    });
  } catch (error) {
    return sendSafeError(res, error, 'Terjadi kesalahan pada server saat memproses registrasi.');
  }
};

/**
 * POST /api/auth/login
 * Login kredensial untuk Super Admin, Admin, Divisi Teknis, atau Staff
 */
exports.login = async (req, res) => {
  try {
    await ensureTokenVersionColumns();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email dan kata sandi wajib diisi.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Jalankan pencarian user di tabel super_admin, admin, dan staff secara paralel
    const [superAdmin, admin, staff] = await Promise.all([
      prisma.super_admin.findUnique({
        where: { email: cleanEmail },
      }),
      prisma.admin.findUnique({
        where: { email: cleanEmail },
        include: { workspace: true },
      }),
      prisma.staff.findUnique({
        where: { email: cleanEmail },
        include: {
          store: {
            include: {
              workspace: true,
            },
          },
          admin: true,
        },
      }),
    ]);

    if (superAdmin) {
      const isMatch = await bcrypt.compare(password, superAdmin.password);
      if (!isMatch) {
        return res.status(401).json({
          status: 'error',
          message: 'Kata sandi salah. Silakan periksa kembali.',
        });
      }

      const dbTv = await getRecordTokenVersion('super_admin', 'super_admin_id', superAdmin.super_admin_id);
      const token = jwt.sign(
        {
          id: `sa-${superAdmin.super_admin_id.toString()}`,
          rawId: superAdmin.super_admin_id.toString(),
          email: superAdmin.email,
          role: 'Super Admin',
          tv: dbTv,
        },
        getJwtSecret(),
        { expiresIn: DASHBOARD_JWT_EXPIRES_IN }
      );

      setAuthCookie(req, res, token, DASHBOARD_COOKIE_MAX_AGE_MS);

      return res.status(200).json({
        status: 'success',
        message: 'Login berhasil sebagai Super Admin.',
        data: formatAuthSuperAdmin(superAdmin, token),
      });
    }

    // 2. Cek akun admin / divisi teknis
    if (admin) {
      if (admin.status === 'inactive' || admin.status === 'Nonaktif' || admin.deleted_at) {
        return res.status(403).json({
          status: 'error',
          message: 'Akun Anda berstatus Nonaktif. Hubungi Super Admin untuk mengaktifkan kembali.',
        });
      }

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({
          status: 'error',
          message: 'Kata sandi salah. Silakan periksa kembali.',
        });
      }

      const userRole = admin.role || 'Admin';
      const dbTv = await getRecordTokenVersion('admin', 'admin_id', admin.admin_id);

      const token = jwt.sign(
        {
          id: admin.admin_id.toString(),
          rawId: admin.admin_id.toString(),
          email: admin.email,
          role: userRole,
          workspaceId: admin.workspace_id.toString(),
          tv: dbTv,
        },
        getJwtSecret(),
        { expiresIn: DASHBOARD_JWT_EXPIRES_IN }
      );

      setAuthCookie(req, res, token, DASHBOARD_COOKIE_MAX_AGE_MS);

      return res.status(200).json({
        status: 'success',
        message: `Login berhasil sebagai ${userRole || 'Admin'}.`,
        data: {
          token,
          user: {
            id: admin.admin_id.toString(),
            rawId: admin.admin_id.toString(),
            fullName: admin.name,
            email: admin.email,
            role: userRole,
            workspaceId: admin.workspace_id.toString(),
            workspaceName: admin.workspace ? admin.workspace.company_name : 'Workspace',
            status: 'Aktif',
            profilePicture: admin.profile_picture || null,
          },
        },
      });
    }

    if (staff) {
      const extra = await getStaffExtra(staff.staff_id);
      if (extra.deleted_at || staff.status === 'inactive' || staff.status === 'Nonaktif') {
        return res.status(403).json({
          status: 'error',
          message: 'Akun staf Anda berstatus Nonaktif atau telah dihapus. Hubungi Admin untuk mengaktifkan kembali.',
        });
      }

      let isMatch = false;
      if (staff.password.startsWith('$2b$') || staff.password.startsWith('$2a$')) {
        isMatch = await bcrypt.compare(password, staff.password);
      } else {
        isMatch = staff.password === password;
        if (isMatch) {
          // Tingkatkan otomatis sandi plaintext warisan menjadi hash bcrypt setelah verifikasi sukses
          try {
            const upgradedHash = await bcrypt.hash(password, 10);
            await prisma.staff.update({
              where: { staff_id: staff.staff_id },
              data: { password: upgradedHash },
            });
          } catch (upgradeErr) {
            console.warn('⚠️ Gagal upgrade hash password staff:', upgradeErr.message);
          }
        }
      }

      if (!isMatch) {
        return res.status(401).json({
          status: 'error',
          message: 'Kata sandi salah. Silakan periksa kembali.',
        });
      }

      const staffPosition = extra.position || 'Auditor Lapangan';
      const storeCode = staff.store ? `ST-${staff.store.store_id.toString()}` : 'ST-01';
      const storeIdStr = staff.store_id ? staff.store_id.toString() : null;
      const dbTv = Number(extra.token_version ?? 0);

      const token = jwt.sign(
        {
          id: `staff-${staff.staff_id.toString()}`,
          rawId: staff.staff_id.toString(),
          email: staff.email,
          role: 'Staff',
          position: staffPosition,
          storeId: storeIdStr,
          workspaceId: staff.store?.workspace_id?.toString() || staff.admin?.workspace_id?.toString() || '',
          tv: dbTv,
        },
        getJwtSecret(),
        { expiresIn: STAFF_JWT_EXPIRES_IN }
      );

      setAuthCookie(req, res, token, STAFF_COOKIE_MAX_AGE_MS);

      return res.status(200).json({
        status: 'success',
        message: 'Login berhasil sebagai Staff Lapangan.',
        data: {
          token,
          user: {
            id: `staff-${staff.staff_id.toString()}`,
            rawId: staff.staff_id.toString(),
            fullName: staff.name,
            email: staff.email,
            phone: staff.phone_number || '-',
            role: 'Staff',
            position: staffPosition,
            storeId: storeIdStr,
            storeName: staff.store ? staff.store.store_name : 'Toko Cabang',
            storeLocation: staff.store ? (staff.store.address || staff.store.city || 'Cabang') : 'Cabang',
            storeAddress: staff.store?.address || staff.store?.city || '-',
            storeCode: storeCode,
            workspaceId: staff.store?.workspace_id?.toString() || staff.admin?.workspace_id?.toString() || '',
            workspaceName: staff.store?.workspace?.company_name || 'Workspace',
            status: 'Aktif',
            profilePicture: staff.photo || null,
          },
        },
      });
    }

    return res.status(404).json({
      status: 'error',
      message: 'Email tidak ditemukan. Pastikan email terdaftar atau lakukan pendaftaran terlebih dahulu.',
    });
  } catch (error) {
    return sendSafeError(res, error, 'Terjadi kesalahan pada server saat memproses login.');
  }
};

/**
 * POST /api/auth/logout
 * Memutus sesi aktif dengan menaikkan token_version user di DB dan menghapus cookie HttpOnly
 */
exports.logout = async (req, res) => {
  try {
    const user = await extractUser(req);
    if (user) {
      await bumpTokenVersion(user);
    }
    clearAuthCookie(req, res);
    return res.status(200).json({
      status: 'success',
      message: 'Berhasil keluar dari sesi.',
    });
  } catch (error) {
    clearAuthCookie(req, res);
    return res.status(200).json({
      status: 'success',
      message: 'Sesi lokal dibersihkan.',
    });
  }
};

/**
 * POST /api/auth/refresh
 * Memperpanjang masa berlaku token & HttpOnly cookie untuk sesi aktif
 */
exports.refresh = async (req, res) => {
  try {
    const user = req.user || (await extractUser(req));
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Sesi tidak valid atau telah kedaluwarsa.',
      });
    }

    const isStaff = isStaffRole(user);
    const expiresIn = isStaff ? STAFF_JWT_EXPIRES_IN : DASHBOARD_JWT_EXPIRES_IN;
    const maxAgeMs = isStaff ? STAFF_COOKIE_MAX_AGE_MS : DASHBOARD_COOKIE_MAX_AGE_MS;

    const payload = isSuperAdminRole(user)
      ? {
          id: `sa-${user.rawId}`,
          rawId: user.rawId,
          email: user.email,
          role: 'Super Admin',
          tv: user.tokenVersion ?? 0,
        }
      : isStaff
        ? {
            id: `staff-${user.rawId}`,
            rawId: user.rawId,
            email: user.email,
            role: 'Staff',
            position: user.position || 'Auditor Lapangan',
            storeId: user.storeId || null,
            workspaceId: user.workspaceId || '',
            tv: user.tokenVersion ?? 0,
          }
        : {
            id: String(user.rawId),
            rawId: user.rawId,
            email: user.email,
            role: user.role,
            workspaceId: user.workspaceId || '',
            tv: user.tokenVersion ?? 0,
          };

    const newToken = jwt.sign(payload, getJwtSecret(), { expiresIn });
    setAuthCookie(req, res, newToken, maxAgeMs);

    return res.status(200).json({
      status: 'success',
      message: 'Sesi berhasil diperpanjang.',
      data: {
        token: newToken,
        user: {
          id: user.id,
          rawId: user.rawId,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          workspaceId: user.workspaceId || '',
          storeId: user.storeId || undefined,
          storeName: user.storeName || undefined,
          position: user.position || undefined,
          status: user.status === 'inactive' || user.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
        },
      },
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal memperpanjang sesi pengguna.');
  }
};

/**
 * GET /api/auth/me
 * Mendapatkan info user yang sedang login (terverifikasi dari JWT Bearer atau HttpOnly cookie)
 */
exports.getMe = async (req, res) => {
  try {
    const authUser = req.user || (await extractUser(req));
    if (!authUser) {
      return res.status(401).json({
        status: 'error',
        message: 'Token otentikasi tidak ditemukan atau tidak valid.',
      });
    }

    const token =
      req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : req.cookies?.[AUTH_COOKIE_NAME] || '';

    if (authUser.role === 'Super Admin') {
      const sa = await prisma.super_admin.findUnique({
        where: { super_admin_id: BigInt(authUser.rawId) },
      });
      if (!sa) {
        return res.status(404).json({ status: 'error', message: 'User tidak ditemukan' });
      }
      return res.status(200).json({
        status: 'success',
        data: formatAuthSuperAdmin(sa, token),
      });
    }

    if (isStaffRole(authUser)) {
      const st = await prisma.staff.findUnique({
        where: { staff_id: BigInt(authUser.rawId) },
        include: {
          store: {
            include: { workspace: true },
          },
        },
      });
      if (!st) {
        return res.status(404).json({ status: 'error', message: 'Staff tidak ditemukan' });
      }
      const extra = await getStaffExtra(st.staff_id);
      if (extra.deleted_at || st.status === 'inactive' || st.status === 'Nonaktif') {
        clearAuthCookie(req, res);
        return res.status(403).json({
          status: 'error',
          code: 'ACCOUNT_INACTIVE',
          message: 'Akun staf Anda berstatus Nonaktif atau telah dihapus.',
        });
      }
      return res.status(200).json({
        status: 'success',
        data: {
          token,
          user: {
            id: `staff-${st.staff_id.toString()}`,
            rawId: st.staff_id.toString(),
            fullName: st.name,
            email: st.email,
            phone: st.phone_number || '-',
            role: 'Staff',
            position: extra.position || 'Auditor Lapangan',
            storeId: st.store_id ? st.store_id.toString() : null,
            storeName: st.store ? st.store.store_name : 'Toko Cabang',
            storeLocation: st.store ? (st.store.address || st.store.city || 'Cabang') : 'Cabang',
            storeAddress: st.store?.address || st.store?.city || '-',
            storeCode: st.store ? `ST-${st.store.store_id.toString()}` : 'ST-01',
            workspaceId: st.store?.workspace_id?.toString() || '',
            workspaceName: st.store?.workspace?.company_name || 'Workspace',
            status: 'Aktif',
            profilePicture: st.photo || null,
          },
        },
      });
    }

    const adm = await prisma.admin.findUnique({
      where: { admin_id: BigInt(authUser.rawId) },
      include: { workspace: true },
    });
    if (!adm) {
      return res.status(404).json({ status: 'error', message: 'User tidak ditemukan' });
    }
    if (adm.status === 'inactive' || adm.status === 'Nonaktif' || adm.deleted_at) {
      clearAuthCookie(req, res);
      return res.status(403).json({
        status: 'error',
        code: 'ACCOUNT_INACTIVE',
        message: 'Akun Anda berstatus Nonaktif atau telah dinonaktifkan.',
      });
    }

    let userRole = authUser.role || 'Admin';
    try {
      const roleRes = await prisma.$queryRaw`SELECT role FROM admin WHERE admin_id = ${adm.admin_id} LIMIT 1`;
      if (roleRes && roleRes[0]?.role) {
        userRole = roleRes[0].role;
      }
    } catch (e) {}

    return res.status(200).json({
      status: 'success',
      data: {
        token,
        user: {
          id: adm.admin_id.toString(),
          rawId: adm.admin_id.toString(),
          fullName: adm.name,
          email: adm.email,
          role: userRole,
          workspaceId: adm.workspace_id.toString(),
          workspaceName: adm.workspace ? adm.workspace.company_name : 'Workspace',
          status: adm.status === 'inactive' ? 'Nonaktif' : 'Aktif',
          profilePicture: adm.profile_picture || null,
        },
      },
    });
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Sesi login telah kedaluwarsa atau token tidak valid.',
    });
  }
};

/**
 * PUT /api/auth/profile
 * Memperbarui nama dan/atau foto profil pengguna yang sedang login (mutlak dari req.user)
 */
exports.updateProfile = async (req, res) => {
  try {
    const authUser = req.user || (await extractUser(req));
    if (!authUser || !authUser.rawId) {
      return res.status(401).json({
        status: 'error',
        message: 'Autentikasi diperlukan untuk memperbarui profil.',
      });
    }

    const { name, profilePicture } = req.body;
    const cleanNumericId = BigInt(authUser.rawId);

    // 1. STAFF
    if (isStaffRole(authUser)) {
      const staff = await prisma.staff.findUnique({
        where: { staff_id: cleanNumericId },
        include: { store: { include: { workspace: true } } },
      });
      if (!staff) {
        return res.status(404).json({ status: 'error', message: 'Staff tidak ditemukan.' });
      }

      const currentExtra = await getStaffExtra(staff.staff_id);
      if (currentExtra.deleted_at || staff.status === 'inactive' || staff.status === 'Nonaktif') {
        return res.status(403).json({
          status: 'error',
          code: 'ACCOUNT_INACTIVE',
          message: 'Akun staf Anda berstatus Nonaktif atau telah dihapus.',
        });
      }

      const updateData = {};
      if (typeof name === 'string' && name.trim()) {
        updateData.name = name.trim();
      }
      if (profilePicture !== undefined) {
        if (!profilePicture) {
          updateData.photo = null;
        } else if (profilePicture.startsWith('ENC:v1:') || profilePicture.startsWith('enc:v1:')) {
          updateData.photo = profilePicture;
        } else {
          updateData.photo = encryptImageData(profilePicture);
        }
      }

      const updatedStaff = await prisma.staff.update({
        where: { staff_id: staff.staff_id },
        data: updateData,
        include: {
          store: { include: { workspace: true } },
        },
      });
      const updatedExtra = await getStaffExtra(updatedStaff.staff_id);

      return res.status(200).json({
        status: 'success',
        message: 'Profil Staf berhasil diperbarui.',
        data: {
          fullName: updatedStaff.name,
          profilePicture: updatedStaff.photo,
          user: {
            id: `staff-${updatedStaff.staff_id.toString()}`,
            rawId: updatedStaff.staff_id.toString(),
            fullName: updatedStaff.name,
            email: updatedStaff.email,
            phone: updatedStaff.phone_number || '-',
            role: 'Staff',
            position: updatedExtra.position || 'Auditor Lapangan',
            storeId: updatedStaff.store_id ? updatedStaff.store_id.toString() : null,
            storeName: updatedStaff.store ? updatedStaff.store.store_name : 'Toko Cabang',
            storeLocation: updatedStaff.store ? (updatedStaff.store.address || updatedStaff.store.city || 'Cabang') : 'Cabang',
            storeAddress: updatedStaff.store?.address || updatedStaff.store?.city || '-',
            storeCode: updatedStaff.store ? `ST-${updatedStaff.store.store_id.toString()}` : 'ST-01',
            workspaceId: updatedStaff.store?.workspace_id?.toString() || '',
            workspaceName: updatedStaff.store?.workspace?.company_name || 'Workspace',
            status: updatedStaff.status === 'inactive' || updatedStaff.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
            profilePicture: updatedStaff.photo || null,
          },
        },
      });
    }

    // 2. SUPER ADMIN
    if (isSuperAdminRole(authUser)) {
      const sa = await prisma.super_admin.findUnique({
        where: { super_admin_id: cleanNumericId },
      });
      if (!sa) {
        return res.status(404).json({ status: 'error', message: 'Super Admin tidak ditemukan.' });
      }

      const updateData = {};
      if (typeof name === 'string' && name.trim()) {
        updateData.name = name.trim();
      }
      if (profilePicture !== undefined) {
        if (!profilePicture) {
          updateData.profile_picture = null;
        } else if (profilePicture.startsWith('ENC:v1:') || profilePicture.startsWith('enc:v1:')) {
          updateData.profile_picture = profilePicture;
        } else {
          updateData.profile_picture = encryptImageData(profilePicture);
        }
      }

      const updatedSa = await prisma.super_admin.update({
        where: { super_admin_id: sa.super_admin_id },
        data: updateData,
      });

      return res.status(200).json({
        status: 'success',
        message: 'Profil Super Admin berhasil diperbarui.',
        data: {
          fullName: updatedSa.name,
          profilePicture: updatedSa.profile_picture,
        },
      });
    }

    // 3. ADMIN / DIVISI TEKNIS
    const adm = await prisma.admin.findUnique({
      where: { admin_id: cleanNumericId },
    });
    if (!adm) {
      return res.status(404).json({ status: 'error', message: 'Admin tidak ditemukan.' });
    }
    if (adm.status === 'inactive' || adm.status === 'Nonaktif' || adm.deleted_at) {
      return res.status(403).json({
        status: 'error',
        code: 'ACCOUNT_INACTIVE',
        message: 'Akun Admin berstatus Nonaktif.',
      });
    }

    const updateData = {};
    if (typeof name === 'string' && name.trim()) {
      updateData.name = name.trim();
    }
    if (profilePicture !== undefined) {
      if (!profilePicture) {
        updateData.profile_picture = null;
      } else if (profilePicture.startsWith('ENC:v1:') || profilePicture.startsWith('enc:v1:')) {
        updateData.profile_picture = profilePicture;
      } else {
        updateData.profile_picture = encryptImageData(profilePicture);
      }
    }

    const updatedAdm = await prisma.admin.update({
      where: { admin_id: adm.admin_id },
      data: updateData,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Profil Admin berhasil diperbarui.',
      data: {
        fullName: updatedAdm.name,
        profilePicture: updatedAdm.profile_picture,
      },
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal memperbarui profil pengguna di server.');
  }
};
