import { NextResponse } from "next/server";
import { calculateStreak, fetchQuizCompletions } from "../../_utils/quiz";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request, context) {
  try {
    const { userId } = await context.params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const completions = await fetchQuizCompletions(userId, {
      start: `${date}T00:00:00Z`,
      end: `${date}T23:59:59Z`,
    });

    const totalQuizzes = completions.length;
    const totalTimeSpent = completions.reduce((sum, row) => sum + (row.time_spent || 0), 0);
    const averageScore = totalQuizzes
      ? completions.reduce((sum, row) => sum + (row.score || 0), 0) / totalQuizzes
      : 0;
    const currentStreak = await calculateStreak(userId);

    return NextResponse.json({
      userId,
      date,
      totalQuizzes,
      totalTimeSpent,
      averageScore: Math.round(averageScore * 100) / 100,
      hasCompletedDaily: totalQuizzes > 0,
      currentStreak,
      completions,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
