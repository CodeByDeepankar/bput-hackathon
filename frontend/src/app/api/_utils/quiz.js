import { supabase, run, runSingle, nowIso, normalizeId } from "./supabase";
import { broadcast } from "./events";

function requireId(value, label) {
  if (!value) {
    const err = new Error(`${label} is required`);
    err.statusCode = 400;
    throw err;
  }
}

export async function recordQuizCompletionInternal(
  {
    userId,
    quizId,
    score,
    timeSpent,
    subject,
    correctAnswers = null,
    totalQuestions = null,
    answers = null,
  },
  { skipResponseInsert = false } = {}
) {
  requireId(userId, "userId");
  requireId(quizId, "quizId");

  const numericScore = typeof score === "number" ? score : Number(score) || 0;
  const numericCorrect =
    typeof correctAnswers === "number"
      ? correctAnswers
      : correctAnswers != null
      ? Number(correctAnswers)
      : null;
  const numericTotal =
    typeof totalQuestions === "number"
      ? totalQuestions
      : totalQuestions != null
      ? Number(totalQuestions)
      : null;

  const doc = {
    id: normalizeId("completion", `${userId}:${quizId}`),
    user_id: userId,
    quiz_id: quizId,
    score: numericScore || 0,
    time_spent: timeSpent || 0,
    subject: subject || null,
    completed_at: nowIso(),
  };

  await run(supabase.from("quiz_completions").insert(doc));

  if (!skipResponseInsert) {
    const responseDoc = {
      id: normalizeId("response", `${userId}:${quizId}`),
      quiz_id: quizId,
      student_id: userId,
      answers: answers || null,
      score: numericScore || 0,
      correct_answers: Number.isFinite(numericCorrect) ? numericCorrect : null,
      total_questions: Number.isFinite(numericTotal) ? numericTotal : null,
      time_spent: timeSpent || 0,
      submitted_at: doc.completed_at,
    };

    try {
      await run(supabase.from("quiz_responses").insert(responseDoc));
    } catch (responseError) {
      console.error("Failed to record quiz response snapshot", responseError);
    }
  }

  let roleDoc = null;
  try {
    roleDoc = await runSingle(
      supabase
        .from("user_roles")
        .select("user_id, name, class, school_id")
        .eq("user_id", userId)
        .maybeSingle()
    );
  } catch (roleError) {
    console.warn("Unable to load user role for quiz completion", roleError);
  }

  try {
    broadcast("quiz.progress", {
      userId,
      quizId,
      score: numericScore || 0,
      correctAnswers: Number.isFinite(numericCorrect) ? numericCorrect : null,
      totalQuestions: Number.isFinite(numericTotal) ? numericTotal : null,
      subject: subject || null,
      completedAt: doc.completed_at,
      schoolId: roleDoc?.school_id ?? null,
      className: roleDoc?.class ?? null,
      studentName: roleDoc?.name ?? null,
      responseInserted: !skipResponseInsert,
    });
  } catch (broadcastError) {
    console.error("quiz.progress broadcast failed", broadcastError);
  }

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
