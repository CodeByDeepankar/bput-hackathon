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

const DEFAULT_SCHOOL_SUBJECTS = [
  { id: "subject:math", name: "Mathematics", description: "Arithmetic, Algebra, Geometry, and Problem Solving", class: "all", icon: "🔢", color: "#10b981" },
  { id: "subject:science", name: "Science", description: "Physics, Chemistry, Biology, and Natural Sciences", class: "all", icon: "🔬", color: "#3b82f6" },
  { id: "subject:social", name: "Social Science", description: "History, Geography, Civics, and Social Studies", class: "all", icon: "🌍", color: "#8b5cf6" },
  { id: "subject:english", name: "English", description: "Grammar, Reading Comprehension, and Literature", class: "all", icon: "📚", color: "#f59e0b" },
  { id: "subject:hindi", name: "Hindi / Local Language", description: "Language skills, literature, and regional studies", class: "all", icon: "✍️", color: "#ec4899" },
  { id: "subject:cs", name: "Digital Literacy & Computer", description: "Computer basics, internet safety, and software tools", class: "all", icon: "💻", color: "#06b6d4" },
  { id: "subject:evs", name: "Environmental Studies (EVS)", description: "Environment, ecology, health, and sustainability", class: "all", icon: "🌱", color: "#22c55e" },
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get("class");
    const schoolId = searchParams.get("schoolId");
    const debug = searchParams.get("debug") === "true";

    let subjects = [];
    try {
      subjects = await run(
        supabase
          .from("subjects")
          .select("id, name, class, description, created_by, school_id, created_at, updated_at")
          .order("created_at", { ascending: false })
      );
    } catch (dbErr) {
      console.warn("[/api/subjects] DB query failed, using defaults:", dbErr.message);
    }

    // Auto-seed default school subjects if DB is empty
    if (!Array.isArray(subjects) || subjects.length === 0) {
      try {
        const docs = DEFAULT_SCHOOL_SUBJECTS.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          class: s.class,
          icon: s.icon,
          color: s.color,
          created_at: nowIso(),
          updated_at: nowIso(),
        }));
        await run(supabase.from("subjects").upsert(docs));
        subjects = docs;
      } catch (seedErr) {
        console.warn("[/api/subjects] Seeding default subjects failed:", seedErr.message);
        subjects = DEFAULT_SCHOOL_SUBJECTS.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          class: s.class,
          created_at: new Date().toISOString(),
        }));
      }
    }

    // Filter by class and schoolId
    const cleanClassFilter = classFilter ? classFilter.trim().toLowerCase() : null;
    const numericClass = classFilter ? classFilter.replace(/\D/g, "") : null;

    const filtered = subjects.filter((subject) => {
      // School ID check
      if (schoolId && subject.school_id && subject.school_id !== schoolId) {
        return false;
      }

      // Class check
      if (!cleanClassFilter) return true;
      if (!subject.class || subject.class === "all" || subject.class === "5-8" || subject.class === "1-12") return true;

      const subClass = String(subject.class).trim().toLowerCase();
      if (subClass === cleanClassFilter) return true;
      if (numericClass && subClass.replace(/\D/g, "") === numericClass) return true;

      return true; // Return all general subjects if no strict mismatch
    });

    if (debug) {
      console.log(
        "[DEBUG /subjects] count=%d classFilter=%s schoolId=%s",
        filtered.length,
        classFilter,
        schoolId
      );
    }

    return NextResponse.json(
      filtered.map((row) => ({
        id: row.id,
        name: row.name,
        class: row.class,
        description: row.description,
        createdBy: row.created_by,
        schoolId: row.school_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      {
        status: error.statusCode || 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        },
      }
    );
  }
}

export async function POST(request) {
  try {
    const { name, class: subjectClass, description, createdBy } = await request.json();
    if (!name || !subjectClass || !createdBy) {
      return NextResponse.json({ error: "name, class, and createdBy are required" }, { status: 400 });
    }

    const creator = await requireUserRole(createdBy);
    ensureTeacher(creator);

    const subjectId = normalizeId("subject", name);
    const now = nowIso();
    const doc = {
      id: subjectId,
      name,
      class: subjectClass,
      description: description || "",
      created_by: createdBy,
      school_id: creator.school_id || null,
      created_at: now,
      updated_at: now,
    };

    const inserted = await run(
      supabase.from("subjects").insert(doc).select().maybeSingle()
    );

    broadcast("subject.created", {
      id: subjectId,
      name: doc.name,
      class: doc.class,
      schoolId: doc.school_id,
      description: doc.description,
    });

    return NextResponse.json({
      success: true,
      id: subjectId,
      subject: inserted ?? {
        id: subjectId,
        name: doc.name,
        class: doc.class,
        description: doc.description,
        createdBy: doc.created_by,
        schoolId: doc.school_id,
        createdAt: doc.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
