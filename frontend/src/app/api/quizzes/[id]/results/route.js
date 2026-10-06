import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, run, runSingle } from "../../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const authObj = await auth();
    const userId = authObj?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Sign in required" }, { status: 401 });
    }

    const caller = await runSingle(
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle()
    );

    if (!caller || !["teacher", "admin"].includes(caller.role)) {
      return NextResponse.json(
        { error: "Forbidden: Teacher privileges required to view quiz results" },
        { status: 403 }
      );
    }

    // Fetch submissions for this quiz
    const responses = await run(
      supabase
        .from("quiz_responses")
        .select("id, quiz_id, student_id, score, correct_answers, total_questions, time_spent, submitted_at")
        .eq("quiz_id", id)
        .order("submitted_at", { ascending: false })
    );

    const rows = Array.isArray(responses) ? responses : [];
    const studentIds = Array.from(new Set(rows.map((r) => r.student_id).filter(Boolean)));

    let studentMap = {};
    if (studentIds.length > 0) {
      const studentProfiles = await run(
        supabase
          .from("user_roles")
          .select("user_id, name, class, school_id")
          .in("user_id", studentIds)
      );
      if (Array.isArray(studentProfiles)) {
        studentProfiles.forEach((profile) => {
          studentMap[profile.user_id] = profile;
        });
      }
    }

    const formattedResults = rows.map((r) => {
      const profile = studentMap[r.student_id] || null;
      return {
        id: r.id,
        quizId: r.quiz_id,
        studentId: r.student_id,
        studentName: profile?.name || `Student (${r.student_id.slice(-6)})`,
        studentClass: profile?.class || "Unassigned",
        schoolId: profile?.school_id || null,
        score: typeof r.score === "number" ? Math.round(r.score) : Number(r.score) || 0,
        correctAnswers: r.correct_answers,
        totalQuestions: r.total_questions,
        timeSpent: r.time_spent || 0,
        submittedAt: r.submitted_at,
      };
    });

    return NextResponse.json({
      success: true,
      quizId: id,
      count: formattedResults.length,
      results: formattedResults,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
