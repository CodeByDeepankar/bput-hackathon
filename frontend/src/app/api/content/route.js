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

const ALLOWED_TYPES = new Set(["quiz", "article", "video", "material"]);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const type = searchParams.get("type");
    const limitParam = searchParams.get("limit");

    if (!schoolId) {
      return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    let query = supabase
      .from("school_content")
      .select(
        "id, school_id, created_by, type, title, description, url, embed_html, body, tags, created_at, updated_at"
      )
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (type && ALLOWED_TYPES.has(type)) {
      query = query.eq("type", type);
    }

    if (limitParam) {
      const parsed = Number.parseInt(limitParam, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        query = query.limit(Math.min(parsed, 200));
      }
    }

    const rows = await run(query);

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        schoolId: row.school_id,
        createdBy: row.created_by,
        type: row.type,
        title: row.title,
        description: row.description,
        url: row.url,
        embedHtml: row.embed_html,
        body: row.body,
        tags: row.tags || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load content" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const {
      createdBy,
      title,
      description,
      type,
      url,
      embedHtml,
      body,
      tags,
    } = payload || {};

    if (!createdBy || !title) {
      return NextResponse.json(
        { error: "createdBy and title are required" },
        { status: 400 }
      );
    }

    const creator = await requireUserRole(createdBy);
    ensureTeacher(creator);

    const schoolId = creator.school_id;
    if (!schoolId) {
      return NextResponse.json(
        { error: "Teacher does not have an assigned school" },
        { status: 400 }
      );
    }

    const safeType = ALLOWED_TYPES.has(type) ? type : "article";
    const now = nowIso();
    const id = normalizeId("content", title);

    const sanitizedTags = Array.isArray(tags)
      ? tags
          .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
          .filter(Boolean)
      : [];

    const doc = {
      id,
      school_id: schoolId,
      created_by: createdBy,
      type: safeType,
      title: title.trim(),
      description: description ? String(description).trim() : null,
      url: url ? String(url).trim() : null,
      embed_html: embedHtml ? String(embedHtml).trim() : null,
      body: body ? String(body).trim() : null,
      tags: sanitizedTags.length ? sanitizedTags : null,
      created_at: now,
      updated_at: now,
    };

    const inserted = await run(
      supabase
        .from("school_content")
        .insert(doc)
        .select()
        .maybeSingle()
    );

    const responsePayload = inserted
      ? {
          id: inserted.id,
          schoolId: inserted.school_id,
          createdBy: inserted.created_by,
          type: inserted.type,
          title: inserted.title,
          description: inserted.description,
          url: inserted.url,
          embedHtml: inserted.embed_html,
          body: inserted.body,
          tags: inserted.tags || [],
          createdAt: inserted.created_at,
          updatedAt: inserted.updated_at,
        }
      : {
          id,
          schoolId,
          createdBy,
          type: safeType,
          title: doc.title,
          description: doc.description,
          url: doc.url,
          embedHtml: doc.embed_html,
          body: doc.body,
          tags: sanitizedTags,
          createdAt: now,
          updatedAt: now,
        };

    broadcast("content.created", responsePayload);

    return NextResponse.json({ success: true, content: responsePayload });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to create content" },
      { status: error.statusCode || 500 }
    );
  }
}
