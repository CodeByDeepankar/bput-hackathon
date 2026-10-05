import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { supabase, run } from "../../_utils/supabase";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      console.warn("Missing CLERK_WEBHOOK_SECRET environment variable");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const payloadString = await request.text();
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
    }

    const wh = new Webhook(secret);
    let evt;
    try {
      evt = wh.verify(payloadString, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (err) {
      console.error("Webhook verification failed", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (evt.type === "user.deleted") {
      const userId = evt.data.id;
      await run(supabase.from("user_roles").delete().eq("user_id", userId));
      await run(supabase.from("streaks").delete().eq("user_id", userId));
      await run(supabase.from("quiz_completions").delete().eq("user_id", userId));
      await run(supabase.from("quiz_responses").delete().eq("student_id", userId));
      await run(supabase.from("achievements").delete().eq("user_id", userId));
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
