import { NextResponse } from "next/server";
import { supabase, run, nowIso } from "../_utils/supabase";
import { recordQuizCompletionInternal, calculateStreak } from "../_utils/quiz";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const {
      userId,
      quizId,
      score,
      timeSpent,
      subject,
      correctAnswers = null,
      totalQuestions = null,
      answers = null,
    } = await request.json();
    if (!userId || !quizId) {
      return NextResponse.json({ error: "userId and quizId are required" }, { status: 400 });
    }

    const completion = await recordQuizCompletionInternal({
      userId,
      quizId,
      score,
      timeSpent,
      subject,
      correctAnswers,
      totalQuestions,
      answers,
    });
    const newStreak = await calculateStreak(userId);

    const streakDoc = {
      user_id: userId,
      current_streak: newStreak,
      last_completion_date: completion.completed_at.split("T")[0],
      updated_at: nowIso(),
    };
    await run(supabase.from("streaks").upsert(streakDoc));

    return NextResponse.json({
      success: true,
      completionId: completion.id,
      currentStreak: newStreak,
      message: `Quiz completed! Your current streak is ${newStreak} days.`,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
