import { NextResponse } from "next/server";
import {
  supabase,
  run,
  runSingle,
  requireUserRole,
  ensureTeacher,
} from "../../_utils/supabase";

export const runtime = "nodejs";

function normalizeDifficulty(value) {
  const normalized = String(value || "medium").toLowerCase();
  return ["easy", "medium", "hard"].includes(normalized) ? normalized : "medium";
}

function sanitizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => (typeof option === "string" ? option.trim() : String(option || "")))
    .filter((option) => option.length > 0);
}

export async function PUT(request, context) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const {
      updatedBy,
      text,
      options,
      correctAnswer,
      explanation,
      difficulty,
      topic,
      subTopic,
      order,
    } = payload || {};

    if (!updatedBy) {
      return NextResponse.json({ error: "updatedBy is required" }, { status: 400 });
    }

    const updater = await requireUserRole(updatedBy);
    ensureTeacher(updater);

    const question = await runSingle(
      supabase
        .from("questions")
        .select("id, quiz_id, school_id")
        .eq("id", id)
        .maybeSingle()
    );

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    if (question.school_id && updater.school_id && question.school_id !== updater.school_id) {
      return NextResponse.json({ error: "Cannot modify questions from a different school" }, { status: 403 });
    }

    const updates = {};

    if (typeof text === "string" && text.trim().length > 0) {
      updates.text = text.trim();
    }

    if (Array.isArray(options)) {
      const normalizedOptions = sanitizeOptions(options);
      if (normalizedOptions.length < 2) {
        return NextResponse.json({ error: "Provide at least two options" }, { status: 400 });
      }
      updates.options = normalizedOptions;
      if (correctAnswer && !normalizedOptions.includes(correctAnswer)) {
        return NextResponse.json({ error: "correctAnswer must be one of the options" }, { status: 400 });
      }
    }

    if (typeof correctAnswer === "string" && correctAnswer.length > 0) {
      updates.correct_answer = correctAnswer;
    }

    if (typeof explanation === "string") {
      updates.explanation = explanation.trim();
    }

    if (difficulty) {
      updates.difficulty = normalizeDifficulty(difficulty);
    }

    if (typeof topic === "string") {
      updates.topic = topic.trim();
    }

    if (typeof subTopic === "string") {
      updates.sub_topic = subTopic.trim();
    }

    if (typeof order === "number") {
      updates.order = order;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("questions")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      question: {
        id: data.id,
        quizId: data.quiz_id,
        text: data.text,
        options: data.options,
        correctAnswer: data.correct_answer,
        explanation: data.explanation,
        difficulty: data.difficulty,
        topic: data.topic,
        subTopic: data.sub_topic,
        schoolId: data.school_id,
        order: data.order,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const deletedBy = searchParams.get("deletedBy");

    if (!deletedBy) {
      return NextResponse.json({ error: "deletedBy is required" }, { status: 400 });
    }

    const deleter = await requireUserRole(deletedBy);
    ensureTeacher(deleter);

    const question = await runSingle(
      supabase
        .from("questions")
        .select("id, school_id")
        .eq("id", id)
        .maybeSingle()
    );

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    if (question.school_id && deleter.school_id && question.school_id !== deleter.school_id) {
      return NextResponse.json({ error: "Cannot delete questions from a different school" }, { status: 403 });
    }

    await run(supabase.from("questions").delete().eq("id", id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
