import Dexie from "dexie";

// Initialize Dexie IndexedDB for offline-first data storage
export const db = new Dexie("GyanaratnaOfflineDB");

db.version(1).stores({
  // Structured lesson progress
  lessonProgress: "&lessonId, studentId, completed, lastPosition, completedAt, updatedAt, syncStatus",

  // Queue for offline sync operations (POST /api/sync)
  syncQueue: "++id, action, entityType, entityId, timestamp, status, retryCount",

  // Local metadata registry for downloaded videos
  downloadsMetadata: "&lessonId, videoUrl, title, moduleTitle, class, schoolId, downloadedAt",

  // Placeholder for future Phase 8 offline quiz attempts
  quizAttempts: "++id, quizId, studentId, score, attemptedAt, syncStatus",
});

/**
 * Saves or updates lesson progress in local IndexedDB.
 */
export async function saveLocalLessonProgress({
  lessonId,
  studentId = "current",
  completed = true,
  lastPosition = 0,
  action = "complete",
}) {
  const now = new Date().toISOString();
  const existing = await db.lessonProgress.get(lessonId);

  const isCompleted = action === "start" ? (existing?.completed ?? false) : completed;

  const record = {
    lessonId,
    studentId: studentId || existing?.studentId || "current",
    completed: isCompleted,
    lastPosition: lastPosition || existing?.lastPosition || 0,
    startedAt: existing?.startedAt || now,
    completedAt: isCompleted ? (existing?.completedAt || now) : null,
    updatedAt: now,
    syncStatus: "pending",
  };

  await db.lessonProgress.put(record);

  // Queue sync operation for syncEngine
  await enqueueSyncOperation({
    action: "UPDATE_LESSON_PROGRESS",
    entityType: "lesson_progress",
    entityId: lessonId,
    payload: {
      lessonId,
      completed: isCompleted,
      lastPosition: record.lastPosition,
      action,
      updatedAt: now,
    },
  });

  return record;
}

/**
 * Adds an operation to the syncQueue.
 */
export async function enqueueSyncOperation({ action, entityType, entityId, payload }) {
  // Check if identical pending sync item already exists in queue to avoid duplicates
  const pendingItems = await db.syncQueue
    .where("entityId")
    .equals(entityId)
    .and((item) => item.status === "pending" && item.action === action)
    .toArray();

  if (pendingItems.length > 0) {
    // Update existing pending queue item payload
    await db.syncQueue.update(pendingItems[0].id, {
      payload,
      timestamp: Date.now(),
    });
    return pendingItems[0].id;
  }

  return await db.syncQueue.add({
    action,
    entityType,
    entityId,
    payload,
    timestamp: Date.now(),
    status: "pending",
    retryCount: 0,
  });
}

/**
 * Retrieves local progress map for lessons.
 */
export async function getLocalProgressMap() {
  try {
    const list = await db.lessonProgress.toArray();
    const map = {};
    list.forEach((item) => {
      map[item.lessonId] = item;
    });
    return map;
  } catch (e) {
    console.warn("Failed to read IndexedDB lessonProgress:", e);
    return {};
  }
}
