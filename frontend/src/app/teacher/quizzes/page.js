"use client";
import { useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import { fetchUserRole } from "@/lib/users";
import { useSubjects, useQuizzes, useQuizQuestions } from "@/hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "@teacher/components/ui/card";
import { Input } from "@teacher/components/ui/input";
import { Textarea } from "@teacher/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@teacher/components/ui/select";
import { Button } from "@teacher/components/ui/button";
import { Badge } from "@teacher/components/ui/badge";
import { Separator } from "@teacher/components/ui/separator";
import { Loader2, PlusCircle, Pencil, Trash2 } from "lucide-react";

const difficultyOptions = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const createDefaultQuizForm = () => ({
  title: "",
  subjectId: "",
  difficulty: "medium",
  timeLimit: 300,
  description: "",
  isBank: false,
});

const createDefaultQuestionForm = () => ({
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
  difficulty: "medium",
  topic: "",
  subTopic: "",
});

function QuizManager() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [roleDoc, setRoleDoc] = useState(null);
  const [roleError, setRoleError] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [quizForm, setQuizForm] = useState(() => createDefaultQuizForm());
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizMessage, setQuizMessage] = useState(null);
  const [quizError, setQuizError] = useState(null);
  const [selectedQuizId, setSelectedQuizId] = useState(null);

  const [questionForm, setQuestionForm] = useState(() => createDefaultQuestionForm());
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [questionMessage, setQuestionMessage] = useState(null);
  const [questionError, setQuestionError] = useState(null);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user?.id) {
      setRoleDoc(null);
      setRoleError(null);
      setRoleLoading(false);
      return;
    }
    let active = true;
    setRoleLoading(true);
    setRoleError(null);
    fetchUserRole(user.id)
      .then((doc) => {
        if (!active) return;
        setRoleDoc(doc);
      })
      .catch((error) => {
        if (!active) return;
        setRoleDoc(null);
        setRoleError(error?.message || "Unable to load role");
      })
      .finally(() => {
        if (active) setRoleLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, user?.id]);

  const schoolId = roleDoc?.schoolId || roleDoc?.school_id || null;
  const role = typeof roleDoc === "string" ? roleDoc : roleDoc?.role;

  const {
    subjects,
    loading: subjectsLoading,
    error: subjectsError,
  } = useSubjects(schoolId ? { schoolId } : {});

  const subjectsById = useMemo(() => {
    const map = new Map();
    subjects.forEach((subject) => {
      map.set(subject.id, subject.name);
    });
    return map;
  }, [subjects]);

  const {
    quizzes,
    loading: quizzesLoading,
    error: quizzesError,
    fetchQuizzes,
    createQuiz,
  } = useQuizzes({ schoolId, createdBy: user?.id });

  const selectedQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === selectedQuizId) || null,
    [quizzes, selectedQuizId]
  );

  const {
    questions,
    loading: questionsLoading,
    error: questionsError,
    addQuestion,
    updateQuestion,
    removeQuestion,
  } = useQuizQuestions(selectedQuizId ? { quizId: selectedQuizId, includeAnswers: true } : {});

  useEffect(() => {
    if (!selectedQuizId && quizzes.length) {
      setSelectedQuizId(quizzes[0].id);
    }
  }, [quizzes, selectedQuizId]);

  const handleQuizFieldChange = (field, value) => {
    setQuizForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateQuiz = async (event) => {
    event.preventDefault();
    if (!user?.id) return;
    if (!quizForm.title.trim() || !quizForm.subjectId) {
      setQuizError("Title and subject are required");
      return;
    }

    try {
      setQuizSubmitting(true);
      setQuizError(null);
      setQuizMessage(null);
      const payload = {
        subjectId: quizForm.subjectId,
        title: quizForm.title.trim(),
        description: quizForm.description.trim() || null,
        difficulty: quizForm.difficulty,
        timeLimit: Number.parseInt(quizForm.timeLimit, 10) || 300,
        createdBy: user.id,
        isBank: quizForm.isBank,
      };
      const result = await createQuiz(payload);
      setQuizMessage("Quiz created successfully");
      setQuizForm(createDefaultQuizForm());
      await fetchQuizzes();
      if (result?.id) {
        setSelectedQuizId(result.id);
      }
    } catch (error) {
      setQuizError(error?.message || "Unable to create quiz");
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleQuestionOptionChange = (index, value) => {
    setQuestionForm((prev) => {
      const next = [...prev.options];
      next[index] = value;
      return { ...prev, options: next };
    });
  };

  const resetQuestionForm = () => {
    setQuestionForm(createDefaultQuestionForm());
    setEditingQuestionId(null);
    setQuestionError(null);
    setQuestionMessage(null);
  };

  const startEditQuestion = (question) => {
    setQuestionForm({
      text: question.text || "",
      options: Array.isArray(question.options) && question.options.length ? question.options : ["", "", "", ""],
      correctIndex: Math.max(0, question.options?.findIndex((option) => option === question.correctAnswer)),
      explanation: question.explanation || "",
      difficulty: question.difficulty || "medium",
      topic: question.topic || "",
      subTopic: question.subTopic || "",
    });
    setEditingQuestionId(question.id);
    setQuestionMessage(null);
    setQuestionError(null);
  };

  const handleSubmitQuestion = async (event) => {
    event.preventDefault();
    if (!user?.id || !selectedQuizId) return;
    const cleanedOptions = questionForm.options.map((option) => option.trim()).filter(Boolean);
    if (cleanedOptions.length < 2) {
      setQuestionError("Provide at least two options");
      return;
    }
    const correctAnswer = cleanedOptions[Math.min(questionForm.correctIndex, cleanedOptions.length - 1)];
    if (!correctAnswer) {
      setQuestionError("Select the correct answer");
      return;
    }

    try {
      setQuestionSubmitting(true);
      setQuestionError(null);
      setQuestionMessage(null);
      const payload = {
        text: questionForm.text.trim(),
        options: cleanedOptions,
        correctAnswer,
        explanation: questionForm.explanation.trim() || null,
        difficulty: questionForm.difficulty,
        topic: questionForm.topic.trim() || null,
        subTopic: questionForm.subTopic.trim() || null,
      };

      if (editingQuestionId) {
        await updateQuestion(editingQuestionId, { ...payload, updatedBy: user.id });
        setQuestionMessage("Question updated");
      } else {
        await addQuestion({ ...payload, createdBy: user.id, quizId: selectedQuizId });
        setQuestionMessage("Question added");
      }

      resetQuestionForm();
    } catch (error) {
      setQuestionError(error?.message || "Unable to save question");
    } finally {
      setQuestionSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!user?.id) return;
    try {
      await removeQuestion(id, user.id);
      setQuestionMessage("Question deleted");
    } catch (error) {
      setQuestionError(error?.message || "Unable to delete question");
    }
  };

  if (!isSignedIn) {
    return null;
  }

  if (roleLoading) {
    return <div className="max-w-6xl mx-auto text-white/90">Loading teacher profile...</div>;
  }

  if (roleError) {
    return (
      <Card className="max-w-xl mx-auto bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          <div className="text-lg font-semibold mb-2">Unable to load teacher data</div>
          <div>{roleError}</div>
        </CardContent>
      </Card>
    );
  }

  if (!role || !["teacher", "admin"].includes(role)) {
    return (
      <Card className="max-w-xl mx-auto bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          <div className="text-lg font-semibold mb-2">Access Denied</div>
          <div>You need teacher or admin privileges to manage quizzes.</div>
        </CardContent>
      </Card>
    );
  }

  if (!schoolId) {
    return (
      <Card className="max-w-xl mx-auto bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          <div className="text-lg font-semibold mb-2">School not linked</div>
          <div>Assign a school to this teacher account to create quizzes.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-white/90 font-semibold text-2xl">Quizzes</div>

      <Card className="bg-white/95 border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900 text-lg flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-violet-600" />
            Create new quiz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCreateQuiz}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quiz title</label>
                <Input
                  value={quizForm.title}
                  onChange={(event) => handleQuizFieldChange("title", event.target.value)}
                  placeholder="e.g. Algebra fundamentals"
                  className="bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <Select
                  value={quizForm.subjectId}
                  onValueChange={(value) => handleQuizFieldChange("subjectId", value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={subjectsLoading ? "Loading subjects..." : "Select subject"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {subjectsError && <div className="text-sm text-red-600">{subjectsError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                <Select
                  value={quizForm.difficulty}
                  onValueChange={(value) => handleQuizFieldChange("difficulty", value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time limit (seconds)</label>
                <Input
                  type="number"
                  min={30}
                  step={30}
                  value={quizForm.timeLimit}
                  onChange={(event) => handleQuizFieldChange("timeLimit", event.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  id="isBank"
                  type="checkbox"
                  checked={quizForm.isBank}
                  onChange={(event) => handleQuizFieldChange("isBank", event.target.checked)}
                  className="h-4 w-4 border-slate-300"
                />
                <label htmlFor="isBank" className="text-sm text-slate-700">Mark as question bank</label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <Textarea
                value={quizForm.description}
                onChange={(event) => handleQuizFieldChange("description", event.target.value)}
                placeholder="What will students learn from this quiz?"
                className="bg-white"
                rows={3}
              />
            </div>

            {quizError && <div className="text-sm text-red-600">{quizError}</div>}
            {quizMessage && <div className="text-sm text-emerald-600">{quizMessage}</div>}

            <Button type="submit" disabled={quizSubmitting} className="bg-violet-600 hover:bg-violet-700">
              {quizSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </span>
              ) : (
                "Create quiz"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-white/95 border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900 text-lg">Manage quizzes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {quizzesError && <div className="text-sm text-red-600">{quizzesError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzesLoading && !quizzes.length ? (
              <div className="py-8 text-center text-slate-500 md:col-span-2">Loading quizzes...</div>
            ) : quizzes.length ? (
              quizzes.map((quiz) => (
                <Card
                  key={quiz.id}
                  className={`border ${selectedQuizId === quiz.id ? "border-violet-500" : "border-slate-200"} cursor-pointer`}
                  onClick={() => setSelectedQuizId(quiz.id)}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{quiz.title}</div>
                        <div className="text-xs text-slate-500">{subjectsById.get(quiz.subjectId) || "Unknown subject"}</div>
                      </div>
                      <Badge className="bg-violet-100 text-violet-700 border border-violet-200 uppercase">{quiz.difficulty}</Badge>
                    </div>
                    {quiz.description && <p className="text-sm text-slate-600">{quiz.description}</p>}
                    <div className="text-xs text-slate-500">Updated {new Date(quiz.updatedAt || quiz.createdAt).toLocaleString()}</div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="py-8 text-center text-slate-500 md:col-span-2">
                No quizzes yet. Create one above to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedQuiz && (
        <Card className="bg-white/95 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900 text-lg">Questions for {selectedQuiz.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={handleSubmitQuestion}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Question text</label>
                <Textarea
                  value={questionForm.text}
                  onChange={(event) => setQuestionForm((prev) => ({ ...prev, text: event.target.value }))}
                  placeholder="Enter the full question"
                  className="bg-white"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {questionForm.options.map((option, index) => (
                  <div key={index} className="space-y-1">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={questionForm.correctIndex === index}
                        onChange={() => setQuestionForm((prev) => ({ ...prev, correctIndex: index }))}
                        className="h-4 w-4"
                      />
                      Option {String.fromCharCode(65 + index)}
                    </label>
                    <Input
                      value={option}
                      onChange={(event) => handleQuestionOptionChange(index, event.target.value)}
                      placeholder="Answer option"
                      className="bg-white"
                      required={index < 2}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                  <Select
                    value={questionForm.difficulty}
                    onValueChange={(value) => setQuestionForm((prev) => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                  <Input
                    value={questionForm.topic}
                    onChange={(event) => setQuestionForm((prev) => ({ ...prev, topic: event.target.value }))}
                    placeholder="e.g. Algebra"
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sub-topic</label>
                  <Input
                    value={questionForm.subTopic}
                    onChange={(event) => setQuestionForm((prev) => ({ ...prev, subTopic: event.target.value }))}
                    placeholder="e.g. Linear equations"
                    className="bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Explanation (optional)</label>
                <Textarea
                  value={questionForm.explanation}
                  onChange={(event) => setQuestionForm((prev) => ({ ...prev, explanation: event.target.value }))}
                  placeholder="Explain the correct answer"
                  className="bg-white"
                  rows={2}
                />
              </div>

              {questionError && <div className="text-sm text-red-600">{questionError}</div>}
              {questionMessage && <div className="text-sm text-emerald-600">{questionMessage}</div>}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={questionSubmitting} className="bg-violet-600 hover:bg-violet-700">
                  {questionSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </span>
                  ) : editingQuestionId ? (
                    "Update question"
                  ) : (
                    "Add question"
                  )}
                </Button>
                {editingQuestionId && (
                  <Button type="button" variant="outline" onClick={resetQuestionForm}>
                    Cancel edit
                  </Button>
                )}
              </div>
            </form>

            <Separator />

            {questionsError && <div className="text-sm text-red-600">{questionsError}</div>}

            {questionsLoading && !questions.length ? (
              <div className="py-6 text-center text-slate-500">Loading questions...</div>
            ) : questions.length ? (
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <Card key={question.id} className="border border-slate-200">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm text-slate-500">Question {index + 1}</div>
                          <div className="font-semibold text-slate-900 whitespace-pre-wrap">{question.text}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-violet-100 text-violet-700 border border-violet-200 uppercase">{question.difficulty}</Badge>
                          {question.topic && (
                            <Badge className="bg-slate-100 text-slate-700 border border-slate-200">{question.topic}</Badge>
                          )}
                          {question.subTopic && (
                            <Badge className="bg-slate-100 text-slate-700 border border-slate-200">{question.subTopic}</Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 text-sm">
                        {question.options.map((option, optionIndex) => {
                          const isCorrect = option === question.correctAnswer;
                          return (
                            <div
                              key={`${question.id}:${optionIndex}`}
                              className={`px-3 py-2 rounded-lg border ${isCorrect ? "border-emerald-400 bg-emerald-50" : "border-slate-200"}`}
                            >
                              {option} {isCorrect && <span className="text-emerald-600 font-semibold ml-2">(Correct)</span>}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        {question.explanation && (
                          <div className="text-xs text-slate-500 max-w-2xl">Explanation: {question.explanation}</div>
                        )}
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEditQuestion(question)}>
                            <Pencil className="w-4 h-4 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteQuestion(question.id)}>
                            <Trash2 className="w-4 h-4 mr-1 text-red-600" /> Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500">
                No questions yet. Use the form above to add your first question.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function TeacherQuizzesPage() {
  return (
    <>
      <SignedIn>
        <QuizManager />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
