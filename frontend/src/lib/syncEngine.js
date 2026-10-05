import { db } from "./offlineDb";

let isSyncing = false;
let listenersInitialized = false;

/**
 * Triggers processing of the offline syncQueue sending pending items to POST /api/sync.
 */
export async function processSyncQueue() {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) return;
  if (isSyncing) return;

  try {
    isSyncing = true;

    // Fetch all pending sync operations from IndexedDB
    const pendingItems = await db.syncQueue
      .where("status")
      .equals("pending")
      .toArray();

    if (!pendingItems || pendingItems.length === 0) {
      isSyncing = false;
      return { syncedCount: 0 };
    }

    const payloadOperations = pendingItems.map((item) => ({
      id: item.id,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      payload: item.payload,
      timestamp: item.timestamp,
    }));

    // Send payload to POST /api/sync
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operations: payloadOperations }),
    });

    if (!res.ok) {
      throw new Error(`Sync HTTP error ${res.status}`);
    }

    const data = await res.json();
    const processedIds = Array.isArray(data?.processedIds) ? data.processedIds : [];

    if (processedIds.length > 0) {
      // Mark processed items in IndexedDB as synced and remove them from syncQueue
      for (const queueId of processedIds) {
        const queueItem = pendingItems.find((i) => i.id === queueId);
        if (queueItem) {
          // Update lessonProgress status in local DB to 'synced'
          if (queueItem.entityId) {
            const localProg = await db.lessonProgress.get(queueItem.entityId);
            if (localProg) {
              await db.lessonProgress.update(queueItem.entityId, { syncStatus: "synced" });
            }
          }
          // Remove from syncQueue
          await db.syncQueue.delete(queueId);
        }
      }
    }

    isSyncing = false;
    return { syncedCount: processedIds.length };
  } catch (err) {
    console.warn("Sync Engine process error:", err.message);
    isSyncing = false;
    return { syncedCount: 0, error: err.message };
  }
}

/**
 * Initializes automatic sync triggers for app startup, online events, and visibility changes.
 */
export function initSyncEngine(onSyncComplete) {
  if (typeof window === "undefined") return;

  // Process sync queue on initial startup
  processSyncQueue().then((res) => {
    if (res?.syncedCount > 0 && onSyncComplete) onSyncComplete(res);
  });

  if (listenersInitialized) return;
  listenersInitialized = true;

  // 1. Trigger when browser goes online
  window.addEventListener("online", () => {
    console.log("[Sync Engine] Browser is back online. Processing queue...");
    processSyncQueue().then((res) => {
      if (res?.syncedCount > 0 && onSyncComplete) onSyncComplete(res);
    });
  });

  // 2. Trigger when app returns to foreground (tab visible)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      processSyncQueue().then((res) => {
        if (res?.syncedCount > 0 && onSyncComplete) onSyncComplete(res);
      });
    }
  });
}
