import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, run, runSingle, nowIso } from "../../_utils/supabase";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    let authUserId = null;
    try {
      const authObj = await auth();
      authUserId = authObj?.userId || null;
    } catch (authErr) {
      console.warn("[/api/users/role] Clerk auth warning:", authErr.message);
    }

    const body = await request.json();
    const { userId, role, name, schoolId, class: klass } = body;

    const targetUserId = authUserId || userId;

    if (!targetUserId || !role) {
      return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
    }

    // Security check: If authenticated user tries to update another user's role, verify admin status
    if (authUserId && userId && String(authUserId).trim() !== String(userId).trim()) {
      const callerRoleDoc = await runSingle(
        supabase.from("user_roles").select("role").eq("user_id", authUserId).maybeSingle()
      );
      if (callerRoleDoc?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden: Cannot update role of another user" }, { status: 403 });
      }
    }

    const existing = await runSingle(
      supabase.from("user_roles").select("*").eq("user_id", targetUserId).maybeSingle()
    );

    const payload = {
      user_id: targetUserId,
      role,
      provisional: false,
      name: name ?? existing?.name ?? null,
      school_id: schoolId || existing?.school_id || "default",
      class: klass ?? existing?.class ?? null,
      created_at: existing?.created_at ?? nowIso(),
      updated_at: nowIso(),
    };

    const saved = await run(
      supabase.from("user_roles").upsert(payload, { onConflict: "user_id" }).select().maybeSingle()
    );

    return NextResponse.json({ success: true, user: saved ?? payload });
  } catch (error) {
    console.error("[/api/users/role] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: error.statusCode || 500 });
  }
}

