import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, run, runSingle, nowIso, normalizeId } from "../_utils/supabase";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const authObj = await auth();
    const userId = authObj?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Please sign in to sync" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const operations = Array.isArray(body?.operations) ? body.operations : [];

    if (operations.length === 0) {
      return NextResponse.json({ success: true, processedIds: [], message: "No operations to sync." });
    }

    // Fetch Student Role Info once
    const roleDoc = await runSingle(
      supabase
        .from("user_roles")
        .select("class, school_id")
        .eq("user_id", userId)
        .maybeSingle()
    );

    const processedIds = [];
    const results = [];

    for (const op of operations) {
      const { id, action, entityId, payload } = op;

      if (action === "UPDATE_LESSON_PROGRESS") {
        const lessonId = entityId || payload?.lessonId;
        const isCompleted = typeof payload?.completed === "boolean" ? payload.completed : true;
        const position = typeof payload?.lastPosition === "number" ? Math.floor(payload.lastPosition) : 0;

        if (!lessonId) continue;

        // Verify lesson exists & authorization
        const lesson = await runSingle(
          supabase.from("lessons").select("id, module_id, published").eq("id", lessonId).maybeSingle()
        );

        if (!lesson || !lesson.published) {
          processedIds.push(id);
          results.push({ id, lessonId, status: "skipped_not_found" });
          continue;
        }

        const existing = await runSingle(
          supabase
            .from("lesson_progress")
            .select("*")
            .eq("student_id", userId)
            .eq("lesson_id", lessonId)
            .maybeSingle()
        );

        const now = nowIso();
        const upsertPayload = {
          id: existing?.id || normalizeId("prog", `${userId}-${lessonId}`),
          student_id: userId,
          lesson_id: lessonId,
          last_position: position || existing?.last_position || 0,
          completed: payload?.action === "start" ? (existing?.completed ?? false) : isCompleted,
          started_at: existing?.started_at || now,
          completed_at: payload?.action === "start"
            ? (existing?.completed_at || null)
            : isCompleted
            ? (existing?.completed_at || now)
            : null,
          updated_at: now,
        };

        await run(supabase.from("lesson_progress").upsert(upsertPayload));
        processedIds.push(id);
        results.push({ id, lessonId, status: "synced" });
      }
    }

    return NextResponse.json({
      success: true,
      processedIds,
      results,
    });
  } catch (error) {
    console.error("[/api/sync] Sync engine error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process offline sync" },
      { status: error.statusCode || 500 }
    );
  }
}
