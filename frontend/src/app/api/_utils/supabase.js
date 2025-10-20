import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase credentials missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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
  const { data, error } = await queryPromise;
  if (error) {
    const err = new Error(error.message || "Supabase query failed");
    err.statusCode = error.status || 500;
    throw err;
  }
  return data;
}

export async function runSingle(queryPromise) {
  const { data, error } = await queryPromise;
  if (error && error.code !== "PGRST116") {
    const err = new Error(error.message || "Supabase query failed");
    err.statusCode = error.status || 500;
    throw err;
  }
  return data ?? null;
}

export async function requireUserRole(userId) {
  if (!userId) {
    const err = new Error("userId is required");
    err.statusCode = 400;
    throw err;
  }
  const role = await runSingle(
    supabase
      .from("user_roles")
      .select("user_id, role, name, school_id, class, provisional, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle()
  );
  if (!role) {
    const err = new Error("User role not found");
    err.statusCode = 404;
    throw err;
  }
  return role;
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
