import { NextResponse } from "next/server";
import { supabase, run, runSingle } from "../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const includeAnswers = String(new URL(request.url).searchParams.get("includeAnswers") || "false").toLowerCase() === "true";

    const quiz = await runSingle(
      supabase
        .from("quizzes")
  .select("id, subject_id, title, description, difficulty, time_limit, created_by, school_id, is_bank, created_at, updated_at")
        .eq("id", id)
        .maybeSingle()
    );

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const questions = await run(
      supabase
        .from("questions")
  .select("id, text, options, correct_answer, explanation, difficulty, topic, sub_topic, school_id, order, created_at")
        .eq("quiz_id", id)
        .order("order")
    );

    return NextResponse.json({
      id: quiz.id,
      subjectId: quiz.subject_id,
      title: quiz.title,
      description: quiz.description,
      difficulty: quiz.difficulty,
      timeLimit: quiz.time_limit,
      createdBy: quiz.created_by,
      schoolId: quiz.school_id,
      isBank: quiz.is_bank,
      createdAt: quiz.created_at,
      updatedAt: quiz.updated_at,
      questions: questions.map((question) => ({
        id: question.id,
        text: question.text,
        options: question.options,
        order: question.order,
        explanation: question.explanation,
        difficulty: question.difficulty,
        topic: question.topic,
        subTopic: question.sub_topic,
        schoolId: question.school_id,
        createdAt: question.created_at,
        ...(includeAnswers ? { correctAnswer: question.correct_answer } : {}),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
