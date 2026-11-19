const crypto = require('crypto');
const https = require('https');
const prisma = require('../config/prisma');

// In-memory store untuk mencatat event webhook terbaru (maksimal 50 event)
const recentWebhookEvents = [];

/**
 * Helper verifikasi signature HMAC SHA-256 sesuai Step 3 pada .md
 */
function verifyWebhookSignature(rawBody, signatureHeader, webhookSecret) {
  if (!signatureHeader || !webhookSecret) return false;
  
  const expectedSignature =
    'sha256=' +
    crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader || ''),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Step 1 — POST /api/payment-links (Buat Payment Link ke SparkPay Sandbox)
 */
exports.createPaymentLink = async (req, res) => {
  try {
    const serverKey = process.env.SPARKPAY_SERVER_KEY || 'sk_test_51687cb2e81ee70b1c634b90e79e4917057cf212505bad90';
    const env = process.env.SPARKPAY_ENV || 'sandbox';
    const baseUrl = env === 'production' 
      ? 'https://snap.sparkpay.id' 
      : 'https://snap.sandbox.sparkpay.id';

    const {
      external_reference,
      customer,
      title,
      amount,
      currency,
      description,
      products
    } = req.body;

    if (!external_reference || !customer?.name || !customer?.email || !customer?.phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Field external_reference dan customer (name, email, phone) wajib diisi sesuai dokumentasi SparkPay.'
      });
    }

    const payload = JSON.stringify({
      external_reference,
      customer,
      title: title || 'Testing Audit Pro Sandbox',
      amount: amount || 25000,
      currency: currency || 'IDR',
      description: description || 'Pembayaran Sandbox via Snap.js',
      ...(products && Array.isArray(products) && products.length > 0 ? { products } : {})
    });

    const parsedUrl = new URL(`${baseUrl}/api/payment-links`);

    const sparkpayReq = https.request({
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serverKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (sparkpayRes) => {
      let body = '';
      sparkpayRes.on('data', chunk => body += chunk);
      sparkpayRes.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          return res.status(sparkpayRes.statusCode).json(parsed);
        } catch (e) {
          return res.status(sparkpayRes.statusCode).send(body);
        }
      });
    });

    sparkpayReq.on('error', (err) => {
      console.error('[SparkPay API Error]:', err);
      return res.status(502).json({
        status: 'error',
        message: 'Gagal terhubung ke SparkPay Server: ' + err.message
      });
    });

    sparkpayReq.write(payload);
    sparkpayReq.end();
  } catch (err) {
    console.error('[createPaymentLink Error]:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error: ' + err.message
    });
  }
};

/**
 * Helper untuk menandai Super Admin sebagai Lunas di database PostgreSQL
 */
async function markSuperAdminAsPaid({ superAdminId, email, invoiceNumber, packageName, paymentMethod, billingCycle, nominal }) {
  let target = null;
  if (superAdminId) {
    const cleanId = String(superAdminId).replace(/^sa-/, '').trim();
    if (/^\d+$/.test(cleanId)) {
      target = await prisma.super_admin.findUnique({
        where: { super_admin_id: BigInt(cleanId) }
      });
    }
  }
  if (!target && email) {
    target = await prisma.super_admin.findUnique({
      where: { email: email.trim().toLowerCase() }
    });
  }
  if (!target && invoiceNumber) {
    const match = invoiceNumber.match(/INV-\d+-\d+-(\d{2})(\d{2})/) || invoiceNumber.match(/INV-\d+-\d+-0*(\d+)/);
    if (match && match[1]) {
      const saIdNum = parseInt(match[1], 10);
      if (!isNaN(saIdNum)) {
        target = await prisma.super_admin.findUnique({
          where: { super_admin_id: BigInt(saIdNum) }
        });
      }
    }
  }

  const cycleStr = String(billingCycle || '').toLowerCase();
  const isYearly =
    cycleStr.includes('tahun') ||
    cycleStr.includes('year') ||
    cycleStr.includes('12') ||
    (nominal && Number(nominal) >= 400000);
  const durationDays = isYearly ? 365 : 30;
  const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  if (target) {
    const updated = await prisma.super_admin.update({
      where: { super_admin_id: target.super_admin_id },
      data: {
        payment_status: 'Lunas',
        payment_package: packageName || target.payment_package || 'Standard Plan',
        payment_method: paymentMethod || 'QRIS SparkPay',
        paid_at: new Date(),
        expiry_date: expiryDate,
        updated_at: new Date()
      }
    });
    console.log(`[SparkPay] Berhasil mengupdate status pembayaran Super Admin ${updated.name} (ID: ${updated.super_admin_id}) menjadi LUNAS (${isYearly ? 'Tahunan - 365 hari' : 'Bulanan - 30 hari'}) di database.`);
    return updated;
  }
  return null;
}

