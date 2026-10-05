const sseClients = new Set();
const wsClients = new Set();
const encoder = new TextEncoder();

export function registerSseClient(controller) {
  sseClients.add(controller);
}

export function unregisterSseClient(controller) {
  sseClients.delete(controller);
}

export function registerWebSocket(socket) {
  wsClients.add(socket);
  const cleanup = () => wsClients.delete(socket);
  socket.addEventListener("close", cleanup, { once: true });
  socket.addEventListener("error", cleanup, { once: true });
}

export function broadcast(event, data) {
  if (!sseClients.size && !wsClients.size) {
    return;
  }
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const chunk = encoder.encode(payload);
  for (const controller of sseClients) {
    try {
      controller.enqueue(chunk);
    } catch {
      sseClients.delete(controller);
    }
  }
  if (wsClients.size) {
    const socketPayload = JSON.stringify({ event, data, ts: Date.now() });
    for (const socket of wsClients) {
      try {
        socket.send(socketPayload);
      } catch {
        wsClients.delete(socket);
      }
    }
  }
}
