import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, run, runSingle, nowIso } from "../../_utils/supabase";
import { canStudentAccessQuiz } from "../../_utils/quiz";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const includeAnswers = String(new URL(request.url).searchParams.get("includeAnswers") || "false").toLowerCase() === "true";

    const quiz = await runSingle(
      supabase
        .from("quizzes")
        .select("id, subject_id, module_id, title, description, difficulty, time_limit, created_by, school_id, is_bank, is_published, created_at, updated_at, learning_modules(id, class, title, published), subjects(id, name)")
        .eq("id", id)
        .maybeSingle()
    );

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const authObj = await auth();
    const userId = authObj?.userId;

    let userRole = null;
    if (userId) {
      try {
        userRole = await runSingle(
          supabase.from("user_roles").select("user_id, role, class, school_id, name").eq("user_id", userId).maybeSingle()
        );
      } catch (e) {
        console.warn("[/api/quizzes/[id]] user_roles lookup error:", e.message);
      }

      if (userRole && !userRole.class) {
        try {
          const clerkUser = await currentUser();
          if (clerkUser?.unsafeMetadata?.class) {
            userRole.class = clerkUser.unsafeMetadata.class;
          }
        } catch {}
      }
    }

    const isStudent = userRole?.role === "student" || (!userRole?.role || userRole.role === "unassigned");
    const isTeacher = userRole?.role === "teacher" || userRole?.role === "admin";

    // Enforce server-side security check for students
    if (!isTeacher && userId) {
      const access = await canStudentAccessQuiz({
        studentId: userId,
        quizId: id,
        userRoleDoc: userRole,
      });

      if (!access.allowed) {
        return NextResponse.json(
          {
            allowed: false,
            error: access.error,
            reason: access.reason,
            completedLessons: access.completedLessons ?? 0,
            totalLessons: access.totalLessons ?? 0,
            progress: access.progress ?? 0,
            quiz: access.quiz ?? {
              id: quiz.id,
              title: quiz.title,
              description: quiz.description,
              quizClass: quiz.learning_modules?.class || null,
              moduleTitle: quiz.learning_modules?.title || null,
              subjectName: quiz.subjects?.name || null,
            },
          },
          { status: 403 }
        );
      }
    } else if (!isTeacher && !userId) {
      return NextResponse.json({ error: "Unauthorized: Sign in required" }, { status: 401 });
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
      subjectName: quiz.subjects?.name || null,
      moduleId: quiz.module_id,
      moduleTitle: quiz.learning_modules?.title || null,
      className: quiz.learning_modules?.class || null,
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
