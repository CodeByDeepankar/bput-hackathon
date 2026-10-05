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
} from "../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const authObj = await auth();
    const userId = authObj?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await requireUserRole(userId);
    ensureTeacher(teacher);

    const schoolId = teacher.school_id || "default";

    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get("class");
    const subjectId = searchParams.get("subjectId");

    let query = supabase
      .from("learning_modules")
      .select("id, school_id, class, subject_id, title, description, thumbnail_url, published, created_by, created_at, updated_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (classFilter) {
      query = query.eq("class", classFilter);
    }
    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    }

    const modules = await run(query);

    return NextResponse.json(modules, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch learning modules" },
      {
        status: error.statusCode || 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" },
      }
    );
  }
}

export async function POST(request) {
  try {
    const authObj = await auth();
    const userId = authObj?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await requireUserRole(userId);
    ensureTeacher(teacher);

    const schoolId = teacher.school_id || "default";

    const body = await request.json();
    const { title, description, class: klass, subjectId, thumbnailUrl, published = true } = body || {};

    if (!title || !klass || !subjectId) {
      return NextResponse.json(
        { error: "Title, Class, and Subject are required" },
        { status: 400 }
      );
    }

    const moduleId = normalizeId("module", title);
    const now = nowIso();

    const moduleDoc = {
      id: moduleId,
      school_id: schoolId,
      class: klass.trim(),
      subject_id: subjectId.trim(),
      title: title.trim(),
      description: description ? String(description).trim() : null,
      thumbnail_url: thumbnailUrl ? String(thumbnailUrl).trim() : null,
      published: Boolean(published),
      created_by: userId,
      created_at: now,
      updated_at: now,
    };

    const inserted = await run(
      supabase.from("learning_modules").insert(moduleDoc).select().maybeSingle()
    );

    return NextResponse.json({
      success: true,
      module: inserted || moduleDoc,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create learning module" },
      { status: error.statusCode || 500 }
    );
  }
}
