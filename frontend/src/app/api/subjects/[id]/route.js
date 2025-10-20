import { NextResponse } from "next/server";
import {
  supabase,
  run,
  runSingle,
  nowIso,
  requireUserRole,
  ensureTeacher,
} from "../../_utils/supabase";

export const runtime = "nodejs";

export async function PUT(request, context) {
  try {
    const { id } = await context.params;
    const { name, class: subjectClass, description, updatedBy } = await request.json();

    const updater = await requireUserRole(updatedBy);
    ensureTeacher(updater);

    const existing = await runSingle(
      supabase
        .from("subjects")
        .select("id, name, class, description, created_by, school_id, created_at")
        .eq("id", id)
        .maybeSingle()
    );

    if (!existing) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const updated = {
      name: name ?? existing.name,
      class: subjectClass ?? existing.class,
      description: description !== undefined ? description : existing.description,
      updated_at: nowIso(),
    };

    await run(supabase.from("subjects").update(updated).eq("id", id));

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const { id } = await context.params;
    let deletedBy;
    try {
      const body = await request.json();
      deletedBy = body?.deletedBy;
    } catch {
      deletedBy = undefined;
    }

    if (!deletedBy) {
      return NextResponse.json({ error: "deletedBy is required" }, { status: 400 });
    }

    const deleter = await requireUserRole(deletedBy);
    ensureTeacher(deleter);

    await run(supabase.from("subjects").delete().eq("id", id));
    return NextResponse.json({ success: true, message: "Subject deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
