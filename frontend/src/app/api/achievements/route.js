import { NextResponse } from "next/server";
import { supabase, run, runSingle, nowIso } from "../_utils/supabase";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { userId, key, title, description, icon, meta } = await request.json();
    if (!userId || !key) {
      return NextResponse.json({ error: "userId and key are required" }, { status: 400 });
    }

    const id = `ach:${userId}:${key}`;
    const existing = await runSingle(
      supabase.from("achievements").select("id, awarded_at, title, description, icon, meta").eq("id", id).maybeSingle()
    );

    const doc = {
      id,
      user_id: userId,
      key,
      title: title || existing?.title || key,
      description: description || existing?.description || "",
      icon: icon || existing?.icon || null,
      awarded_at: existing?.awarded_at || nowIso(),
      meta: meta || existing?.meta || {},
    };

    await run(supabase.from("achievements").upsert(doc));
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
