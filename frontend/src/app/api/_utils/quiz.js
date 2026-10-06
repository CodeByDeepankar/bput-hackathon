import { supabase, run, runSingle, nowIso, normalizeId } from "./supabase.js";
import { broadcast } from "./events.js";

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

export function normalizeClass(val) {
  if (!val) return "";
  const s = String(val).trim().toLowerCase();
  const match = s.match(/\d+/);
  return match ? match[0] : s;
}

export async function canStudentAccessQuiz({ studentId, quizId, userRoleDoc = null }) {
  requireId(studentId, "studentId");
  requireId(quizId, "quizId");

  // 1. Fetch student role & class
  let studentDoc = userRoleDoc;
  if (!studentDoc) {
    try {
      studentDoc = await runSingle(
        supabase
          .from("user_roles")
          .select("user_id, role, name, class, school_id")
          .eq("user_id", studentId)
          .maybeSingle()
      );
    } catch (e) {
      console.warn("[canStudentAccessQuiz] user_roles fetch error:", e.message);
    }
  }

  // If caller is teacher or admin, full access granted
  if (studentDoc?.role && ["teacher", "admin"].includes(studentDoc.role)) {
    return {
      allowed: true,
      reason: "TEACHER_ACCESS",
      isTeacher: true,
      completedLessons: 0,
      totalLessons: 0,
      progress: 100,
    };
  }

  const studentClass = studentDoc?.class || null;

  // 2. Load quiz with module details
  const quiz = await runSingle(
    supabase
      .from("quizzes")
      .select("id, subject_id, module_id, title, description, difficulty, time_limit, is_published, school_id, learning_modules(id, class, title, published)")
      .eq("id", quizId)
      .maybeSingle()
  );

  if (!quiz) {
    return {
      allowed: false,
      reason: "QUIZ_NOT_FOUND",
      error: "Quiz not found",
    };
  }

  // 3. Quiz must be published for student access
  if (!quiz.is_published) {
    return {
      allowed: false,
      reason: "NOT_PUBLISHED",
      error: "Quiz is locked. Your teacher has not released the quiz yet.",
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
      },
    };
  }

  const moduleDoc = quiz.learning_modules;
  if (!quiz.module_id || !moduleDoc) {
    return {
      allowed: false,
      reason: "NO_MODULE",
      error: "Quiz is locked. This quiz is not linked to an active learning module.",
      quiz: {
        id: quiz.id,
        title: quiz.title,
      },
    };
  }

  // Quiz class is derived from learning_modules.class
  const quizClass = moduleDoc.class || null;

  // 4. Student must have a class set and it must match quiz class
  if (!studentClass) {
    return {
      allowed: false,
      reason: "NO_STUDENT_CLASS",
      error: "Please select your class in your student profile to access quizzes.",
      quiz: {
        id: quiz.id,
        title: quiz.title,
        quizClass,
        moduleTitle: moduleDoc.title,
      },
    };
  }

  if (normalizeClass(studentClass) !== normalizeClass(quizClass)) {
    return {
      allowed: false,
      reason: "CLASS_MISMATCH",
      error: `This quiz is for ${quizClass || "another class"}. You are enrolled in ${studentClass}.`,
      studentClass,
      quizClass,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        quizClass,
        moduleTitle: moduleDoc.title,
      },
    };
  }

  // 5. Fetch all active/published lessons for this module (teacher draft lessons do not block)
  const activeLessons = await run(
    supabase
      .from("lessons")
      .select("id, title")
      .eq("module_id", quiz.module_id)
      .or("published.eq.true,published.is.null")
  );

  const totalLessons = Array.isArray(activeLessons) ? activeLessons.length : 0;

  // Rule 26: If 0 lessons, DO NOT unlock (prevents 0/0 = 100% security hole)
  if (totalLessons === 0) {
    return {
      allowed: false,
      reason: "NO_LESSONS",
      error: "Quiz is locked. No lessons are published for this module yet.",
      completedLessons: 0,
      totalLessons: 0,
      progress: 0,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        quizClass,
        moduleTitle: moduleDoc.title,
      },
    };
  }

  // 6. Check student completion in lesson_progress
  const activeLessonIds = activeLessons.map((l) => l.id);
  const completedProgress = await run(
    supabase
      .from("lesson_progress")
      .select("lesson_id")
      .eq("student_id", studentId)
      .eq("completed", true)
      .in("lesson_id", activeLessonIds)
  );

  const completedLessons = Array.isArray(completedProgress) ? completedProgress.length : 0;
  const progressPercent = Math.round((completedLessons / totalLessons) * 100);

  if (completedLessons < totalLessons) {
    return {
      allowed: false,
      reason: "LESSONS_INCOMPLETE",
      error: `Quiz is locked. Complete all ${totalLessons} lessons in ${moduleDoc.title} to unlock this quiz.`,
      completedLessons,
      totalLessons,
      progress: progressPercent,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        quizClass,
        moduleTitle: moduleDoc.title,
      },
    };
  }

  return {
    allowed: true,
    reason: "MODULE_COMPLETE",
    completedLessons,
    totalLessons,
    progress: 100,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      quizClass,
      moduleTitle: moduleDoc.title,
    },
  };
}
