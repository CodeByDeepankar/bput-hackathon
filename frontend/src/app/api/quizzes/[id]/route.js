import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, run, runSingle, nowIso } from "../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const includeAnswers = String(new URL(request.url).searchParams.get("includeAnswers") || "false").toLowerCase() === "true";

    const quiz = await runSingle(
      supabase
        .from("quizzes")
        .select("id, subject_id, module_id, title, description, difficulty, time_limit, created_by, school_id, is_bank, is_published, created_at, updated_at")
        .eq("id", id)
        .maybeSingle()
    );

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Check module unlock conditions if quiz is linked to a module
    if (quiz.module_id) {
      const authObj = await auth();
      const userId = authObj?.userId;

      // Check role
      let isStudent = false;
      if (userId) {
        try {
          const roleDoc = await runSingle(
            supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle()
          );
          if (roleDoc?.role === "student") {
            isStudent = true;
          }
        } catch (e) {
          console.warn("[/api/quizzes/[id]] role check error:", e.message);
        }
      }

      if (isStudent) {
        // 1. Check teacher release status
        if (!quiz.is_published) {
          return NextResponse.json(
            { error: "Quiz is locked. Your teacher has not released the quiz yet." },
            { status: 403 }
          );
        }

        // 2. Fetch required lessons for this module
        const requiredLessons = await run(
          supabase
            .from("lessons")
            .select("id")
            .eq("module_id", quiz.module_id)
            .eq("is_required", true)
            .eq("published", true)
        );

        if (Array.isArray(requiredLessons) && requiredLessons.length > 0) {
          const reqLessonIds = requiredLessons.map((l) => l.id);
          const completedProgress = await run(
            supabase
              .from("lesson_progress")
              .select("lesson_id")
              .eq("student_id", userId)
              .eq("completed", true)
              .in("lesson_id", reqLessonIds)
          );

          const completedCount = Array.isArray(completedProgress) ? completedProgress.length : 0;
          if (completedCount < reqLessonIds.length) {
            return NextResponse.json(
              { error: "Quiz is locked. Complete all required lessons to unlock the quiz." },
              { status: 403 }
            );
          }
        }
      }
    }

    const questions = await run(
      supabase
        .from("questions")
        .select("id, text, options, correct_answer, explanation, difficulty, topic, sub_topic, school_id, order, created_at")
        .eq("quiz_id", id)
        .order("order")
    );

    return NextResponse.json({
      id: quiz.id,
      subjectId: quiz.subject_id,
      moduleId: quiz.module_id,
      title: quiz.title,
      description: quiz.description,
      difficulty: quiz.difficulty,
      timeLimit: quiz.time_limit,
      createdBy: quiz.created_by,
      schoolId: quiz.school_id,
      isBank: quiz.is_bank,
      isPublished: Boolean(quiz.is_published),
      createdAt: quiz.created_at,
      updatedAt: quiz.updated_at,
      questions: questions.map((question) => ({
        id: question.id,
        text: question.text,
        options: question.options,
        order: question.order,
        explanation: question.explanation,
        difficulty: question.difficulty,
        topic: question.topic,
        subTopic: question.sub_topic,
        schoolId: question.school_id,
        createdAt: question.created_at,
        ...(includeAnswers ? { correctAnswer: question.correct_answer } : {}),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { isPublished, moduleId, title, description, difficulty, timeLimit } = body;

    const updateData = { updated_at: nowIso() };
    if (typeof isPublished === "boolean") updateData.is_published = isPublished;
    if (moduleId !== undefined) updateData.module_id = moduleId || null;
    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (difficulty) updateData.difficulty = difficulty;
    if (typeof timeLimit === "number") updateData.time_limit = timeLimit;

    const updatedQuiz = await runSingle(
      supabase
        .from("quizzes")
        .update(updateData)
        .eq("id", id)
        .select("id, subject_id, module_id, title, description, difficulty, time_limit, created_by, school_id, is_bank, is_published, created_at, updated_at")
        .single()
    );

    return NextResponse.json({
      success: true,
      quiz: {
        id: updatedQuiz.id,
        subjectId: updatedQuiz.subject_id,
        moduleId: updatedQuiz.module_id,
        title: updatedQuiz.title,
        description: updatedQuiz.description,
        difficulty: updatedQuiz.difficulty,
        timeLimit: updatedQuiz.time_limit,
        createdBy: updatedQuiz.created_by,
        schoolId: updatedQuiz.school_id,
        isBank: updatedQuiz.is_bank,
        isPublished: Boolean(updatedQuiz.is_published),
        createdAt: updatedQuiz.created_at,
        updatedAt: updatedQuiz.updated_at,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}

export async function PUT(request, context) {
  return PATCH(request, context);
}
