const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'audit_checklist_system_jwt_secret_key_2024';

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

    // Cek duplikasi email di tabel super_admin dan admin
    const [existingSuperAdmin, existingAdmin] = await Promise.all([
      prisma.super_admin.findUnique({ where: { email: rawEmail } }),
      prisma.admin.findUnique({ where: { email: rawEmail } }),
    ]);

    if (existingSuperAdmin || existingAdmin) {
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

    // 3. Generate token JWT
    const token = jwt.sign(
      {
        id: `sa-${newSuperAdmin.super_admin_id.toString()}`,
        rawId: newSuperAdmin.super_admin_id.toString(),
        email: newSuperAdmin.email,
        role: 'Super Admin',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
    console.error('❌ Error in register controller:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan pada server saat memproses registrasi.',
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/login
 * Login kredensial untuk Super Admin atau Admin workspace
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email dan kata sandi wajib diisi.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Cek di tabel super_admin terlebih dahulu
    const superAdmin = await prisma.super_admin.findUnique({
      where: { email: cleanEmail },
    });

    if (superAdmin) {
      const isMatch = await bcrypt.compare(password, superAdmin.password);
      if (!isMatch) {
        return res.status(401).json({
          status: 'error',
          message: 'Kata sandi salah. Silakan periksa kembali.',
        });
      }

      const token = jwt.sign(
        {
          id: `sa-${superAdmin.super_admin_id.toString()}`,
          rawId: superAdmin.super_admin_id.toString(),
          email: superAdmin.email,
          role: 'Super Admin',
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        status: 'success',
        message: 'Login berhasil sebagai Super Admin.',
        data: formatAuthSuperAdmin(superAdmin, token),
      });
    }

    // 2. Jika bukan super admin, cek di tabel admin
    const admin = await prisma.admin.findUnique({
      where: { email: cleanEmail },
      include: { workspace: true },
    });

    if (admin) {
      if (admin.status === 'inactive') {
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

      const token = jwt.sign(
        {
          id: admin.admin_id.toString(),
          rawId: admin.admin_id.toString(),
          email: admin.email,
          role: 'Admin',
          workspaceId: admin.workspace_id.toString(),
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        status: 'success',
        message: 'Login berhasil sebagai Admin.',
        data: {
          token,
          user: {
            id: admin.admin_id.toString(),
            rawId: admin.admin_id.toString(),
            fullName: admin.name,
            email: admin.email,
            role: 'Admin',
            workspaceId: admin.workspace_id.toString(),
            workspaceName: admin.workspace ? admin.workspace.company_name : 'Workspace',
            status: 'Aktif',
            profilePicture: admin.profile_picture || null,
          },
        },
      });
    }

    return res.status(404).json({
      status: 'error',
      message: 'Email tidak ditemukan. Pastikan email terdaftar atau lakukan pendaftaran terlebih dahulu.',
    });
  } catch (error) {
    console.error('❌ Error in login controller:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan pada server saat memproses login.',
      error: error.message,
    });
  }
};

/**
 * GET /api/auth/me
 * Mendapatkan info user yang sedang login dari Bearer Token
 */
exports.getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Token otentikasi tidak ditemukan.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role === 'Super Admin') {
      const sa = await prisma.super_admin.findUnique({
        where: { super_admin_id: BigInt(decoded.rawId) },
      });
      if (!sa) {
        return res.status(404).json({ status: 'error', message: 'User tidak ditemukan' });
      }
      return res.status(200).json({
        status: 'success',
        data: formatAuthSuperAdmin(sa, token),
      });
    }

    const adm = await prisma.admin.findUnique({
      where: { admin_id: BigInt(decoded.rawId) },
      include: { workspace: true },
    });
    if (!adm) {
      return res.status(404).json({ status: 'error', message: 'User tidak ditemukan' });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        token,
        user: {
          id: adm.admin_id.toString(),
          rawId: adm.admin_id.toString(),
          fullName: adm.name,
          email: adm.email,
          role: 'Admin',
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
      error: error.message,
    });
  }
};

/**
 * PUT /api/auth/profile
 * Memperbarui nama dan/atau foto profil pengguna yang sedang login
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, profilePicture } = req.body;
    const authHeader = req.headers.authorization;
    const superAdminIdHeader = req.headers['x-super-admin-id'];
    const userIdHeader = req.headers['x-user-id'];
    const userEmailHeader = req.headers['x-user-email'];

    let rawId = null;
    let email = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        rawId = decoded.rawId;
        email = decoded.email;
      } catch (err) {
        // Fallback ke headers
      }
    }

    if (!rawId) {
      rawId = superAdminIdHeader || userIdHeader;
    }
    if (!email && userEmailHeader) {
      email = userEmailHeader;
    }

    // 1. Coba cari di super_admin terlebih dahulu
    let sa = null;
    if (rawId && !rawId.startsWith('adm-')) {
      try {
        sa = await prisma.super_admin.findUnique({
          where: { super_admin_id: BigInt(rawId.replace(/^sa-/, '')) },
        });
      } catch (e) {}
    }
    if (!sa && email) {
      sa = await prisma.super_admin.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
    }

    if (sa) {
      const updateData = {};
      if (typeof name === 'string' && name.trim()) {
        updateData.name = name.trim();
      }
      if (profilePicture !== undefined) {
        updateData.profile_picture = profilePicture;
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

    // 2. Jika bukan Super Admin, cari di tabel admin
    let adm = null;
    if (rawId) {
      try {
        adm = await prisma.admin.findUnique({
          where: { admin_id: BigInt(rawId.replace(/^adm-/, '')) },
        });
      } catch (e) {}
    }
    if (!adm && email) {
      adm = await prisma.admin.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
    }

    if (adm) {
      const updateData = {};
      if (typeof name === 'string' && name.trim()) {
        updateData.name = name.trim();
      }
      if (profilePicture !== undefined) {
        updateData.profile_picture = profilePicture;
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
    }

    return res.status(404).json({
      status: 'error',
      message: 'Pengguna tidak ditemukan untuk memperbarui profil.',
    });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memperbarui profil pengguna di server.',
      error: error.message,
    });
  }
};
