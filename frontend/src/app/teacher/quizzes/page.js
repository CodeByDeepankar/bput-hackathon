"use client";
import { useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import { fetchUserRole } from "@/lib/users";
import { useSubjects, useQuizzes, useQuizQuestions, useTeacherModules } from "@/hooks/useApi";
import { getQuizResults } from "@/lib/api";
import { normalizeClass } from "@/app/api/_utils/quiz";
import { Card, CardContent, CardHeader, CardTitle } from "@teacher/components/ui/card";
import { Input } from "@teacher/components/ui/input";
import { Textarea } from "@teacher/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@teacher/components/ui/select";
import { Button } from "@teacher/components/ui/button";
import { Badge } from "@teacher/components/ui/badge";
import { Separator } from "@teacher/components/ui/separator";
import {
  Loader2,
  PlusCircle,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  Award,
  Users,
  CheckCircle2,
  X,
  FileQuestion,
  HelpCircle,
  Clock,
} from "lucide-react";

const SCHOOL_CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);

const difficultyOptions = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const selectTriggerClass =
  "bg-white border border-slate-200 focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/20 text-slate-800 rounded-lg";
const selectContentClass = "bg-white border border-slate-200 shadow-lg rounded-lg";

const createDefaultQuizForm = () => ({
  title: "",
  targetClass: "Class 5",
  subjectId: "",
  moduleId: "none",
  difficulty: "medium",
  timeLimit: 300,
  description: "",
  isBank: false,
  isPublished: false,
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

  // Results viewing modal state
  const [viewingResultsQuiz, setViewingResultsQuiz] = useState(null);
  const [resultsList, setResultsList] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState(null);

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

  // Fetch subjects dynamically from system
  const {
    subjects,
    loading: subjectsLoading,
    error: subjectsError,
    fetchSubjects: refreshSubjects,
  } = useSubjects({ enabled: true });

  // Fetch modules from teacher modules
  const { modules: teacherModules, loading: modulesLoading } = useTeacherModules();

  // Quizzes for teacher (by createdBy)
  const {
    quizzes,
    loading: quizzesLoading,
    error: quizzesError,
    fetchQuizzes,
    createQuiz,
  } = useQuizzes({ createdBy: user?.id });

  // Filter modules matching current target class
  const classModules = useMemo(() => {
    if (!Array.isArray(teacherModules)) return [];
    const targetNorm = normalizeClass(quizForm.targetClass);
    return teacherModules.filter((m) => {
      const modNorm = normalizeClass(m.class);
      return !modNorm || modNorm === targetNorm;
    });
  }, [teacherModules, quizForm.targetClass]);

  // Modules matching target class AND selected subject (or all class modules as fallback)
  const availableModules = useMemo(() => {
    if (!quizForm.subjectId) return classModules;
    const matchingSubject = classModules.filter(
      (m) => m.subject_id === quizForm.subjectId || m.subjectId === quizForm.subjectId
    );
    return matchingSubject.length > 0 ? matchingSubject : classModules;
  }, [classModules, quizForm.subjectId]);

  const subjectsById = useMemo(() => {
    const map = new Map();
    (subjects || []).forEach((subject) => {
      map.set(subject.id, subject.name);
    });
    return map;
  }, [subjects]);

  const modulesById = useMemo(() => {
    const map = new Map();
    (teacherModules || []).forEach((m) => {
      map.set(m.id, m);
    });
    return map;
  }, [teacherModules]);

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
    setQuizForm((prev) => {
      const next = { ...prev, [field]: value };
      // Reset module if class changes and module doesn't match
      if (field === "targetClass" && prev.moduleId !== "none") {
        const currentMod = modulesById.get(prev.moduleId);
        if (currentMod && normalizeClass(currentMod.class) !== normalizeClass(value)) {
          next.moduleId = "none";
        }
      }
      return next;
    });
  };

  const handleTogglePublishQuiz = async (e, quiz) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !quiz.isPublished }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to update publish status");
      }
      await fetchQuizzes();
    } catch (err) {
      alert("Failed to update quiz publish status: " + err.message);
    }
  };

  const handleCreateQuiz = async (event) => {
    event.preventDefault();
    if (!user?.id) return;
    if (!quizForm.title.trim() || !quizForm.subjectId) {
      setQuizError("Quiz title and subject are required");
      return;
    }

    if (quizForm.moduleId === "none") {
      setQuizError("Please select a Learning Module. Every quiz must belong to a learning module.");
      return;
    }

    try {
      setQuizSubmitting(true);
      setQuizError(null);
      setQuizMessage(null);

      const payload = {
        subjectId: quizForm.subjectId,
        moduleId: quizForm.moduleId,
        title: quizForm.title.trim(),
        description: quizForm.description.trim() || null,
        difficulty: quizForm.difficulty,
        timeLimit: Number.parseInt(quizForm.timeLimit, 10) || 300,
        createdBy: user.id,
        isBank: quizForm.isBank,
        isPublished: quizForm.isPublished,
      };

      const result = await createQuiz(payload);
      setQuizMessage("Quiz created successfully! Now add questions below.");
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

  const openResultsModal = async (e, quiz) => {
    e.stopPropagation();
    setViewingResultsQuiz(quiz);
    setResultsLoading(true);
    setResultsError(null);
    setResultsList([]);
    try {
      const data = await getQuizResults(quiz.id);
      setResultsList(Array.isArray(data?.results) ? data.results : []);
    } catch (err) {
      setResultsError(err?.message || "Failed to load student results");
    } finally {
      setResultsLoading(false);
    }
  };

  const closeResultsModal = () => {
    setViewingResultsQuiz(null);
    setResultsList([]);
    setResultsError(null);
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
        setQuestionMessage("Question updated successfully");
      } else {
        await addQuestion({ ...payload, createdBy: user.id, quizId: selectedQuizId });
        setQuestionMessage("Question added successfully");
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
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#635BFF]" />
      </div>
    );
  }

  if (roleError) {
    return (
      <Card className="max-w-xl mx-auto my-12 bg-white border-slate-200 shadow-sm">
        <CardContent className="p-6 text-center text-slate-700 space-y-2">
          <div className="text-lg font-bold text-red-600">Unable to load teacher profile</div>
          <div className="text-sm text-slate-500">{roleError}</div>
        </CardContent>
      </Card>
    );
  }

  if (!role || !["teacher", "admin"].includes(role)) {
    return (
      <Card className="max-w-xl mx-auto my-12 bg-white border-slate-200 shadow-sm">
        <CardContent className="p-6 text-center text-slate-700 space-y-2">
          <div className="text-lg font-bold text-slate-900">Access Denied</div>
          <div className="text-sm text-slate-500">You need teacher privileges to create and manage quizzes.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] py-8">
      <div className="max-w-6xl mx-auto space-y-6 px-4 lg:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#172033]">Quizzes</h1>
            <p className="text-sm text-[#64748B]">
              Create and manage class-based assessments for school students (Classes 1–12)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#635BFF]/10 text-[#635BFF] border-0 px-3 py-1 text-xs font-semibold">
              <GraduationCap className="w-3.5 h-3.5 mr-1" /> K-12 School LMS
            </Badge>
          </div>
        </div>

        {/* Create New Quiz Card */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs rounded-xl overflow-hidden">
          <CardHeader className="bg-white border-b border-[#E2E8F0] py-4 px-6">
            <CardTitle className="text-[#172033] text-base font-bold flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#635BFF]" />
              Create New Quiz
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form className="space-y-5" onSubmit={handleCreateQuiz}>
              {/* Row 1: Quiz Title, Class, Subject */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-5">
                  <label className="block text-xs font-semibold text-[#172033] mb-1.5">Quiz Title *</label>
                  <Input
                    value={quizForm.title}
                    onChange={(e) => handleQuizFieldChange("title", e.target.value)}
                    placeholder="e.g. Fractions Assessment"
                    className="bg-white border-[#E2E8F0] focus:border-[#635BFF] rounded-lg"
                    required
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-[#172033] mb-1.5">Target Class *</label>
                  <Select
                    value={quizForm.targetClass}
                    onValueChange={(val) => handleQuizFieldChange("targetClass", val)}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      {SCHOOL_CLASSES.map((cls) => (
                        <SelectItem key={cls} value={cls}>
                          {cls}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-[#172033] mb-1.5">Subject *</label>
                  <Select
                    value={quizForm.subjectId}
                    onValueChange={(val) => handleQuizFieldChange("subjectId", val)}
                    disabled={subjectsLoading}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue
                        placeholder={
                          subjectsLoading
                            ? "Loading subjects..."
                            : (subjects || []).length
                              ? "Select Subject"
                              : "No subjects available"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      {(subjects || []).map((subj) => (
                        <SelectItem key={subj.id} value={subj.id}>
                          {subj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {subjectsError && <div className="text-xs text-red-600">{subjectsError}</div>}

              {/* Row 2: Learning Module, Difficulty, Time limit */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-6">
                  <label className="block text-xs font-semibold text-[#172033] mb-1.5 flex items-center justify-between">
                    <span>Learning Module *</span>
                    <span className="text-[11px] font-normal text-[#64748B]">
                      Filtered for {quizForm.targetClass}
                    </span>
                  </label>
                  <Select
                    value={quizForm.moduleId}
                    onValueChange={(val) => handleQuizFieldChange("moduleId", val)}
                    disabled={modulesLoading}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Select Learning Module" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      <SelectItem value="none">-- Select a Learning Module --</SelectItem>
                      {availableModules.map((mod) => (
                        <SelectItem key={mod.id} value={mod.id}>
                          {mod.title} ({mod.class || quizForm.targetClass})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableModules.length === 0 && !modulesLoading && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      No learning modules found for {quizForm.targetClass}. Create a module in &quot;Modules &amp; Lessons&quot; first.
                    </p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-[#172033] mb-1.5">Difficulty</label>
                  <Select
                    value={quizForm.difficulty}
                    onValueChange={(val) => handleQuizFieldChange("difficulty", val)}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      {difficultyOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-[#172033] mb-1.5">Time Limit (seconds)</label>
                  <Input
                    type="number"
                    min={30}
                    step={30}
                    value={quizForm.timeLimit}
                    onChange={(e) => handleQuizFieldChange("timeLimit", e.target.value)}
                    className="bg-white border-[#E2E8F0] focus:border-[#635BFF] rounded-lg"
                  />
                </div>
              </div>

              {/* Row 3: Description */}
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1.5">Description (optional)</label>
                <Textarea
                  value={quizForm.description}
                  onChange={(e) => handleQuizFieldChange("description", e.target.value)}
                  placeholder="What will students learn from this assessment?"
                  className="bg-white border-[#E2E8F0] focus:border-[#635BFF] rounded-lg"
                  rows={2}
                />
              </div>

              {/* Checkboxes & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#E2E8F0]">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      id="isPublished"
                      type="checkbox"
                      checked={quizForm.isPublished}
                      onChange={(e) => handleQuizFieldChange("isPublished", e.target.checked)}
                      className="h-4 w-4 rounded border-[#CBD5E1] text-[#635BFF] focus:ring-[#635BFF]"
                    />
                    <span className="font-semibold text-emerald-700">Release / Publish Quiz to Students</span>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={quizSubmitting}
                  className="bg-[#635BFF] hover:bg-[#5148E5] text-white font-medium px-6 rounded-lg shadow-xs"
                >
                  {quizSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                    </span>
                  ) : (
                    "Create Quiz"
                  )}
                </Button>
              </div>

              {quizError && <div className="text-xs text-red-600 font-medium">{quizError}</div>}
              {quizMessage && <div className="text-xs text-emerald-600 font-medium">{quizMessage}</div>}
            </form>
          </CardContent>
        </Card>

        {/* My Quizzes Management List */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs rounded-xl overflow-hidden">
          <CardHeader className="bg-white border-b border-[#E2E8F0] py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-[#172033] text-base font-bold">My Quizzes</CardTitle>
            <Badge variant="outline" className="text-xs text-[#64748B] border-[#E2E8F0]">
              {quizzes.length} {quizzes.length === 1 ? "Quiz" : "Quizzes"}
            </Badge>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {quizzesError && <div className="text-xs text-red-600">{quizzesError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzesLoading && !quizzes.length ? (
                <div className="py-12 text-center text-slate-400 md:col-span-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#635BFF] mb-2" />
                  Loading your quizzes...
                </div>
              ) : quizzes.length ? (
                quizzes.map((quiz) => {
                  const mod = quiz.moduleId ? modulesById.get(quiz.moduleId) : null;
                  const quizClass = quiz.className || mod?.class || "K-12";
                  const subjectName = quiz.subjectName || subjectsById.get(quiz.subjectId) || "Subject";
                  const isSelected = selectedQuizId === quiz.id;

                  return (
                    <div
                      key={quiz.id}
                      onClick={() => setSelectedQuizId(quiz.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? "border-[#635BFF] bg-[#F1EEFF]/30 shadow-xs"
                          : "border-[#E2E8F0] bg-white hover:border-[#635BFF]/40 shadow-xs"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-[#172033] text-base hover:text-[#635BFF] transition-colors">
                            {quiz.title}
                          </h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge
                              className={`text-[10px] font-semibold uppercase ${
                                quiz.difficulty === "easy"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : quiz.difficulty === "hard"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {quiz.difficulty}
                            </Badge>
                            <Badge
                              className={
                                quiz.isPublished
                                  ? "bg-[#ECFDF3] text-[#22C55E] border-[#22C55E]/30 text-[10px] font-semibold"
                                  : "bg-slate-100 text-[#64748B] border-slate-200 text-[10px] font-semibold"
                              }
                            >
                              {quiz.isPublished ? "🔓 Published" : "🔒 Draft"}
                            </Badge>
                          </div>
                        </div>

                        <div className="text-xs font-semibold text-[#64748B] flex items-center gap-2 flex-wrap">
                          <span className="text-[#635BFF]">{quizClass}</span>
                          <span>•</span>
                          <span>{subjectName}</span>
                          {quiz.moduleId && (
                            <>
                              <span>•</span>
                              <span className="text-slate-700 font-medium">
                                Module: {quiz.moduleTitle || mod?.title || "Linked"}
                              </span>
                            </>
                          )}
                        </div>

                        {quiz.description && (
                          <p className="text-xs text-[#64748B] line-clamp-2">{quiz.description}</p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-xs">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{quiz.timeLimit ? `${Math.round(quiz.timeLimit / 60)} min` : "Self-paced"}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => openResultsModal(e, quiz)}
                            className="h-7 px-2 text-xs text-[#635BFF] hover:bg-[#F1EEFF] font-medium"
                          >
                            <Award className="w-3.5 h-3.5 mr-1" /> View Results
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleTogglePublishQuiz(e, quiz)}
                            className="h-7 px-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            {quiz.isPublished ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5 mr-1" /> Unpublish
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Publish
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-400 md:col-span-2">
                  No quizzes created yet. Use the form above to create your first class quiz.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Creation & Editor for Selected Quiz */}
        {selectedQuiz && (
          <Card className="bg-white border-[#E2E8F0] shadow-xs rounded-xl overflow-hidden">
            <CardHeader className="bg-white border-b border-[#E2E8F0] py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[#172033] text-base font-bold flex items-center gap-2">
                  <FileQuestion className="w-5 h-5 text-[#635BFF]" />
                  Questions for: <span className="text-[#635BFF]">{selectedQuiz.title}</span>
                </CardTitle>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Add multiple-choice questions for this quiz assessment
                </p>
              </div>
              <Badge variant="outline" className="text-xs text-[#64748B]">
                {questions.length} Questions
              </Badge>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Question Creation Form */}
              <form className="space-y-4" onSubmit={handleSubmitQuestion}>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1.5">Question Text *</label>
                  <Textarea
                    value={questionForm.text}
                    onChange={(e) => setQuestionForm((prev) => ({ ...prev, text: e.target.value }))}
                    placeholder="Enter the full question prompt"
                    className="bg-white border-[#E2E8F0] focus:border-[#635BFF] rounded-lg"
                    rows={2}
                    required
                  />
                </div>

                {/* 4 Options with radio selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {questionForm.options.map((option, index) => (
                    <div key={index} className="space-y-1">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={questionForm.correctIndex === index}
                          onChange={() => setQuestionForm((prev) => ({ ...prev, correctIndex: index }))}
                          className="h-3.5 w-3.5 text-[#635BFF] focus:ring-[#635BFF]"
                        />
                        <span>Option {String.fromCharCode(65 + index)}</span>
                        {questionForm.correctIndex === index && (
                          <span className="text-[11px] text-emerald-600 font-bold">(Correct Answer)</span>
                        )}
                      </label>
                      <Input
                        value={option}
                        onChange={(e) => handleQuestionOptionChange(index, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + index)} text`}
                        className="bg-white border-[#E2E8F0] focus:border-[#635BFF] rounded-lg"
                        required={index < 2}
                      />
                    </div>
                  ))}
                </div>

                {/* Difficulty, Topic, Sub-topic */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1.5">Difficulty</label>
                    <Select
                      value={questionForm.difficulty}
                      onValueChange={(val) => setQuestionForm((prev) => ({ ...prev, difficulty: val }))}
                    >
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={selectContentClass}>
                        {difficultyOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1.5">Topic (optional)</label>
                    <Input
                      value={questionForm.topic}
                      onChange={(e) => setQuestionForm((prev) => ({ ...prev, topic: e.target.value }))}
                      placeholder="e.g. Fractions"
                      className="bg-white border-[#E2E8F0] focus:border-[#635BFF] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1.5">Sub-topic (optional)</label>
                    <Input
                      value={questionForm.subTopic}
                      onChange={(e) => setQuestionForm((prev) => ({ ...prev, subTopic: e.target.value }))}
                      placeholder="e.g. Mixed fractions"
                      className="bg-white border-[#E2E8F0] focus:border-[#635BFF] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1.5">Explanation (optional)</label>
                  <Textarea
                    value={questionForm.explanation}
                    onChange={(e) => setQuestionForm((prev) => ({ ...prev, explanation: e.target.value }))}
                    placeholder="Explain why the correct answer is right (shown to students upon review)"
                    className="bg-white border-[#E2E8F0] focus:border-[#635BFF] rounded-lg"
                    rows={2}
                  />
                </div>

                {questionError && <div className="text-xs text-red-600 font-medium">{questionError}</div>}
                {questionMessage && <div className="text-xs text-emerald-600 font-medium">{questionMessage}</div>}

                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={questionSubmitting}
                    className="bg-[#635BFF] hover:bg-[#5148E5] text-white font-medium px-5 rounded-lg shadow-xs"
                  >
                    {questionSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </span>
                    ) : editingQuestionId ? (
                      "Update Question"
                    ) : (
                      "Add Question"
                    )}
                  </Button>
                  {editingQuestionId && (
                    <Button type="button" variant="outline" onClick={resetQuestionForm} className="rounded-lg">
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </form>

              <Separator className="bg-[#E2E8F0]" />

              {/* Questions List */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                  Existing Questions ({questions.length})
                </div>

                {questionsLoading && !questions.length ? (
                  <div className="py-6 text-center text-slate-400">Loading questions...</div>
                ) : questions.length ? (
                  questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F7F8FC]/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-bold text-[#64748B]">Question {index + 1}</span>
                          <h4 className="text-sm font-semibold text-[#172033] mt-0.5 whitespace-pre-wrap">
                            {question.text}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className="bg-[#635BFF]/10 text-[#635BFF] border-0 uppercase text-[10px]">
                            {question.difficulty}
                          </Badge>
                          {question.topic && (
                            <Badge variant="outline" className="text-[10px] text-[#64748B]">
                              {question.topic}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {(question.options || []).map((option, optIdx) => {
                          const isCorrect = option === question.correctAnswer;
                          return (
                            <div
                              key={optIdx}
                              className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between ${
                                isCorrect
                                  ? "border-emerald-300 bg-emerald-50/80 text-emerald-900 font-semibold"
                                  : "border-[#E2E8F0] bg-white text-slate-700"
                              }`}
                            >
                              <span>
                                <span className="font-bold mr-1.5">{String.fromCharCode(65 + optIdx)}.</span>
                                {option}
                              </span>
                              {isCorrect && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  Correct
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {question.explanation && (
                        <p className="text-xs text-[#64748B] italic">Explanation: {question.explanation}</p>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditQuestion(question)}
                          className="h-7 text-xs border-[#E2E8F0]"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="h-7 text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-[#64748B] bg-slate-50 rounded-xl border border-dashed border-[#E2E8F0]">
                    No questions added yet. Use the form above to add your first question.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Results Modal */}
        {viewingResultsQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <Card className="bg-white border-[#E2E8F0] shadow-xl rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <CardHeader className="p-5 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-[#172033] flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#635BFF]" />
                    Student Results: {viewingResultsQuiz.title}
                  </CardTitle>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Real submission data for {viewingResultsQuiz.className || "Class"} •{" "}
                    {viewingResultsQuiz.subjectName || "Subject"}
                  </p>
                </div>
                <button
                  onClick={closeResultsModal}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardHeader>

              <CardContent className="p-6 overflow-y-auto space-y-4">
                {resultsLoading ? (
                  <div className="py-12 text-center text-[#64748B] flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#635BFF]" />
                    <span>Loading student results...</span>
                  </div>
                ) : resultsError ? (
                  <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                    {resultsError}
                  </div>
                ) : resultsList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#64748B] space-y-2">
                    <Users className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-700">No submissions yet</p>
                    <p>No students have taken this quiz yet.</p>
                  </div>
                ) : (
                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F8FC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                        <tr>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Class</th>
                          <th className="py-3 px-4 text-center">Score</th>
                          <th className="py-3 px-4 text-center">Percentage</th>
                          <th className="py-3 px-4 text-right">Submitted At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {resultsList.map((res) => {
                          const pct =
                            res.totalQuestions && res.totalQuestions > 0
                              ? Math.round(((res.correctAnswers || 0) / res.totalQuestions) * 100)
                              : res.score || 0;
                          const isPass = pct >= 60;

                          return (
                            <tr key={res.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4 font-semibold text-[#172033]">{res.studentName}</td>
                              <td className="py-3 px-4 text-[#64748B]">{res.studentClass}</td>
                              <td className="py-3 px-4 text-center text-slate-700 font-medium">
                                {res.correctAnswers !== null && res.totalQuestions !== null
                                  ? `${res.correctAnswers} / ${res.totalQuestions}`
                                  : `${res.score}%`}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                    isPass
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {pct}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right text-[#64748B]">
                                {res.submittedAt
                                  ? new Date(res.submittedAt).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "Recently"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
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
