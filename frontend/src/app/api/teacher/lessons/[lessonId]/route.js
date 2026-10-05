import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  supabase,
  run,
  runSingle,
  nowIso,
  requireUserRole,
  ensureTeacher,
} from "../../../_utils/supabase";

export const runtime = "nodejs";

export async function PUT(request, context) {
  try {
    const authObj = await auth();
    const userId = authObj?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await requireUserRole(userId);
    ensureTeacher(teacher);

    const { lessonId } = await context.params;

    const existing = await runSingle(
      supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle()
    );

    if (!existing) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      description,
      videoPath,
      videoUrl,
      duration,
      orderIndex,
      isRequired,
      published,
    } = body || {};

    const updates = {
      title: title !== undefined ? title.trim() : existing.title,
      description: description !== undefined ? (description ? String(description).trim() : null) : existing.description,
      video_path: videoPath !== undefined ? (videoPath ? String(videoPath).trim() : null) : existing.video_path,
      video_url: videoUrl !== undefined ? (videoUrl ? String(videoUrl).trim() : null) : existing.video_url,
      duration: duration !== undefined ? (Number(duration) || 0) : existing.duration,
      order_index: orderIndex !== undefined ? (Number(orderIndex) || 1) : existing.order_index,
      is_required: isRequired !== undefined ? Boolean(isRequired) : existing.is_required,
      published: published !== undefined ? Boolean(published) : existing.published,
      updated_at: nowIso(),
    };

    const updated = await run(
      supabase.from("lessons").update(updates).eq("id", lessonId).select().maybeSingle()
    );

    return NextResponse.json({
      success: true,
      lesson: updated || { id: lessonId, ...updates },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update lesson" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const authObj = await auth();
    const userId = authObj?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await requireUserRole(userId);
    ensureTeacher(teacher);

    const { lessonId } = await context.params;

    await run(supabase.from("lessons").delete().eq("id", lessonId));

    return NextResponse.json({ success: true, message: "Lesson deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete lesson" },
      { status: error.statusCode || 500 }
    );
  }
}
