import { registerWebSocket } from "../_utils/events";

export const runtime = "edge";

export async function GET() {
  const { 0: client, 1: server } = new WebSocketPair();
  server.accept();
  registerWebSocket(server);
  server.send(
    JSON.stringify({
      event: "connected",
      data: { message: "ws connection established" },
      ts: Date.now(),
    })
  );

  server.addEventListener("message", (event) => {
    try {
      const parsed = JSON.parse(event.data);
      if (parsed?.type === "ping") {
        server.send(JSON.stringify({ event: "pong", data: {}, ts: Date.now() }));
      }
    } catch {
      // ignore malformed messages
    }
  });

  return new Response(null, { status: 101, webSocket: client });
}
