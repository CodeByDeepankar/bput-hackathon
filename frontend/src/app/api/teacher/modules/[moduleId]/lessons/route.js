import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  supabase,
  run,
  runSingle,
  normalizeId,
  nowIso,
  requireUserRole,
  ensureTeacher,
} from "../../../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    const authObj = await auth();
    const userId = authObj?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await requireUserRole(userId);
    ensureTeacher(teacher);

    const { moduleId } = await context.params;

    let lessons = [];
    try {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, module_id, title, description, video_path, video_url, video_type, duration, order_index, is_required, published, created_at, updated_at")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true });

      if (error && (error.code === "42703" || error.message?.includes("video_type"))) {
        const { data: fallbackData } = await supabase
          .from("lessons")
          .select("id, module_id, title, description, video_path, video_url, duration, order_index, is_required, published, created_at, updated_at")
          .eq("module_id", moduleId)
          .order("order_index", { ascending: true });

        lessons = (fallbackData || []).map((l) => ({
          ...l,
          video_type: l.video_url?.includes("youtube") || l.video_url?.includes("youtu.be") ? "youtube" : "uploaded",
        }));
      } else {
        lessons = data || [];
      }
    } catch (e) {
      lessons = [];
    }

    return NextResponse.json(lessons || [], {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch lessons" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request, context) {
  try {
    const authObj = await auth();
    const userId = authObj?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await requireUserRole(userId);
    ensureTeacher(teacher);

    const { moduleId } = await context.params;

    const moduleDoc = await runSingle(
      supabase.from("learning_modules").select("id, school_id").eq("id", moduleId).maybeSingle()
    );

    if (!moduleDoc) {
      return NextResponse.json({ error: "Learning module not found" }, { status: 404 });
    }

    if (moduleDoc.school_id && teacher.school_id && moduleDoc.school_id !== teacher.school_id) {
      return NextResponse.json({ error: "Cannot add lessons to another school's module" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      videoPath,
      videoUrl,
      videoType,
      duration = 0,
      orderIndex,
      isRequired = true,
      published = true,
    } = body || {};

    if (!title) {
      return NextResponse.json({ error: "Lesson title is required" }, { status: 400 });
    }

    // Determine default order index if not provided
    let finalOrderIndex = typeof orderIndex === "number" ? orderIndex : 1;
    if (typeof orderIndex !== "number") {
      const maxOrderRow = await runSingle(
        supabase
          .from("lessons")
          .select("order_index")
          .eq("module_id", moduleId)
          .order("order_index", { ascending: false })
          .limit(1)
          .maybeSingle()
      );
      finalOrderIndex = (maxOrderRow?.order_index ?? 0) + 1;
    }

    const lessonId = normalizeId("lesson", title);
    const now = nowIso();

    const resolvedVideoType = videoType || (videoUrl?.includes("youtube") || videoUrl?.includes("youtu.be") ? "youtube" : "uploaded");

    const lessonDoc = {
      id: lessonId,
      module_id: moduleId,
      title: title.trim(),
      description: description ? String(description).trim() : null,
      video_path: videoPath ? String(videoPath).trim() : null,
      video_url: videoUrl ? String(videoUrl).trim() : null,
      video_type: resolvedVideoType,
      duration: Number(duration) || 0,
      order_index: finalOrderIndex,
      is_required: Boolean(isRequired),
      published: Boolean(published),
      created_at: now,
      updated_at: now,
    };

    let inserted = null;
    const { error: insErr, data: insData } = await supabase.from("lessons").insert(lessonDoc).select().maybeSingle();

    if (insErr && (insErr.code === "42703" || insErr.message?.includes("video_type"))) {
      const fallbackDoc = { ...lessonDoc };
      delete fallbackDoc.video_type;
      const { data: fbData, error: fbErr } = await supabase.from("lessons").insert(fallbackDoc).select().maybeSingle();
      if (fbErr) {
        throw new Error(fbErr.message);
      }
      inserted = fbData;
    } else if (insErr) {
      throw new Error(insErr.message);
    } else {
      inserted = insData;
    }

    return NextResponse.json({
      success: true,
      lesson: inserted || lessonDoc,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create lesson" },
      { status: error.statusCode || 500 }
    );
  }
}
