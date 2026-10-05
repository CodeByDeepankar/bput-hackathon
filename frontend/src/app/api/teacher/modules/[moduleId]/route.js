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

    const moduleDoc = await runSingle(
      supabase
        .from("learning_modules")
        .select("id, school_id, class, subject_id, title, description, thumbnail_url, published, created_by, created_at, updated_at")
        .eq("id", moduleId)
        .maybeSingle()
    );

    if (!moduleDoc) {
      return NextResponse.json({ error: "Learning module not found" }, { status: 404 });
    }

    if (moduleDoc.school_id && teacher.school_id && moduleDoc.school_id !== teacher.school_id) {
      return NextResponse.json({ error: "Access denied for this school's content" }, { status: 403 });
    }

    const lessons = await run(
      supabase
        .from("lessons")
        .select("id, module_id, title, description, video_path, video_url, duration, order_index, is_required, published, created_at, updated_at")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true })
    );

    return NextResponse.json(
      {
        ...moduleDoc,
        lessons: lessons || [],
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch module details" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const authObj = await auth();
    const userId = authObj?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await requireUserRole(userId);
    ensureTeacher(teacher);

    const { moduleId } = await context.params;
    const body = await request.json();

    const existing = await runSingle(
      supabase.from("learning_modules").select("*").eq("id", moduleId).maybeSingle()
    );

    if (!existing) {
      return NextResponse.json({ error: "Learning module not found" }, { status: 404 });
    }

    if (existing.school_id && teacher.school_id && existing.school_id !== teacher.school_id) {
      return NextResponse.json({ error: "Cannot modify content for another school" }, { status: 403 });
    }

    const { title, description, class: klass, subjectId, thumbnailUrl, published } = body || {};

    const updates = {
      title: title !== undefined ? title.trim() : existing.title,
      description: description !== undefined ? (description ? String(description).trim() : null) : existing.description,
      class: klass !== undefined ? klass.trim() : existing.class,
      subject_id: subjectId !== undefined ? subjectId.trim() : existing.subject_id,
      thumbnail_url: thumbnailUrl !== undefined ? (thumbnailUrl ? String(thumbnailUrl).trim() : null) : existing.thumbnail_url,
      published: published !== undefined ? Boolean(published) : existing.published,
      updated_at: nowIso(),
    };

    const updated = await run(
      supabase.from("learning_modules").update(updates).eq("id", moduleId).select().maybeSingle()
    );

    return NextResponse.json({
      success: true,
      module: updated || { id: moduleId, ...updates },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update module" },
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

    const { moduleId } = await context.params;

    const existing = await runSingle(
      supabase.from("learning_modules").select("id, school_id").eq("id", moduleId).maybeSingle()
    );

    if (!existing) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    if (existing.school_id && teacher.school_id && existing.school_id !== teacher.school_id) {
      return NextResponse.json({ error: "Cannot delete content for another school" }, { status: 403 });
    }

    await run(supabase.from("learning_modules").delete().eq("id", moduleId));

    return NextResponse.json({ success: true, message: "Module deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete module" },
      { status: error.statusCode || 500 }
    );
  }
}
