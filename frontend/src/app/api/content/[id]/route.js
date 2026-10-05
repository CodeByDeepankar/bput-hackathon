import { NextResponse } from "next/server";
import {
  supabase,
  run,
  runSingle,
  nowIso,
  requireUserRole,
  ensureTeacher,
} from "../../_utils/supabase";
import { broadcast } from "../../_utils/events";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["quiz", "article", "video", "material"]);

export async function PUT(request, { params }) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Content id is required" }, { status: 400 });
    }

    const payload = await request.json();
    const { updatedBy, title, description, type, url, embedHtml, body, tags } = payload || {};

    if (!updatedBy) {
      return NextResponse.json({ error: "updatedBy is required" }, { status: 400 });
    }

    const editor = await requireUserRole(updatedBy);
    ensureTeacher(editor);

    if (!editor.school_id) {
      return NextResponse.json({ error: "Teacher is not assigned to a school" }, { status: 400 });
    }

    const existing = await runSingle(
      supabase
        .from("school_content")
        .select("id, school_id, type")
        .eq("id", id)
        .maybeSingle()
    );

    if (!existing) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (existing.school_id && editor.school_id && existing.school_id !== editor.school_id) {
      return NextResponse.json({ error: "Cannot modify content from another school" }, { status: 403 });
    }

    const safeType = ALLOWED_TYPES.has(type) ? type : existing.type;

    const updateDoc = { updated_at: nowIso() };

    if (title !== undefined) {
      updateDoc.title = title ? String(title).trim() : null;
    }

    if (description !== undefined) {
      updateDoc.description = description ? String(description).trim() : null;
    }

    if (type !== undefined) {
      updateDoc.type = safeType;
    }

    if (url !== undefined) {
      updateDoc.url = url ? String(url).trim() : null;
    }

    if (body !== undefined) {
      const trimmedBody = body ? String(body).trim() : "";
      updateDoc.body = trimmedBody ? trimmedBody : null;
    }

    if (tags !== undefined) {
      const sanitizedTags = Array.isArray(tags)
        ? tags
            .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
            .filter(Boolean)
            .slice(0, 10)
        : [];
      updateDoc.tags = sanitizedTags.length ? sanitizedTags : null;
    }

    if (safeType === "video") {
      updateDoc.embed_html = embedHtml ? String(embedHtml).trim() : null;
    } else if (type !== undefined) {
      updateDoc.embed_html = null;
    }

    const updated = await run(
      supabase
        .from("school_content")
        .update(updateDoc)
        .eq("id", id)
        .select()
        .maybeSingle()
    );

    if (!updated) {
      return NextResponse.json({ error: "Unable to update content" }, { status: 500 });
    }

    const payloadResponse = {
      id: updated.id,
      schoolId: updated.school_id,
      createdBy: updated.created_by,
      type: updated.type,
      title: updated.title,
      description: updated.description,
      url: updated.url,
      embedHtml: updated.embed_html,
      body: updated.body,
      tags: updated.tags || [],
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };

    broadcast("content.updated", payloadResponse);

    return NextResponse.json({ success: true, content: payloadResponse });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to update content" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Content id is required" }, { status: 400 });
    }

    const url = new URL(request.url);
    let deletedBy = url.searchParams.get("deletedBy");

    if (!deletedBy) {
      try {
        const body = await request.json();
        if (body?.deletedBy) {
          deletedBy = body.deletedBy;
        }
      } catch (error) {
        // ignore body parse errors when no payload is provided
      }
    }

    if (!deletedBy) {
      return NextResponse.json({ error: "deletedBy is required" }, { status: 400 });
    }

    const remover = await requireUserRole(deletedBy);
    ensureTeacher(remover);

    if (!remover.school_id) {
      return NextResponse.json({ error: "Teacher is not assigned to a school" }, { status: 400 });
    }

    const existing = await runSingle(
      supabase
        .from("school_content")
        .select("id, school_id")
        .eq("id", id)
        .maybeSingle()
    );

    if (!existing) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (existing.school_id && remover.school_id && existing.school_id !== remover.school_id) {
      return NextResponse.json({ error: "Cannot delete content from another school" }, { status: 403 });
    }

    await run(supabase.from("school_content").delete().eq("id", id));

    broadcast("content.deleted", { id, schoolId: existing.school_id });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to delete content" },
      { status: error.statusCode || 500 }
    );
  }
}
