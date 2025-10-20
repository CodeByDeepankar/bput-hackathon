import { NextResponse } from "next/server";
import {
  supabase,
  run,
  runSingle,
  normalizeId,
  nowIso,
  requireUserRole,
  ensureTeacher,
} from "../_utils/supabase";
import { broadcast } from "../_utils/events";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const createdBy = searchParams.get("createdBy");
    const schoolId = searchParams.get("schoolId");

    let query = supabase
      .from("quizzes")
      .select(
        "id, subject_id, title, description, difficulty, time_limit, created_by, school_id, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (subjectId) query = query.eq("subject_id", subjectId);
    if (createdBy) query = query.eq("created_by", createdBy);
    if (schoolId) query = query.eq("school_id", schoolId);

    const quizzes = await run(query);

    return NextResponse.json(
      quizzes.map((quiz) => ({
        id: quiz.id,
        subjectId: quiz.subject_id,
        title: quiz.title,
        description: quiz.description,
        difficulty: quiz.difficulty,
        timeLimit: quiz.time_limit,
        createdBy: quiz.created_by,
        schoolId: quiz.school_id,
        createdAt: quiz.created_at,
        updatedAt: quiz.updated_at,
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      subjectId,
      title,
      description,
      difficulty = "medium",
      timeLimit = 300,
      createdBy,
      questions = [],
    } = body || {};

    if (!subjectId || !title || !createdBy) {
      return NextResponse.json({ error: "subjectId, title, and createdBy are required" }, { status: 400 });
    }

    const creator = await requireUserRole(createdBy);
    ensureTeacher(creator);

    const subject = await runSingle(
      supabase.from("subjects").select("id").eq("id", subjectId).maybeSingle()
    );
    if (!subject) {
      return NextResponse.json({ error: "Subject not found. Provide valid subjectId." }, { status: 400 });
    }

    const quizId = normalizeId("quiz", title);
    const now = nowIso();
    const quizDoc = {
      id: quizId,
      subject_id: subjectId,
      title,
      description: description || "",
      difficulty,
      time_limit: timeLimit,
      created_by: createdBy,
      school_id: creator.school_id || null,
      created_at: now,
      updated_at: now,
    };

    await run(supabase.from("quizzes").insert(quizDoc));

    if (Array.isArray(questions) && questions.length > 0) {
      const questionDocs = questions.map((question, index) => ({
        id: `${quizId}:question:${index + 1}`,
        quiz_id: quizId,
        text: question.text,
        options: question.options || [],
        correct_answer: question.correctAnswer,
        explanation: question.explanation || "",
        order: index + 1,
        created_at: nowIso(),
      }));
      await run(supabase.from("questions").insert(questionDocs));
    }

    broadcast("quiz.created", { id: quizId, subjectId: quizDoc.subject_id, schoolId: quizDoc.school_id });

    return NextResponse.json({
      success: true,
      id: quizId,
      quiz: {
        id: quizId,
        subjectId: quizDoc.subject_id,
        title: quizDoc.title,
        description: quizDoc.description,
        difficulty: quizDoc.difficulty,
        timeLimit: quizDoc.time_limit,
        createdBy: quizDoc.created_by,
        createdAt: quizDoc.created_at,
        questionsCount: Array.isArray(questions) ? questions.length : 0,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
