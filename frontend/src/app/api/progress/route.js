import { NextResponse } from "next/server";
import { supabase, run, normalizeId, nowIso, errorResponse } from "../_utils/supabase";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = {
      id: normalizeId("progress", body?.studentId || "progress"),
      payload: body,
      created_at: nowIso(),
    };
    const inserted = await run(
      supabase.from("student_progress").insert(payload).select().maybeSingle()
    );
    return NextResponse.json(inserted ?? payload);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET() {
  try {
    const rows = await run(
      supabase
        .from("student_progress")
        .select("id, payload, created_at")
        .order("created_at", { descending: true })
    );
    return NextResponse.json(
      rows.map((row) => ({ id: row.id, ...row.payload, createdAt: row.created_at }))
    );
  } catch (error) {
    return errorResponse(error);
  }
}
