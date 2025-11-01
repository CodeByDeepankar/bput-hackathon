import { NextResponse } from "next/server";
import {
  supabase,
  run,
  runSingle,
  nowIso,
  requireUserRole,
  ensureTeacher,
} from "../_utils/supabase";

export const runtime = "nodejs";

function normalizeDifficulty(value) {
  const normalized = String(value || "medium").toLowerCase();
  return ["easy", "medium", "hard"].includes(normalized) ? normalized : "medium";
}

function sanitizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => (typeof option === "string" ? option.trim() : String(option || "")))
    .filter((option) => option.length > 0);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("quizId");
    const schoolId = searchParams.get("schoolId");
    const includeAnswers = String(searchParams.get("includeAnswers") || "true").toLowerCase() === "true";
    const limitParam = searchParams.get("limit");

    if (!quizId && !schoolId) {
      return NextResponse.json({ error: "quizId or schoolId is required" }, { status: 400 });
    }

    let query = supabase
      .from("questions")
      .select("id, quiz_id, text, options, correct_answer, explanation, difficulty, topic, sub_topic, school_id, order, created_at")
      .order("order");

    if (quizId) {
      query = query.eq("quiz_id", quizId);
    }

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    if (limitParam) {
      const parsedLimit = Number.parseInt(limitParam, 10);
      if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
        query = query.limit(Math.min(parsedLimit, 500));
      }
    }

    const rows = await run(query);

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        quizId: row.quiz_id,
        text: row.text,
        options: row.options || [],
        explanation: row.explanation,
        difficulty: row.difficulty,
        topic: row.topic,
        subTopic: row.sub_topic,
        schoolId: row.school_id,
        order: row.order,
        createdAt: row.created_at,
        ...(includeAnswers ? { correctAnswer: row.correct_answer } : {}),
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const {
      createdBy,
      quizId,
      text,
      options,
      correctAnswer,
      explanation,
      difficulty,
      topic,
      subTopic,
      order,
    } = payload || {};

    if (!createdBy || !quizId || !text || !Array.isArray(options) || !correctAnswer) {
      return NextResponse.json(
        { error: "createdBy, quizId, text, options, and correctAnswer are required" },
        { status: 400 }
      );
    }

    const creator = await requireUserRole(createdBy);
    ensureTeacher(creator);

    const quiz = await runSingle(
      supabase
        .from("quizzes")
        .select("id, school_id")
        .eq("id", quizId)
        .maybeSingle()
    );

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (quiz.school_id && creator.school_id && quiz.school_id !== creator.school_id) {
      return NextResponse.json({ error: "Cannot add questions to a different school" }, { status: 403 });
    }

    const normalizedOptions = sanitizeOptions(options);
    if (normalizedOptions.length < 2) {
      return NextResponse.json({ error: "Provide at least two options" }, { status: 400 });
    }

    if (!normalizedOptions.includes(correctAnswer)) {
      return NextResponse.json({ error: "correctAnswer must be one of the options" }, { status: 400 });
    }

    const now = nowIso();

    const prevQuestion = await runSingle(
      supabase
        .from("questions")
        .select("order")
        .eq("quiz_id", quizId)
        .order("order", { ascending: false })
        .limit(1)
        .maybeSingle()
    );

    const nextOrder = typeof order === "number" ? order : (prevQuestion?.order ?? 0) + 1;
    const questionId = `${quizId}:question:${Date.now()}`;

    const doc = {
      id: questionId,
      quiz_id: quizId,
      text: text.trim(),
      options: normalizedOptions,
      correct_answer: correctAnswer,
      explanation: explanation ? String(explanation).trim() : null,
      difficulty: normalizeDifficulty(difficulty),
      topic: topic ? String(topic).trim() : null,
      sub_topic: subTopic ? String(subTopic).trim() : null,
      school_id: creator.school_id || quiz.school_id || null,
      order: nextOrder,
      created_at: now,
    };

    const inserted = await run(
      supabase
        .from("questions")
        .insert(doc)
        .select()
        .maybeSingle()
    );

    return NextResponse.json({
      success: true,
      question: {
        id: inserted?.id ?? questionId,
        quizId,
        text: doc.text,
        options: doc.options,
        correctAnswer: doc.correct_answer,
        explanation: doc.explanation,
        difficulty: doc.difficulty,
        topic: doc.topic,
        subTopic: doc.sub_topic,
        schoolId: doc.school_id,
        order: doc.order,
        createdAt: doc.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
