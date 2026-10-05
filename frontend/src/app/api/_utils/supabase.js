import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  !SUPABASE_URL.includes("your-project-id") &&
  !SUPABASE_URL.includes("example") &&
  SUPABASE_SERVICE_ROLE_KEY &&
  !SUPABASE_SERVICE_ROLE_KEY.includes("your_supabase") &&
  !SUPABASE_SERVICE_ROLE_KEY.includes("example")
);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export function nowIso() {
  return new Date().toISOString();
}

export function normalizeId(prefix, slugSource) {
  const safe = String(slugSource || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}:${Date.now()}:${safe || "item"}`;
}

export async function run(queryPromise) {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }
  try {
    const { data, error } = await queryPromise;
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("schema cache") || error.message?.includes("does not exist")) {
        return [];
      }
      const err = new Error(error.message || "Supabase query failed");
      err.statusCode = error.status || 500;
      throw err;
    }
    return data ?? [];
  } catch (err) {
    if (err.message?.includes("schema cache") || err.message?.includes("does not exist")) {
      console.warn("[Supabase] Table missing in database schema:", err.message);
      return [];
    }
    throw err;
  }
}

export async function runSingle(queryPromise) {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }
  try {
    const { data, error } = await queryPromise;
    if (error) {
      if (error.code === "PGRST116" || error.code === "PGRST205" || error.message?.includes("schema cache") || error.message?.includes("does not exist")) {
        return null;
      }
      const err = new Error(error.message || "Supabase query failed");
      err.statusCode = error.status || 500;
      throw err;
    }
    return data ?? null;
  } catch (err) {
    if (err.message?.includes("schema cache") || err.message?.includes("does not exist")) {
      console.warn("[Supabase] Table missing in database schema:", err.message);
      return null;
    }
    throw err;
  }
}

export async function requireUserRole(userId) {
  if (!userId) {
    const err = new Error("userId is required");
    err.statusCode = 400;
    throw err;
  }
  if (!isSupabaseConfigured) {
    return {
      user_id: userId,
      role: "student",
      name: "Guest User",
      school_id: "default",
      class: "10",
      provisional: true,
    };
  }
  try {
    const role = await runSingle(
      supabase
        .from("user_roles")
        .select("user_id, role, name, school_id, class, provisional, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle()
    );
    if (!role) {
      return {
        user_id: userId,
        role: "student",
        name: "Guest User",
        school_id: "default",
        class: "10",
        provisional: true,
      };
    }
    return role;
  } catch (err) {
    console.warn("user_roles table missing or query error, returning fallback role:", err.message);
    return {
      user_id: userId,
      role: "student",
      name: "Guest User",
      school_id: "default",
      class: "10",
      provisional: true,
    };
  }
}

export function ensureTeacher(roleDoc) {
  if (!roleDoc || !["teacher", "admin"].includes(roleDoc.role)) {
    const err = new Error("Only teachers can perform this action");
    err.statusCode = 403;
    throw err;
  }
}

export function errorResponse(error) {
  const status = error?.statusCode || 500;
  return new Response(JSON.stringify({ error: error.message || "Unexpected error" }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