/**
 * Step 3 — POST /api/payment-callback (Menerima Webhook Callback Server-to-Server)
 */
exports.handleWebhookCallback = async (req, res) => {
  try {
    const webhookSecret = process.env.SPARKPAY_WEBHOOK_SECRET || 'f38db35a6479f8cb5cb5ba902a979c99cc957fde523386b10c1da093476a3e38';
    const signatureHeader = req.headers['x-sparkpay-signature'];
    
    // Ambil raw body jika ada buffer atau fallback ke JSON stringify
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const isVerified = verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);

    const eventRecord = {
      id: 'WH-' + Date.now(),
      timestamp: new Date().toISOString(),
      event: req.body.event || 'UNKNOWN',
      external_reference: req.body.external_reference || null,
      slug: req.body.slug || null,
      amount: req.body.amount || null,
      currency: req.body.currency || 'IDR',
      signature_valid: isVerified,
      signature_header: signatureHeader || null,
      payload: req.body
    };

    recentWebhookEvents.unshift(eventRecord);
    if (recentWebhookEvents.length > 50) recentWebhookEvents.pop();

    console.log(`[SparkPay Webhook] Event: ${eventRecord.event} | Ref: ${eventRecord.external_reference} | Verified: ${isVerified}`);

    // Jika event PAID, simpan otomatis status Lunas ke database super_admin
    if (req.body.event === 'PAID') {
      try {
        await markSuperAdminAsPaid({
          email: req.body.customer?.email,
          invoiceNumber: req.body.external_reference,
          paymentMethod: req.body.payment_method || 'QRIS SparkPay'
        });
      } catch (e) {
        console.error('[Webhook DB Update Error]:', e);
      }
    }

    // Sesuai dokumentasi SparkPay, wajib balas HTTP 200 OK
    return res.status(200).json({
      status: 'success',
      message: 'Webhook received',
      verified: isVerified
    });
  } catch (err) {
    console.error('[handleWebhookCallback Error]:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /api/payment-callback/events - Ambil riwayat event webhook untuk live console di frontend
 */
exports.getWebhookEvents = (req, res) => {
  return res.status(200).json({
    status: 'success',
    total: recentWebhookEvents.length,
    events: recentWebhookEvents
  });
};

/**
 * POST /api/payment-callback/simulate - Simulasi kirim webhook (untuk testing lokal)
 */
exports.simulateWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.SPARKPAY_WEBHOOK_SECRET || 'f38db35a6479f8cb5cb5ba902a979c99cc957fde523386b10c1da093476a3e38';
    const { event, external_reference, slug, amount } = req.body;

    const payloadObj = {
      event: event || 'PAID',
      external_reference: external_reference || 'INV-2026-07-001',
      slug: slug || 'P30Ilifo_KWE1qTPuZz9MO5SG2zkt9_s',
      amount: String(amount || 25000),
      currency: 'IDR',
      paid_at: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };

    const rawBody = JSON.stringify(payloadObj);
    const signature = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    const eventRecord = {
      id: 'SIM-' + Date.now(),
      timestamp: new Date().toISOString(),
      event: payloadObj.event,
      external_reference: payloadObj.external_reference,
      slug: payloadObj.slug,
      amount: payloadObj.amount,
      currency: payloadObj.currency,
      signature_valid: true,
      signature_header: signature,
      payload: payloadObj,
      simulated: true
    };

    recentWebhookEvents.unshift(eventRecord);
    if (recentWebhookEvents.length > 50) recentWebhookEvents.pop();

    if (payloadObj.event === 'PAID') {
      try {
        await markSuperAdminAsPaid({
          invoiceNumber: payloadObj.external_reference,
          paymentMethod: 'QRIS SparkPay'
        });
      } catch (e) {
        console.error('[Simulate DB Update Error]:', e);
      }
    }

    return res.status(200).json({
      status: 'success',
      message: `Simulasi webhook ${payloadObj.event} berhasil ditambahkan!`,
      signature,
      event: eventRecord
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * POST /api/sparkpay/confirm-payment - Konfirmasi pembayaran & simpan status Lunas ke database super_admin
 */
exports.confirmPayment = async (req, res) => {
  try {
    const { superAdminId, email, invoiceNumber, packageName, nominal, paymentMethod, billingCycle } = req.body;
    const updated = await markSuperAdminAsPaid({
      superAdminId,
      email,
      invoiceNumber,
      packageName,
      paymentMethod,
      billingCycle,
      nominal
    });

    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: 'Super Admin tidak ditemukan untuk konfirmasi pembayaran.'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: `Status pembayaran untuk Super Admin ${updated.name} berhasil disimpan ke database sebagai LUNAS!`,
      data: {
        superAdminId: updated.super_admin_id.toString(),
        name: updated.name,
        email: updated.email,
        payment_status: updated.payment_status,
        payment_package: updated.payment_package,
        payment_method: updated.payment_method,
        paid_at: updated.paid_at,
        expiry_date: updated.expiry_date
      }
    });
  } catch (err) {
    console.error('[confirmPayment Error]:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menyimpan status pembayaran ke database: ' + err.message
    });
  }
};

/**
 * GET /api/sparkpay/config - Status konfigurasi kredensial (tanpa mengekspos full key)
 */
exports.getConfig = (req, res) => {
  const serverKey = process.env.SPARKPAY_SERVER_KEY || 'sk_test_51687cb2e81ee70b1c634b90e79e4917057cf212505bad90';
  const webhookSecret = process.env.SPARKPAY_WEBHOOK_SECRET || 'f38db35a6479f8cb5cb5ba902a979c99cc957fde523386b10c1da093476a3e38';
  const env = process.env.SPARKPAY_ENV || 'sandbox';

  const maskedKey = serverKey ? `${serverKey.substring(0, 12)}...${serverKey.substring(serverKey.length - 8)}` : 'Belum diatur';

  return res.status(200).json({
    status: 'success',
    data: {
      environment: env,
      baseUrl: env === 'production' ? 'https://snap.sparkpay.id' : 'https://snap.sandbox.sparkpay.id',
      scriptUrl: env === 'production' ? 'https://snap.sparkpay.id/snap/snap.js' : 'https://snap.sandbox.sparkpay.id/snap/snap.js',
      maskedServerKey: maskedKey,
      hasWebhookSecret: Boolean(webhookSecret),
      webhookEndpoint: 'http://localhost:5000/api/payment-callback'
    }
  });
};

/**
 * GET /api/sparkpay/user-subscriptions - Mengambil data seluruh Super Admin (yang membayar) & paket langganan dari PostgreSQL
 */
exports.getUserSubscriptions = async (req, res) => {
  try {
    // Ambil SEMUA Super Admin dari database beserta workspace & toko di bawah naungannya
    const superAdmins = await prisma.super_admin.findMany({
      include: {
        workspace: {
          include: {
            store: true,
            admin: true
          },
          orderBy: { workspace_id: 'asc' }
        }
      },
      orderBy: { super_admin_id: 'asc' }
    });

    if (!superAdmins || superAdmins.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          users: [],
          totalNominal: 0,
          totalSuperAdmins: 0
        }
      });
    }

    const subscriptions = [];

    // Loop setiap Super Admin yang terdaftar di database
    superAdmins.forEach((sa) => {
      const isPaid = sa.payment_status === 'Lunas';
      const status = isPaid ? 'Lunas' : (sa.payment_status || 'Menunggu Bayar');

      let expiryDateStr = '20 Nov 2026';
      if (sa.expiry_date) {
        expiryDateStr = new Date(sa.expiry_date).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      } else if (isPaid) {
        expiryDateStr = '15 Jan 2027';
      }

      let lastPaymentDateStr = undefined;
      if (sa.paid_at) {
        lastPaymentDateStr = new Date(sa.paid_at).toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) + ' WIB';
      } else if (isPaid) {
        lastPaymentDateStr = '15 Nov 2026, 09:30 WIB';
      }

      const paymentMethod = isPaid ? (sa.payment_method || 'QRIS SparkPay') : undefined;

      if (sa.workspace && sa.workspace.length > 0) {
        sa.workspace.forEach((w, idx) => {
          const storeCount = w.store?.length || 0;
          const adminCount = w.admin?.length || 0;

          let packageName = sa.payment_package || 'Starter';
          let nominal = 99000;
          if (packageName === 'Enterprise' || storeCount >= 3) {
            packageName = 'Enterprise';
            nominal = 799000;
          } else if (packageName === 'Pro' || storeCount >= 1 || adminCount >= 1) {
            packageName = 'Pro';
            nominal = 299000;
          }

          subscriptions.push({
            id: `SUB-${sa.super_admin_id}-${w.workspace_id}`,
            superAdminId: sa.super_admin_id.toString(),
            name: sa.name,
            email: sa.email,
            role: 'Super Admin',
            company: sa.company_name || w.company_name || 'Perusahaan Retail',
            phone: sa.phone_number || '081234567890',
            workspaceName: w.company_name,
            packageName: packageName,
            nominal: nominal,
            billingCycle: 'Bulanan',
            status: status,
            paymentMethod: paymentMethod,
            expiryDate: expiryDateStr,
            invoiceNumber: `INV-2026-11-${sa.super_admin_id.toString().padStart(2, '0')}${w.workspace_id.toString().padStart(2, '0')}`,
            lastPaymentDate: lastPaymentDateStr,
            proportion: 20.0
          });
        });
      } else {
        // Super Admin baru yang belum memiliki workspace tambahan
        const nominal = sa.payment_package === 'Enterprise' ? 799000 : sa.payment_package === 'Pro' ? 299000 : 99000;
        subscriptions.push({
          id: `SUB-${sa.super_admin_id}-default`,
          superAdminId: sa.super_admin_id.toString(),
          name: sa.name,
          email: sa.email,
          role: 'Super Admin',
          company: sa.company_name || 'Perusahaan Retail',
          phone: sa.phone_number || '081234567890',
          workspaceName: sa.company_name || `${sa.name}'s Workspace`,
          packageName: sa.payment_package || 'Starter',
          nominal: nominal,
          billingCycle: 'Bulanan',
          status: status,
          paymentMethod: paymentMethod,
          expiryDate: expiryDateStr,
          invoiceNumber: `INV-2026-11-${sa.super_admin_id.toString().padStart(4, '0')}`,
          lastPaymentDate: lastPaymentDateStr,
          proportion: 10.0
        });
      }
    });

    // Hitung proporsi dinamis
    const totalNominal = subscriptions.reduce((sum, s) => sum + s.nominal, 0);
    subscriptions.forEach((s) => {
      s.proportion = totalNominal > 0 ? Number(((s.nominal / totalNominal) * 100).toFixed(1)) : 0;
    });

    const primaryPayer = superAdmins[0];

    return res.status(200).json({
      status: 'success',
      data: {
        payer: {
          id: primaryPayer.super_admin_id.toString(),
          name: primaryPayer.name,
          email: primaryPayer.email,
          role: 'Super Admin',
          company: primaryPayer.company_name || 'PT Pesta Pora Abadi',
          phone: primaryPayer.phone_number || '081234567890'
        },
        users: subscriptions,
        totalNominal: totalNominal,
        totalSuperAdmins: superAdmins.length,
        totalSubscriptions: subscriptions.length
      }
    });
  } catch (err) {
    console.error('[getUserSubscriptions Error]:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data user subscriptions: ' + err.message
    });
  }
};

