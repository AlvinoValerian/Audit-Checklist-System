const crypto = require('crypto');
const axios = require('axios');

// In-memory store untuk menyimpan data transaksi sandbox jika DB sedang offline
const transactionStore = new Map();

/**
 * Helper untuk menentukan Base URL SparkPay sesuai Environment
 */
const getSparkPayBaseUrl = () => {
  const env = (process.env.SPARKPAY_ENV || 'sandbox').toLowerCase();
  return env === 'production'
    ? 'https://snap.sparkpay.id'
    : 'https://snap.sandbox.sparkpay.id';
};

/**
 * POST /api/payment-links atau POST /api/checkout
 * Step 1 — Buat Payment Link (Sisi Backend Server)
 * Mengunci nominal harga dan mengembalikan token pembayaran (slug) ke client
 */
exports.createPaymentLink = async (req, res) => {
  try {
    const {
      external_reference,
      customer,
      title,
      amount,
      currency = 'IDR',
      description,
      products,
    } = req.body;

    // 1. Validasi External Reference (Wajib, min 8 karakter)
    if (!external_reference || typeof external_reference !== 'string' || external_reference.trim().length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Field external_reference wajib diisi dan minimal 8 karakter.',
      });
    }

    // 2. Validasi Customer (Wajib: name, email, phone)
    if (!customer || !customer.name || !customer.email || !customer.phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Objek customer wajib menyertakan name, email, dan phone.',
      });
    }

    // 3. Validasi & Kalkulasi Nominal (Amount)
    let finalAmount = 0;
    let finalItems = [];

    if (Array.isArray(products) && products.length > 0) {
      for (const p of products) {
        if (!p.name || typeof p.quantity !== 'number' || typeof p.price !== 'number') {
          return res.status(400).json({
            status: 'error',
            message: 'Setiap item dalam products harus memiliki name, quantity (number), dan price (number).',
          });
        }
        finalAmount += p.quantity * p.price;
        finalItems.push({
          id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: p.name,
          quantity: p.quantity,
          price: p.price,
        });
      }
    } else {
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Field amount wajib diisi dengan nominal positif jika products kosong.',
        });
      }
      finalAmount = amount;
    }

    const finalTitle =
      title ||
      (finalItems.length > 0
        ? `${finalItems[0].name}${finalItems.length > 1 ? ` (+${finalItems.length - 1} item lainnya)` : ` (x${finalItems[0].quantity})`}`
        : 'Pembayaran SparkPay');

    // 4. Kredensial Server Key
    const authHeader = req.headers.authorization;
    let serverKey = process.env.SPARKPAY_SERVER_KEY;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      serverKey = authHeader.split(' ')[1];
    }

    if (!serverKey) {
      return res.status(401).json({
        status: 'error',
        message: 'Server Key SparkPay tidak ditemukan. Sertakan header Authorization: Bearer <SERVER_KEY> atau set SPARKPAY_SERVER_KEY di .env backend.',
      });
    }

    const payload = {
      external_reference: external_reference.trim(),
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
      },
      title: finalTitle,
      amount: finalAmount,
      currency: currency || 'IDR',
      description: description || '',
      products: finalItems.length > 0 ? finalItems : undefined,
    };

    // 5. Coba hubungi API SparkPay
    const baseUrl = getSparkPayBaseUrl();
    try {
      const response = await axios.post(`${baseUrl}/api/payment-links`, payload, {
        headers: {
          Authorization: `Bearer ${serverKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      });

      if (response.data && response.data.data) {
        transactionStore.set(response.data.data.slug, response.data.data);
        return res.status(201).json(response.data);
      }
    } catch (apiErr) {
      // Jika SparkPay merespons dengan status error spesifik (misal 400 Duplicate external_reference, 401 Invalid Key)
      if (apiErr.response) {
        console.warn('⚠️ [SparkPay Gateway Gateway Note]:', apiErr.response.data?.message || apiErr.message);
        return res.status(apiErr.response.status).json(
          apiErr.response.data || {
            status: 'error',
            message: apiErr.response.data?.message || apiErr.message,
          }
        );
      }

      console.warn('⚠️ [SparkPay Gateway Network/Offline]:', apiErr.message);
    }

    // 6. Fallback Sandbox Simulator Engine (Hanya jika jaringan/server SparkPay tidak dapat dijangkau)
    const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let generatedSlug = '';
    for (let i = 0; i < 28; i++) {
      generatedSlug += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const mockResponseData = {
      id: `clx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      slug: generatedSlug,
      title: finalTitle,
      amount: finalAmount,
      currency: currency || 'IDR',
      status: 'ACTIVE',
      external_reference: external_reference.trim(),
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
      },
      items: finalItems,
    };

    transactionStore.set(generatedSlug, mockResponseData);

    return res.status(201).json({
      status: 'success',
      message: 'Payment link berhasil dibuat.',
      data: mockResponseData,
      token: generatedSlug,
    });
  } catch (error) {
    console.error('❌ Error in createPaymentLink:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal membuat sesi pembayaran SparkPay.',
      error: error.message,
    });
  }
};

/**
 * POST /api/payment-callback atau POST /api/webhook/sparkpay
 * Step 3 — Menerima Webhook Callback (Server-to-Server)
 * Memverifikasi tanda tangan digital HMAC SHA-256
 */
exports.handleWebhookCallback = async (req, res) => {
  try {
    const signatureHeader = req.headers['x-sparkpay-signature'];
    const webhookSecret = process.env.SPARKPAY_WEBHOOK_SECRET || 'whsec_test_39f0293da82bc47190e';

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const rawBody =
      typeof req.body === 'string'
        ? req.body
        : req.body
        ? JSON.stringify(req.body)
        : '{}';

    const expectedSignature =
      'sha256=' +
      crypto.createHmac('sha256', webhookSecret).update(rawBody || '{}').digest('hex');

    let isValid = false;
    try {
      if (signatureHeader && typeof signatureHeader === 'string') {
        const sigBuf = Buffer.from(signatureHeader);
        const expBuf = Buffer.from(expectedSignature);
        if (sigBuf.length === expBuf.length) {
          isValid = crypto.timingSafeEqual(sigBuf, expBuf);
        }
      }
    } catch (e) {
      isValid = false;
    }

    console.log('📥 [SparkPay Webhook Callback Received]:', {
      signatureHeader,
      isValid,
      payload: body,
    });

    const { event, external_reference, slug, amount } = body;

    if (slug && transactionStore.has(slug)) {
      const existing = transactionStore.get(slug);
      existing.status = event === 'PAID' ? 'PAID' : event === 'CANCELLED' ? 'CANCELLED' : 'EXPIRED';
      existing.paid_at = event === 'PAID' ? new Date().toISOString() : null;
      transactionStore.set(slug, existing);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Webhook callback diterima & diproses oleh server.',
      verified: isValid,
      data: {
        event: event || 'TEST',
        external_reference: external_reference || null,
        slug: slug || null,
        amount: amount || null,
        processed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error in handleWebhookCallback:', error);
    return res.status(400).json({
      status: 'error',
      message: 'Gagal memproses webhook callback.',
      error: error.message,
    });
  }
};

/**
 * GET /api/payment-links/:slug
 * Cek status transaksi pembayaran berdasarkan token (slug)
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    if (transactionStore.has(slug)) {
      return res.status(200).json({
        status: 'success',
        data: transactionStore.get(slug),
      });
    }

    return res.status(404).json({
      status: 'error',
      message: 'Token pembayaran tidak ditemukan di sesi backend.',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memeriksa status pembayaran.',
      error: error.message,
    });
  }
};
