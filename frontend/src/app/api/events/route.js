import { registerSseClient, unregisterSseClient } from "../_utils/events";

export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let controllerRef;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      controller.enqueue(encoder.encode(`event: ping\ndata: {"t":${Date.now()}}\n\n`));
      registerSseClient(controller);
    },
    cancel() {
      if (controllerRef) {
        unregisterSseClient(controllerRef);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
