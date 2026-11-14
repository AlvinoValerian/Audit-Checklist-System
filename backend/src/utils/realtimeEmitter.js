const EventEmitter = require('events');

class RealtimeEmitter extends EventEmitter {}
const emitter = new RealtimeEmitter();
emitter.setMaxListeners(100);

// Map of workspaceKey -> Set of Express Response objects
const workspaceClients = new Map();

/**
 * Mendaftarkan koneksi SSE baru dari client browser
 */
function addSSEClient(workspaceId, user, res) {
  const wsKey = String(workspaceId || 'all');
  if (!workspaceClients.has(wsKey)) {
    workspaceClients.set(wsKey, new Set());
  }
  const clientSet = workspaceClients.get(wsKey);
  clientSet.add(res);

  // Set HTTP headers untuk Server-Sent Events (SSE)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Kirim event handshake pembuka
  res.write(
    `event: connected\ndata: ${JSON.stringify({
      status: 'connected',
      workspaceId: wsKey,
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  // Cleanup otomatis saat tab/browser ditutup oleh client
  res.on('close', () => {
    clientSet.delete(res);
    if (clientSet.size === 0) {
      workspaceClients.delete(wsKey);
    }
  });
}

/**
 * Mengirimkan event realtime ke seluruh browser yang terhubung pada workspace tersebut
 */
function emitWorkspaceEvent(workspaceId, eventName, payload = {}) {
  const wsKey = String(workspaceId || 'all');
  const message = `event: ${eventName}\ndata: ${JSON.stringify({
    ...payload,
    workspaceId: wsKey,
    timestamp: new Date().toISOString(),
  })}\n\n`;

  // 1. Kirim ke client yang terdaftar di workspace ini
  const clients = workspaceClients.get(wsKey);
  if (clients && clients.size > 0) {
    for (const client of Array.from(clients)) {
      try {
        client.write(message);
      } catch (err) {
        clients.delete(client);
      }
    }
  }

  // 2. Kirim juga ke client global (Super Admin yang memantau 'all')
  if (wsKey !== 'all') {
    const globalClients = workspaceClients.get('all');
    if (globalClients && globalClients.size > 0) {
      for (const client of Array.from(globalClients)) {
        try {
          client.write(message);
        } catch (err) {
          globalClients.delete(client);
        }
      }
    }
  }

  // Emit event di level Node EventEmitter lokal
  try {
    emitter.emit(eventName, { workspaceId: wsKey, ...payload });
  } catch (err) {
    console.warn('Realtime emitter local error:', err.message);
  }
}

// Heartbeat berkala (setiap 30 detik) agar koneksi SSE tetap aktif dan tidak timeout
const heartbeatTimer = setInterval(() => {
  for (const [wsKey, clientSet] of workspaceClients.entries()) {
    for (const client of Array.from(clientSet)) {
      try {
        client.write(': heartbeat\n\n');
      } catch (err) {
        clientSet.delete(client);
      }
    }
  }
}, 30000);

if (heartbeatTimer.unref) {
  heartbeatTimer.unref();
}

module.exports = {
  addSSEClient,
  emitWorkspaceEvent,
  emitter,
};
