import { supabase, run, nowIso, normalizeId } from "./supabase";

function requireId(value, label) {
  if (!value) {
    const err = new Error(`${label} is required`);
    err.statusCode = 400;
    throw err;
  }
}

export async function recordQuizCompletionInternal({
  userId,
  quizId,
  score,
  timeSpent,
  subject,
}) {
  requireId(userId, "userId");
  requireId(quizId, "quizId");

  const doc = {
    id: normalizeId("completion", `${userId}:${quizId}`),
    user_id: userId,
    quiz_id: quizId,
    score: score || 0,
    time_spent: timeSpent || 0,
    subject: subject || null,
    completed_at: nowIso(),
  };

  await run(supabase.from("quiz_completions").insert(doc));
  return doc;
}

export async function fetchQuizCompletions(userId, { start, end, limit } = {}) {
  requireId(userId, "userId");

  let query = supabase
    .from("quiz_completions")
    .select("id, user_id, quiz_id, score, time_spent, subject, completed_at")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });

  if (start) query = query.gte("completed_at", start);
  if (end) query = query.lte("completed_at", end);
  if (limit) query = query.limit(limit);

  const rows = await run(query);
  return Array.isArray(rows) ? rows : [];
}

export async function calculateStreak(userId) {
  requireId(userId, "userId");

  const completions = await run(
    supabase
      .from("quiz_completions")
      .select("completed_at")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
  );

  if (!Array.isArray(completions) || completions.length === 0) {
    return 0;
  }

  const today = new Date().toISOString().split("T")[0];
  const completionDates = Array.from(
    new Set(
      completions
        .map((entry) => entry.completed_at)
        .filter(Boolean)
        .map((timestamp) => timestamp.split("T")[0])
    )
  ).sort().reverse();

  let streak = 0;
  let cursor = today;

  for (const date of completionDates) {
    if (date === cursor) {
      streak += 1;
      const previous = new Date(cursor);
      previous.setDate(previous.getDate() - 1);
      cursor = previous.toISOString().split("T")[0];
      continue;
    }

    if (streak === 0 && date < cursor) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      cursor = yesterday.toISOString().split("T")[0];
      if (date === cursor) {
        streak += 1;
        const previous = new Date(cursor);
        previous.setDate(previous.getDate() - 1);
        cursor = previous.toISOString().split("T")[0];
        continue;
      }
    }

    break;
  }

  return streak;
}
