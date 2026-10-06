import { auth, currentUser } from "@clerk/nextjs/server";
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
import { normalizeClass } from "../_utils/quiz";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const moduleId = searchParams.get("moduleId");
    const createdBy = searchParams.get("createdBy");
    const classParam = searchParams.get("class");
    
    const authObj = await auth();
    const userId = authObj?.userId;
    let userRole = null;

    if (userId) {
      try {
        userRole = await runSingle(
          supabase.from("user_roles").select("user_id, school_id, class, role").eq("user_id", userId).maybeSingle()
        );
      } catch (e) {
        console.warn("[/api/quizzes] user_roles lookup error:", e.message);
      }
    }

    const isStudent = userRole?.role === "student";
    let studentClass = userRole?.class || classParam || null;

    if (userId && !studentClass) {
      try {
        const clerkUser = await currentUser();
        studentClass = clerkUser?.unsafeMetadata?.class || clerkUser?.publicMetadata?.class || null;
        if (studentClass && userRole) userRole.class = studentClass;
      } catch {}
    }

    let query = supabase
      .from("quizzes")
      .select(
        "id, subject_id, module_id, title, description, difficulty, time_limit, created_by, school_id, is_bank, is_published, created_at, updated_at, learning_modules(id, class, title, published), subjects(id, name)"
      )
      .order("created_at", { ascending: false });

    // Students only ever see published quizzes
    if (isStudent) {
      query = query.eq("is_published", true);
    }

    if (subjectId) query = query.eq("subject_id", subjectId);
    if (moduleId) query = query.eq("module_id", moduleId);
    if (createdBy) query = query.eq("created_by", createdBy);
    // NOTE: school_id filter is NOT applied for student quiz access; quizzes are class-based.

    const rawQuizzes = await run(query);
    const list = Array.isArray(rawQuizzes) ? rawQuizzes : [];

    // Filter by class if student or if classParam provided
    const targetClass = isStudent ? studentClass : (classParam || null);
    const filteredQuizzes = targetClass
      ? list.filter((quiz) => {
          const quizClass = quiz.learning_modules?.class || null;
          return normalizeClass(quizClass) === normalizeClass(targetClass);
        })
      : list;

    // For students, enrich each quiz with module lesson completion data
    if (isStudent && userId) {
      const moduleIds = Array.from(new Set(filteredQuizzes.map((q) => q.module_id).filter(Boolean)));
      
      let lessonsByModule = {};
      let allLessonIds = [];
      if (moduleIds.length > 0) {
        const activeLessons = await run(
          supabase
            .from("lessons")
            .select("id, module_id")
            .in("module_id", moduleIds)
            .or("published.eq.true,published.is.null")
        );
        if (Array.isArray(activeLessons)) {
          activeLessons.forEach((l) => {
            allLessonIds.push(l.id);
            if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = [];
            lessonsByModule[l.module_id].push(l.id);
          });
        }
      }

      let completedSet = new Set();
      if (allLessonIds.length > 0) {
        const completions = await run(
          supabase
            .from("lesson_progress")
            .select("lesson_id")
            .eq("student_id", userId)
            .eq("completed", true)
            .in("lesson_id", allLessonIds)
        );
        if (Array.isArray(completions)) {
          completions.forEach((c) => completedSet.add(c.lesson_id));
        }
      }

      const enriched = filteredQuizzes.map((quiz) => {
        const modId = quiz.module_id;
        const modLessonIds = modId && lessonsByModule[modId] ? lessonsByModule[modId] : [];
        const totalLessons = modLessonIds.length;
        const completedLessons = modLessonIds.filter((id) => completedSet.has(id)).length;
        const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        const isUnlocked = totalLessons > 0 && completedLessons === totalLessons;

        let state = "UNLOCKED";
        let message = null;
        if (totalLessons === 0) {
          state = "NO_LESSONS";
          message = "No lessons published for this module yet.";
        } else if (!isUnlocked) {
          state = "LESSONS_INCOMPLETE";
          message = `Complete all ${totalLessons} lessons to unlock the quiz.`;
        }

        return {
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
          // Progress & unlock status for student
          isUnlocked,
          unlocked: isUnlocked,
          state,
          message,
          totalLessons,
          completedLessons,
          progress,
        };
      });

      return NextResponse.json(enriched, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
      });
    }

    // Default response (teachers/admin)
    return NextResponse.json(
      filteredQuizzes.map((quiz) => ({
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
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" },
      }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      subjectId,
      moduleId = null,
      title,
      description,
      difficulty = "medium",
      timeLimit = 300,
      createdBy,
      questions = [],
      isBank = false,
      isPublished = false,
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
      module_id: moduleId || null,
      title,
      description: description || "",
      difficulty,
      time_limit: timeLimit,
      created_by: createdBy,
      school_id: creator.school_id || null,
      is_bank: Boolean(isBank),
      is_published: Boolean(isPublished),
      created_at: now,
      updated_at: now,
    };

    await run(supabase.from("quizzes").insert(quizDoc));

    if (Array.isArray(questions) && questions.length > 0) {
      const questionDocs = questions.map((question, index) => {
        const normalizedOptions = Array.isArray(question.options)
          ? question.options.map((option) => (typeof option === "string" ? option.trim() : String(option))).filter(Boolean)
          : [];
        if (!normalizedOptions.length) {
          throw new Error("Each question must include at least one option");
        }
        const difficultyValue = (question.difficulty || "medium").toLowerCase();
        const allowedDifficulty = ["easy", "medium", "hard"].includes(difficultyValue)
          ? difficultyValue
          : "medium";
        return {
          id: `${quizId}:question:${index + 1}`,
          quiz_id: quizId,
          text: question.text,
          options: normalizedOptions,
          correct_answer: question.correctAnswer,
          explanation: question.explanation || "",
          difficulty: allowedDifficulty,
          topic: question.topic || null,
          sub_topic: question.subTopic || null,
          school_id: creator.school_id || null,
          order: index + 1,
          created_at: nowIso(),
        };
      });
      await run(supabase.from("questions").insert(questionDocs));
    }

    broadcast("quiz.created", { id: quizId, subjectId: quizDoc.subject_id, schoolId: quizDoc.school_id });

    return NextResponse.json({
      success: true,
      id: quizId,
      quiz: {
        id: quizId,
        subjectId: quizDoc.subject_id,
        moduleId: quizDoc.module_id,
        title: quizDoc.title,
        description: quizDoc.description,
        difficulty: quizDoc.difficulty,
        timeLimit: quizDoc.time_limit,
        createdBy: quizDoc.created_by,
        isPublished: quizDoc.is_published,
        createdAt: quizDoc.created_at,
        questionsCount: Array.isArray(questions) ? questions.length : 0,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
