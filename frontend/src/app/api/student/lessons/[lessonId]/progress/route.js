import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, run, runSingle, nowIso, normalizeId } from "../../../../_utils/supabase";

export const runtime = "nodejs";

export async function POST(request, context) {
  try {
    const authObj = await auth();
    const userId = authObj?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Please sign in" }, { status: 401 });
    }

    const params = await context?.params;
    const lessonId = params?.lessonId;

    if (!lessonId) {
      return NextResponse.json({ error: "lessonId parameter is required" }, { status: 400 });
    }

    // 1. Verify Lesson exists and get module authorization info
    const lesson = await runSingle(
      supabase
        .from("lessons")
        .select("id, module_id, published")
        .eq("id", lessonId)
        .maybeSingle()
    );

    if (!lesson || !lesson.published) {
      return NextResponse.json({ error: "Lesson not found or unavailable" }, { status: 404 });
    }

    // 2. Verify Student's authorized school_id and class
    const roleDoc = await runSingle(
      supabase
        .from("user_roles")
        .select("class, school_id")
        .eq("user_id", userId)
        .maybeSingle()
    );

    const moduleDoc = await runSingle(
      supabase
        .from("learning_modules")
        .select("school_id, class, published")
        .eq("id", lesson.module_id)
        .maybeSingle()
    );

    if (
      !moduleDoc ||
      (moduleDoc.school_id && roleDoc?.school_id && moduleDoc.school_id !== roleDoc?.school_id) ||
      (moduleDoc.class && roleDoc?.class && moduleDoc.class !== roleDoc?.class)
    ) {
      return NextResponse.json(
        { error: "Forbidden: You are not enrolled in the school or class for this module" },
        { status: 403 }
      );
    }

    // 3. Extract request body
    const body = await request.json().catch(() => ({}));
    const { completed, lastPosition, action } = body;

    const isCompleted = typeof completed === "boolean" ? completed : true;
    const position = typeof lastPosition === "number" && lastPosition >= 0 ? Math.floor(lastPosition) : 0;

    // 4. Query existing progress record
    const existing = await runSingle(
      supabase
        .from("lesson_progress")
        .select("*")
        .eq("student_id", userId)
        .eq("lesson_id", lessonId)
        .maybeSingle()
    );

    const now = nowIso();

    // Idempotent upsert payload
    const payload = {
      id: existing?.id || normalizeId("prog", `${userId}-${lessonId}`),
      student_id: userId,
      lesson_id: lessonId,
      last_position: position || existing?.last_position || 0,
      completed: action === "start" ? (existing?.completed ?? false) : isCompleted,
      started_at: existing?.started_at || now,
      completed_at: action === "start"
        ? (existing?.completed_at || null)
        : isCompleted
        ? (existing?.completed_at || now)
        : null,
      updated_at: now,
    };

    const saved = await run(
      supabase
        .from("lesson_progress")
        .upsert(payload)
        .select()
        .maybeSingle()
    );

    return NextResponse.json({
      success: true,
      progress: {
        lessonId,
        completed: payload.completed,
        lastPosition: payload.last_position,
        completedAt: payload.completed_at,
        updatedAt: payload.updated_at,
      },
      data: saved || payload,
    });
  } catch (error) {
    console.error("[/api/student/lessons/[lessonId]/progress] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update lesson progress" },
      { status: error.statusCode || 500 }
    );
  }
}
