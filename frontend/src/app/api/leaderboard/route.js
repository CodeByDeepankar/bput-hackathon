import { NextResponse } from "next/server";
import { supabase, run } from "../_utils/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await run(supabase.from("quiz_responses").select("student_id, score"));

    const stats = new Map();
    for (const row of rows) {
      const stat = stats.get(row.student_id) || {
        studentId: row.student_id,
        totalQuizzes: 0,
        totalScore: 0,
        bestScore: 0,
      };
      stat.totalQuizzes += 1;
      stat.totalScore += row.score;
      stat.bestScore = Math.max(stat.bestScore, row.score);
      stats.set(row.student_id, stat);
    }

    const leaderboard = Array.from(stats.values())
      .map((stat) => ({
        ...stat,
        averageScore: stat.totalQuizzes ? stat.totalScore / stat.totalQuizzes : 0,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 100);

    return NextResponse.json(leaderboard);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
