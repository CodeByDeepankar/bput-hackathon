import { NextResponse } from "next/server";
import {
  supabase,
  run,
  normalizeId,
  nowIso,
  requireUserRole,
  ensureTeacher,
} from "../_utils/supabase";
import { broadcast } from "../_utils/events";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get("class");
    const schoolId = searchParams.get("schoolId");
    const debug = searchParams.get("debug") === "true";

    let query = supabase
      .from("subjects")
      .select("id, name, class, description, created_by, school_id, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (classFilter) query = query.eq("class", classFilter);

    const subjects = await run(query);

    const filtered = subjects.filter(
      (subject) => !schoolId || !subject.school_id || subject.school_id === schoolId
    );

    if (debug) {
      console.log(
        "[DEBUG /subjects] count=%d classFilter=%s schoolId=%s",
        filtered.length,
        classFilter,
        schoolId
      );
    }

    return NextResponse.json(
      filtered.map((row) => ({
        id: row.id,
        name: row.name,
        class: row.class,
        description: row.description,
        createdBy: row.created_by,
        schoolId: row.school_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}

export async function POST(request) {
  try {
    const { name, class: subjectClass, description, createdBy } = await request.json();
    if (!name || !subjectClass || !createdBy) {
      return NextResponse.json({ error: "name, class, and createdBy are required" }, { status: 400 });
    }

    const creator = await requireUserRole(createdBy);
    ensureTeacher(creator);

    const subjectId = normalizeId("subject", name);
    const now = nowIso();
    const doc = {
      id: subjectId,
      name,
      class: subjectClass,
      description: description || "",
      created_by: createdBy,
      school_id: creator.school_id || null,
      created_at: now,
      updated_at: now,
    };

    const inserted = await run(
      supabase.from("subjects").insert(doc).select().maybeSingle()
    );

    broadcast("subject.created", {
      id: subjectId,
      name: doc.name,
      class: doc.class,
      schoolId: doc.school_id,
      description: doc.description,
    });

    return NextResponse.json({
      success: true,
      id: subjectId,
      subject: inserted ?? {
        id: subjectId,
        name: doc.name,
        class: doc.class,
        description: doc.description,
        createdBy: doc.created_by,
        schoolId: doc.school_id,
        createdAt: doc.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
