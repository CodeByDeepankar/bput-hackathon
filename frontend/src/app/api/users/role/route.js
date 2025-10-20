import { NextResponse } from "next/server";
import { supabase, run, runSingle, nowIso } from "../../_utils/supabase";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { userId, role, name, schoolId, class: klass } = await request.json();
    if (!userId || !role) {
      return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
    }

    const existing = await runSingle(
      supabase.from("user_roles").select("*").eq("user_id", userId).maybeSingle()
    );

    const payload = {
      user_id: userId,
      role,
      provisional: false,
      name: name ?? existing?.name ?? null,
      school_id: schoolId ?? existing?.school_id ?? null,
      class: klass ?? existing?.class ?? null,
      created_at: existing?.created_at ?? nowIso(),
      updated_at: nowIso(),
    };

    const saved = await run(
      supabase.from("user_roles").upsert(payload).select().maybeSingle()
    );

    return NextResponse.json({ success: true, user: saved ?? payload });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
