import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, run, runSingle, nowIso } from "../../../_utils/supabase";
import { broadcast } from "../../../_utils/events";

export const runtime = "nodejs";

const AUTO_PROVISION_ROLES = process.env.AUTO_PROVISION_ROLES !== "false";

export async function GET(request, context) {
  try {
    const params = await context?.params;
    const requestedUserId = params?.userId;

    // 1. Authenticate session with Clerk
    let authUserId = null;
    let authObj = null;
    try {
      authObj = await auth();
      authUserId = authObj?.userId || null;
    } catch (authErr) {
      console.warn("[/api/users/[userId]/role] Clerk auth check warning:", authErr.message);
    }

    const targetUserId = requestedUserId || authUserId;

    if (!targetUserId) {
      return NextResponse.json({ error: "Unauthorized: User ID required" }, { status: 401 });
    }

    // Security: If caller specifies a different userId than their authenticated ID, verify authorization
    if (authUserId && requestedUserId && String(authUserId).trim() !== String(requestedUserId).trim()) {
      const callerRoleDoc = await runSingle(
        supabase.from("user_roles").select("role").eq("user_id", authUserId).maybeSingle()
      );
      if (!callerRoleDoc || !["admin", "teacher"].includes(callerRoleDoc.role)) {
        return NextResponse.json(
          { error: "Forbidden: Cannot query role of another user" },
          { status: 403 }
        );
      }
    }

    // 2. Fetch role from user_roles
    let roleDoc = null;
    try {
      roleDoc = await runSingle(
        supabase
          .from("user_roles")
          .select("user_id, role, name, class, school_id, provisional, created_at, updated_at")
          .eq("user_id", targetUserId)
          .maybeSingle()
      );
    } catch (dbErr) {
      console.warn("[/api/users/[userId]/role] user_roles query error:", dbErr.message);
    }

    // If roleDoc exists and role is assigned (not "unassigned"), return it directly
    if (roleDoc && roleDoc.role && roleDoc.role !== "unassigned") {
      return NextResponse.json({
        userId: roleDoc.user_id,
        role: roleDoc.role,
        name: roleDoc.name,
        class: roleDoc.class,
        schoolId: roleDoc.school_id,
        provisional: roleDoc.provisional ?? false,
        createdAt: roleDoc.created_at,
        updatedAt: roleDoc.updated_at,
      });
    }



    // 4. Auto-provision unassigned profile if not found
    if (!roleDoc) {
      if (!AUTO_PROVISION_ROLES) {
        return NextResponse.json({ error: "User role not found" }, { status: 404 });
      }

      const now = nowIso();
      const provisional = {
        user_id: targetUserId,
        role: "unassigned",
        provisional: true,
        name: null,
        school_id: null,
        class: null,
        created_at: now,
        updated_at: now,
      };

      try {
        await run(supabase.from("user_roles").upsert(provisional, { onConflict: "user_id" }));
        broadcast("user.provisioned", { userId: targetUserId, role: "unassigned" });
      } catch (upsertErr) {
        console.warn("[/api/users/[userId]/role] Auto-provision upsert warning:", upsertErr.message);
      }

      return NextResponse.json({
        userId: targetUserId,
        role: "unassigned",
        name: null,
        class: null,
        schoolId: null,
        provisional: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 5. Return database role record
    return NextResponse.json({
      userId: roleDoc.user_id,
      role: roleDoc.role,
      name: roleDoc.name,
      class: roleDoc.class,
      schoolId: roleDoc.school_id,
      provisional: roleDoc.provisional ?? false,
      createdAt: roleDoc.created_at,
      updatedAt: roleDoc.updated_at,
    });
  } catch (error) {
    console.error("[/api/users/[userId]/role] Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.statusCode || 500 });
  }
}

