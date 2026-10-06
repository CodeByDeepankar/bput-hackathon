import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, run, nowIso, runSingle } from "../_utils/supabase";
import { recordQuizCompletionInternal, calculateStreak, canStudentAccessQuiz } from "../_utils/quiz";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const authObj = await auth();
    const authenticatedUserId = authObj?.userId || body.userId;

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Unauthorized: Missing user identity" }, { status: 401 });
    }

    // Lookup student role to verify identity and school/class context
    let roleDoc = null;
    try {
      roleDoc = await runSingle(
        supabase
          .from("user_roles")
          .select("user_id, role, class, school_id")
          .eq("user_id", authenticatedUserId)
          .maybeSingle()
      );
    } catch (e) {
      console.warn("[/api/quiz-completion] user_roles lookup error:", e.message);
    }

    if (roleDoc && !roleDoc.class) {
      try {
        const clerkUser = await currentUser();
        if (clerkUser?.unsafeMetadata?.class) {
          roleDoc.class = clerkUser.unsafeMetadata.class;
        }
      } catch {}
    }

    const {
      quizId,
      score,
      timeSpent,
      subject,
      correctAnswers = null,
      totalQuestions = null,
      answers = null,
    } = body || {};

    if (!quizId) {
      return NextResponse.json({ error: "quizId is required" }, { status: 400 });
    }

    // Verify student quiz access eligibility for real curriculum quizzes
    if (quizId && !quizId.startsWith("practice:") && !quizId.startsWith("generic-math-quiz:")) {
      const access = await canStudentAccessQuiz({
        studentId: authenticatedUserId,
        quizId,
        userRoleDoc: roleDoc,
      });

      if (!access.allowed) {
        return NextResponse.json(
          { error: `Quiz submission rejected: ${access.error}`, reason: access.reason },
          { status: 403 }
        );
      }
    }

    // Always record completion under the authenticated Clerk user ID
    const completion = await recordQuizCompletionInternal({
      userId: authenticatedUserId,
      quizId,
      score,
      timeSpent,
      subject,
      correctAnswers,
      totalQuestions,
      answers,
    });
    const newStreak = await calculateStreak(authenticatedUserId);

    const streakDoc = {
      user_id: authenticatedUserId,
      current_streak: newStreak,
      last_completion_date: completion.completed_at.split("T")[0],
      updated_at: nowIso(),
    };
    await run(supabase.from("streaks").upsert(streakDoc));

    return NextResponse.json({
      success: true,
      completionId: completion.id,
      currentStreak: newStreak,
      userClass: roleDoc?.class || null,
      schoolId: roleDoc?.school_id || null,
      message: `Quiz completed! Your current streak is ${newStreak} days.`,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}

