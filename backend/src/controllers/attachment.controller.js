const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');
const { toBigIntSafe } = require('../utils/teknisScope');
const { assertWorkspaceAccess, sendSafeError } = require('../utils/tenantScope');
const { getAttachmentBinary } = require('../utils/attachmentCache');

/**
 * GET /api/attachments/:id/image atau GET /api/attachments/:id
 * Menyajikan file gambar lampiran secara langsung sebagai stream biner terdekripsi
 * dengan browser caching (Cache-Control: private, max-age=86400).
 */
exports.getAttachmentImage = async (req, res) => {
  try {
    const user = req.user || (await extractUser(req));
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Sesi tidak valid atau telah berakhir.' });
    }

    const cleanId = toBigIntSafe(req.params.id, ['att-', 'photo-']);
    if (!cleanId) {
      return res.status(400).json({ status: 'error', message: 'ID lampiran tidak valid.' });
    }

    // 1. Ambil relasi workspace untuk validasi otorisasi multi-tenant yang ketat
    const attMeta = await prisma.attachment.findUnique({
      where: { attachment_id: cleanId },
      select: {
        attachment_id: true,
        checklist_report: {
          select: {
            schedule: {
              select: {
                store: {
                  select: { workspace_id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!attMeta) {
      return res.status(404).json({ status: 'error', message: 'Lampiran tidak ditemukan.' });
    }

    const wsId = attMeta.checklist_report?.schedule?.store?.workspace_id;
    if (wsId) {
      const wsAccess = await assertWorkspaceAccess(user, wsId);
      if (!wsAccess.ok) {
        return res.status(wsAccess.status).json({ status: 'error', message: wsAccess.message });
      }
    }

    // 2. Ambil payload gambar (Buffer biner atau external URL) melalui cache in-memory
    const payload = await getAttachmentBinary(cleanId);
    if (!payload) {
      return res.status(404).json({ status: 'error', message: 'Konten gambar tidak ditemukan.' });
    }

    if (payload.type === 'redirect' && payload.url) {
      return res.redirect(302, payload.url);
    }

    if (payload.type === 'binary' && payload.buffer) {
      res.setHeader('Content-Type', payload.mimeType || 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=86400, stale-while-revalidate=604800');
      res.setHeader('Content-Length', payload.buffer.length);
      return res.end(payload.buffer);
    }

    return res.status(404).json({ status: 'error', message: 'Format gambar tidak didukung.' });
  } catch (err) {
    console.error('❌ [getAttachmentImage error]:', err);
    return sendSafeError(res, err, 'Gagal memuat gambar lampiran.');
  }
};
