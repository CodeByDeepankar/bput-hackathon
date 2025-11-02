let eventSource = null;
let subscriberCount = 0;
const registry = new Map(); // eventName -> Set(handler)

function attachRegisteredHandlers(source) {
  for (const [eventName, handlers] of registry.entries()) {
    for (const handler of handlers) {
      source.addEventListener(eventName, handler);
    }
  }
}

function scheduleReconnect() {
  if (typeof window === "undefined") return;
  if (subscriberCount === 0) return;
  if (eventSource) return;
  setTimeout(() => {
    if (subscriberCount > 0 && !eventSource) {
      const source = ensureEventSource();
      if (source) {
        attachRegisteredHandlers(source);
      }
    }
  }, 1000);
}

function ensureEventSource() {
  if (typeof window === "undefined") {
    return null;
  }
  if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
    return eventSource;
  }

  eventSource = new EventSource("/api/events");
  attachRegisteredHandlers(eventSource);

  eventSource.addEventListener("error", (error) => {
    console.warn("EventSource error", error);
    if (eventSource?.readyState === EventSource.CLOSED) {
      eventSource.close();
      eventSource = null;
      scheduleReconnect();
    }
  });

  return eventSource;
}

export function subscribeToEvent(eventName, callback) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const source = ensureEventSource();
  if (!source) {
    return () => {};
  }

  const handler = (event) => {
    let payload = event.data;
    try {
      payload = payload ? JSON.parse(payload) : null;
    } catch (parseError) {
      // Leave payload as string if JSON parsing fails
    }
    callback(payload, event);
  };

  source.addEventListener(eventName, handler);
  if (!registry.has(eventName)) {
    registry.set(eventName, new Set());
  }
  registry.get(eventName).add(handler);
  subscriberCount += 1;

  return () => {
    if (!eventSource) {
      return;
    }
    eventSource.removeEventListener(eventName, handler);
    const eventHandlers = registry.get(eventName);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      if (!eventHandlers.size) {
        registry.delete(eventName);
      }
    }
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) {
      eventSource.close();
      eventSource = null;
    }
  };
}
