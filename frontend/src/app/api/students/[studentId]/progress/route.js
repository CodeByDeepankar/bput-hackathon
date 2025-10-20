import { NextResponse } from "next/server";
import { supabase, run } from "../../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    const { studentId } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    const responses = await run(
      supabase
        .from("quiz_responses")
        .select("id, quiz_id, score, correct_answers, total_questions, time_spent, submitted_at")
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false })
        .limit(limit)
    );

    const quizIds = Array.from(new Set(responses.map((r) => r.quiz_id)));
    const quizzes = quizIds.length
      ? await run(
          supabase.from("quizzes").select("id, title, subject_id, difficulty").in("id", quizIds)
        )
      : [];
    const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]));

    const subjectIds = Array.from(new Set(quizzes.map((quiz) => quiz.subject_id)));
    const subjects = subjectIds.length
      ? await run(supabase.from("subjects").select("id, name, class").in("id", subjectIds))
      : [];
    const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));

    const progressData = responses.map((response) => {
      const quiz = quizMap.get(response.quiz_id);
      const subject = quiz ? subjectMap.get(quiz.subject_id) : null;
      return {
        id: response.id,
        quizId: response.quiz_id,
        quizTitle: quiz?.title || "Unknown Quiz",
        subjectName: subject?.name || "Unknown Subject",
        subjectClass: subject?.class || null,
        score: response.score,
        correctAnswers: response.correct_answers,
        totalQuestions: response.total_questions,
        timeSpent: response.time_spent,
        submittedAt: response.submitted_at,
        difficulty: quiz?.difficulty || null,
      };
    });

    const totalQuizzes = progressData.length;
    const averageScore = totalQuizzes
      ? progressData.reduce((sum, item) => sum + item.score, 0) / totalQuizzes
      : 0;
    const bestScore = totalQuizzes ? Math.max(...progressData.map((item) => item.score)) : 0;

    return NextResponse.json({
      studentId,
      summary: {
        totalQuizzes,
        averageScore: Math.round(averageScore * 100) / 100,
        bestScore: Math.round(bestScore * 100) / 100,
      },
      recentActivity: progressData,
      total: totalQuizzes,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
