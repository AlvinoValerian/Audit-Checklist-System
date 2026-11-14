const { extractUser } = require('../middlewares/auth.middleware');
const { assertWorkspaceAccess, sendSafeError } = require('../utils/tenantScope');
const { addSSEClient } = require('../utils/realtimeEmitter');

/**
 * GET /api/realtime/events
 * Endpoint Server-Sent Events (SSE) terautentikasi dan multi-tenant
 */
exports.subscribeEvents = async (req, res) => {
  try {
    const user = req.user || (await extractUser(req));
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Autentikasi diperlukan.' });
    }

    const { workspaceId } = req.query;
    let targetWsId = workspaceId || user.workspaceId;

    if (user.role === 'Super Admin' && (!targetWsId || targetWsId === 'all')) {
      targetWsId = 'all';
    } else if (targetWsId && targetWsId !== 'all') {
      const wsAccess = await assertWorkspaceAccess(user, targetWsId);
      if (!wsAccess.ok) {
        return res.status(wsAccess.status).json({ status: 'error', message: wsAccess.message });
      }
    }

    addSSEClient(targetWsId, user, res);
  } catch (err) {
    console.error('❌ [subscribeEvents error]:', err);
    return sendSafeError(res, err, 'Gagal menginisialisasi stream realtime SSE.');
  }
};

/**
 * POST /api/realtime/test-emit
 * Endpoint internal untuk menguji emisi event SSE lintas-proses
 */
exports.testEmit = async (req, res) => {
  try {
    const { workspaceId, event, data } = req.body || {};
    const { emitWorkspaceEvent } = require('../utils/realtimeEmitter');
    emitWorkspaceEvent(workspaceId || '1', event || 'audit:submitted', data || {});
    return res.status(200).json({ status: 'success', message: 'Event emitted successfully' });
  } catch (err) {
    return sendSafeError(res, err, 'Gagal menguji emisi event SSE.');
  }
};
