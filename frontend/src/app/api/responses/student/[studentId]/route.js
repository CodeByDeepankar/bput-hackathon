import { NextResponse } from "next/server";
import { supabase, run } from "../../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    const { studentId } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    const rows = await run(
      supabase
        .from("quiz_responses")
        .select("id, quiz_id, score, correct_answers, total_questions, time_spent, submitted_at")
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false })
        .limit(limit)
    );

    return NextResponse.json({
      studentId,
      responses: rows.map((row) => ({
        id: row.id,
        quizId: row.quiz_id,
        score: row.score,
        correctAnswers: row.correct_answers,
        totalQuestions: row.total_questions,
        timeSpent: row.time_spent,
        submittedAt: row.submitted_at,
      })),
      total: rows.length,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
