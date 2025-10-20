import { NextResponse } from "next/server";
import { supabase, run, runSingle, nowIso } from "../../../_utils/supabase";
import { broadcast } from "../../../_utils/events";

export const runtime = "nodejs";

const AUTO_PROVISION_ROLES = process.env.AUTO_PROVISION_ROLES !== "false";

export async function GET(request, context) {
  try {
    const { userId } = await context.params;
    const roleDoc = await runSingle(
      supabase
        .from("user_roles")
        .select("user_id, role, name, class, school_id, provisional, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle()
    );

    if (!roleDoc) {
      if (!AUTO_PROVISION_ROLES) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
      }
      const now = nowIso();
      const provisional = {
        user_id: userId,
        role: "unassigned",
        provisional: true,
        name: null,
        school_id: null,
        class: null,
        created_at: now,
        updated_at: now,
      };
      await run(supabase.from("user_roles").upsert(provisional));
      broadcast("user.provisioned", { userId, role: "unassigned" });
      return NextResponse.json(
        { error: "Not Onboarded", provisional: true },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId: roleDoc.user_id,
      role: roleDoc.role,
      name: roleDoc.name,
      class: roleDoc.class,
      schoolId: roleDoc.school_id,
      provisional: roleDoc.provisional,
      createdAt: roleDoc.created_at,
      updatedAt: roleDoc.updated_at,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
