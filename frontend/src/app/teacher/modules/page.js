"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import { fetchUserRole, saveUserRole } from "@/lib/users";
import { getVideoType } from "@/lib/videoHelpers";
import { useSubjects, useTeacherModules, useTeacherStudentProgress } from "@/hooks/useApi";
import apiClient from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@teacher/components/ui/card";
import { Input } from "@teacher/components/ui/input";
import { Textarea } from "@teacher/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@teacher/components/ui/select";
import { Button } from "@teacher/components/ui/button";
import { Badge } from "@teacher/components/ui/badge";
import { Progress } from "@teacher/components/ui/progress";
import {
  Loader2,
  PlusCircle,
  Pencil,
  Trash2,
  Video,
  BookOpen,
  Layers,
  Upload,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const SCHOOL_CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);

function defaultModuleForm() {
  return {
    title: "",
    description: "",
    class: "Class 4",
    subjectId: "",
    thumbnailUrl: "",
    published: true,
  };
}

function defaultLessonForm() {
  return {
    title: "",
    description: "",
    videoType: "youtube",
    videoFile: null,
    videoPath: "",
    videoUrl: "",
    duration: 300,
    orderIndex: 1,
    isRequired: true,
    published: true,
  };
}

function ModuleManager() {
  const router = useRouter();
  const { user, isSignedIn, isLoaded } = useUser();
  const [roleDoc, setRoleDoc] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleError, setRoleError] = useState(null);

  // Filters & State
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");

  // Form States
  const [moduleForm, setModuleForm] = useState(defaultModuleForm());
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [submittingModule, setSubmittingModule] = useState(false);
  const [moduleError, setModuleError] = useState(null);
  const [moduleSuccess, setModuleSuccess] = useState(null);

  // Selected Module for Lesson Management
  const [activeModule, setActiveModule] = useState(null);
  const [activeModuleLessons, setActiveModuleLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  // Lesson Form State
  const [lessonForm, setLessonForm] = useState(defaultLessonForm());
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [submittingLesson, setSubmittingLesson] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [lessonError, setLessonError] = useState(null);
  const [lessonSuccess, setLessonSuccess] = useState(null);

  // Fetch teacher role & school
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user?.id) {
      setRoleLoading(false);
      return;
    }
    let active = true;
    setRoleLoading(true);
    fetchUserRole(user.id)
      .then((doc) => {
        if (!active) return;
        let roleVal = typeof doc === "string" ? doc : doc?.role;
        if (roleVal === "unassigned" && user?.unsafeMetadata?.role && user.unsafeMetadata.role !== "unassigned") {
          roleVal = user.unsafeMetadata.role;
        }
        if (roleVal === "unassigned") {
          router.replace("/role-select");
          return;
        }
        setRoleDoc(doc);
      })
      .catch((err) => {
        if (!active) return;
        setRoleError(err?.message || "Unable to load teacher profile");
      })
      .finally(() => {
        if (active) setRoleLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, user?.id, router]);

  const schoolId = roleDoc?.schoolId || roleDoc?.school_id || null;
  const role = typeof roleDoc === "string" ? roleDoc : roleDoc?.role;

  const handleSwitchToTeacherRole = async () => {
    if (!user?.id) return;
    setRoleLoading(true);
    setRoleError(null);
    try {
      const updated = await saveUserRole({
        userId: user.id,
        role: "teacher",
        name: user.fullName || user.firstName || "Teacher",
        schoolId: schoolId || "default",
      });
      if (user.update) {
        await user.update({
          unsafeMetadata: {
            ...(user.unsafeMetadata || {}),
            role: "teacher",
            schoolId: schoolId || "default",
          },
        }).catch(() => {});
      }
      setRoleDoc(updated?.user || { role: "teacher", school_id: schoolId || "default", user_id: user.id });
    } catch (err) {
      setRoleError("Failed to update account role: " + err.message);
    } finally {
      setRoleLoading(false);
    }
  };

  // Fetch subjects for school & class
  const { subjects } = useSubjects({
    schoolId,
    enabled: Boolean(schoolId),
  });

  // Fetch learning modules
  const {
    modules,
    loading: modulesLoading,
    error: modulesError,
    fetchModules,
    createModule,
    updateModule,
    deleteModule,
  } = useTeacherModules({
    class: selectedClassFilter === "all" ? null : selectedClassFilter,
    subjectId: selectedSubjectFilter === "all" ? null : selectedSubjectFilter,
  });

  // Fetch real-time student lesson progress reports
  const {
    reports: progressReports,
    loading: progressReportsLoading,
    refetch: refetchProgress,
  } = useTeacherStudentProgress();

  // Set default subject on form if subjects available
  useEffect(() => {
    if (subjects && subjects.length > 0 && !moduleForm.subjectId) {
      setModuleForm((prev) => ({ ...prev, subjectId: subjects[0].id }));
    }
  }, [subjects, moduleForm.subjectId]);

  // Load lessons when activeModule changes
  const loadModuleLessons = async (modId) => {
    if (!modId) {
      setActiveModuleLessons([]);
      return;
    }
    setLoadingLessons(true);
    try {
      const data = await apiClient.request(`/teacher/modules/${modId}/lessons`);
      setActiveModuleLessons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load lessons:", err);
      setActiveModuleLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  };

  const handleSelectModuleForLessons = (mod) => {
    setActiveModule(mod);
    setLessonForm({
      ...defaultLessonForm(),
      orderIndex: (mod.lessons?.length || 0) + 1,
    });
    setEditingLessonId(null);
    setLessonError(null);
    setLessonSuccess(null);
    loadModuleLessons(mod.id);
  };

  // Submit Learning Module (Create or Update)
  const handleSaveModule = async (e) => {
    e.preventDefault();
    if (!moduleForm.title.trim()) {
      setModuleError("Module title is required");
      return;
    }
    if (!moduleForm.subjectId) {
      setModuleError("Please select a subject");
      return;
    }
    setSubmittingModule(true);
    setModuleError(null);
    setModuleSuccess(null);

    try {
      const payload = {
        title: moduleForm.title.trim(),
        description: moduleForm.description.trim() || null,
        class: moduleForm.class,
        subjectId: moduleForm.subjectId,
        thumbnailUrl: moduleForm.thumbnailUrl.trim() || null,
        published: moduleForm.published,
      };

      if (editingModuleId) {
        await updateModule(editingModuleId, payload);
        setModuleSuccess("Learning module updated successfully");
      } else {
        await createModule(payload);
        setModuleSuccess("Learning module created successfully");
      }

      setModuleForm((prev) => ({ ...defaultModuleForm(), subjectId: prev.subjectId }));
      setEditingModuleId(null);
    } catch (err) {
      setModuleError(err?.message || "Failed to save module");
    } finally {
      setSubmittingModule(false);
    }
  };

  const startEditModule = (mod) => {
    setEditingModuleId(mod.id);
    setModuleForm({
      title: mod.title || "",
      description: mod.description || "",
      class: mod.class || "Class 4",
      subjectId: mod.subject_id || mod.subjectId || "",
      thumbnailUrl: mod.thumbnail_url || mod.thumbnailUrl || "",
      published: Boolean(mod.published),
    });
    setModuleError(null);
    setModuleSuccess(null);
  };

  const handleTogglePublishModule = async (mod) => {
    try {
      await updateModule(mod.id, { published: !mod.published });
      if (activeModule?.id === mod.id) {
        setActiveModule((prev) => ({ ...prev, published: !mod.published }));
      }
    } catch (err) {
      alert("Failed to toggle publish: " + err.message);
    }
  };

  const handleDeleteModule = async (modId) => {
    if (!confirm("Are you sure you want to delete this module and all its lessons?")) return;
    try {
      await deleteModule(modId);
      if (activeModule?.id === modId) {
        setActiveModule(null);
        setActiveModuleLessons([]);
      }
    } catch (err) {
      alert("Failed to delete module: " + err.message);
    }
  };

  // Upload video to Supabase Storage
  const handleUploadVideo = async (file) => {
    if (!file) return null;
    setUploadProgress(10);
    setUploadStatus("Requesting upload ticket...");

    try {
      // 1. Fetch signed upload URL from backend
      const { signedUploadUrl, storagePath, publicUrl } = await apiClient.getSignedVideoUploadUrl(
        file.name,
        file.type
      );

      setUploadProgress(40);
      setUploadStatus("Uploading video to Supabase Storage (learning-videos bucket)...");

      if (signedUploadUrl) {
        // Direct signed upload
        const response = await fetch(signedUploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "video/mp4",
          },
          body: file,
        });

        if (!response.ok) {
          throw new Error(`Storage upload failed (${response.status})`);
        }
      } else {
        throw new Error('Upload configuration failed: Missing signed upload URL. Ensure Supabase storage bucket exists.');
      }

      setUploadProgress(100);
      setUploadStatus("Upload complete!");

      return {
        storagePath,
        publicUrl,
      };
    } catch (err) {
      setUploadStatus("");
      setUploadProgress(0);
      throw err;
    }
  };

  // Submit Lesson (Create or Update)
  const handleSaveLesson = async (e) => {
    e.preventDefault();
    if (!activeModule) return;
    if (!lessonForm.title.trim()) {
      setLessonError("Lesson title is required");
      return;
    }

    setSubmittingLesson(true);
    setLessonError(null);
    setLessonSuccess(null);

    try {
      let finalVideoPath = lessonForm.videoPath;
      let finalVideoUrl = lessonForm.videoUrl;

      // Handle video file upload if file selected
      if (lessonForm.videoFile) {
        const uploadResult = await handleUploadVideo(lessonForm.videoFile);
        if (uploadResult) {
          finalVideoPath = uploadResult.storagePath;
          finalVideoUrl = uploadResult.publicUrl || finalVideoUrl;
        }
      }

      const payload = {
        title: lessonForm.title.trim(),
        description: lessonForm.description.trim() || null,
        videoType: lessonForm.videoType,
        videoPath: finalVideoPath || null,
        videoUrl: finalVideoUrl ? finalVideoUrl.trim() : null,
        duration: Number(lessonForm.duration) || 0,
        orderIndex: Number(lessonForm.orderIndex) || 1,
        isRequired: Boolean(lessonForm.isRequired),
        published: Boolean(lessonForm.published),
      };

      if (editingLessonId) {
        await apiClient.updateLesson(editingLessonId, payload);
        setLessonSuccess("Lesson updated successfully");
      } else {
        await apiClient.createLesson(activeModule.id, payload);
        setLessonSuccess("Lesson added successfully");
      }

      setLessonForm({
        ...defaultLessonForm(),
        orderIndex: activeModuleLessons.length + 2,
      });
      setEditingLessonId(null);
      setUploadProgress(0);
      setUploadStatus("");
      await loadModuleLessons(activeModule.id);
      await fetchModules();
    } catch (err) {
      setLessonError(err?.message || "Failed to save lesson");
    } finally {
      setSubmittingLesson(false);
    }
  };

  const startEditLesson = (les) => {
    setEditingLessonId(les.id);
    const resolvedType = getVideoType(les);
    setLessonForm({
      title: les.title || "",
      description: les.description || "",
      videoType: resolvedType,
      videoFile: null,
      videoPath: les.video_path || les.videoPath || "",
      videoUrl: les.video_url || les.videoUrl || "",
      duration: les.duration || 300,
      orderIndex: les.order_index || les.orderIndex || 1,
      isRequired: les.is_required ?? true,
      published: les.published ?? true,
    });
    setLessonError(null);
    setLessonSuccess(null);
  };

  const handleTogglePublishLesson = async (les) => {
    try {
      await apiClient.updateLesson(les.id, { published: !les.published });
      await loadModuleLessons(activeModule.id);
    } catch (err) {
      alert("Failed to update lesson: " + err.message);
    }
  };

  const handleDeleteLesson = async (lesId) => {
    if (!confirm("Delete this lesson?")) return;
    try {
      await apiClient.deleteLesson(lesId);
      await loadModuleLessons(activeModule.id);
      await fetchModules();
    } catch (err) {
      alert("Failed to delete lesson: " + err.message);
    }
  };

  if (!isSignedIn) return null;

  if (roleLoading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-white/90">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-violet-400" />
        Loading teacher profile...
      </div>
    );
  }

  if (roleError || !role || !["teacher", "admin"].includes(role)) {
    return (
      <Card className="max-w-xl mx-auto mt-10 bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          <div className="text-lg font-semibold mb-2">Access Restricted</div>
          <div>You need teacher privileges to manage learning modules.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-7 h-7 text-violet-400" /> Learning Module Management
          </h1>
          <p className="text-sm text-slate-300">
            Create structured courses, video lessons, and order curriculum for your school
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-36">
            <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
              <SelectTrigger className="bg-slate-800 text-white border-slate-700">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white border-slate-700">
                <SelectItem value="all">All Classes</SelectItem>
                {SCHOOL_CLASSES.map((cls) => (
                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-44">
            <Select value={selectedSubjectFilter} onValueChange={setSelectedSubjectFilter}>
              <SelectTrigger className="bg-slate-800 text-white border-slate-700">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white border-slate-700">
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ============================================================ */}
        {/* LEFT COLUMN: Create / Edit Module Form & Module List (2 Cols) */}
        {/* ============================================================ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create/Edit Module Form */}
          <Card className="bg-white/95 border-slate-200 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900 text-lg flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-violet-600" />
                {editingModuleId ? "Edit Learning Module" : "Create New Learning Module"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveModule} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Class *</label>
                    <Select
                      value={moduleForm.class}
                      onValueChange={(val) => setModuleForm((p) => ({ ...p, class: val }))}
                    >
                      <SelectTrigger className="bg-white border-slate-300">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {SCHOOL_CLASSES.map((cls) => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                    <Select
                      value={moduleForm.subjectId}
                      onValueChange={(val) => setModuleForm((p) => ({ ...p, subjectId: val }))}
                    >
                      <SelectTrigger className="bg-white border-slate-300">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {subjects.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.name} ({sub.class || 'K-12'})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Module Title *</label>
                  <Input
                    value={moduleForm.title}
                    onChange={(e) => setModuleForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Chapter 1: Introduction to Matter & Energy"
                    className="bg-white border-slate-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <Textarea
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Brief summary of module learning objectives..."
                    className="bg-white border-slate-300"
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={moduleForm.published}
                      onChange={(e) => setModuleForm((p) => ({ ...p, published: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 rounded"
                    />
                    Publish module to students immediately
                  </label>

                  <div className="flex items-center gap-2">
                    {editingModuleId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingModuleId(null);
                          setModuleForm(defaultModuleForm());
                        }}
                      >
                        Cancel Edit
                      </Button>
                    )}
                    <Button type="submit" disabled={submittingModule} className="bg-violet-600 hover:bg-violet-700 text-white">
                      {submittingModule ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                        </span>
                      ) : editingModuleId ? (
                        "Update Module"
                      ) : (
                        "Create Module"
                      )}
                    </Button>
                  </div>
                </div>

                {moduleError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">{moduleError}</div>}
                {moduleSuccess && <div className="text-sm text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-200">{moduleSuccess}</div>}
              </form>
            </CardContent>
          </Card>

          {/* Modules List */}
          <Card className="bg-white/95 border-slate-200 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900 text-lg flex items-center justify-between">
                <span>School Learning Modules ({modules.length})</span>
                {modulesLoading && <Loader2 className="w-4 h-4 animate-spin text-violet-600" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {modulesError && <div className="text-sm text-red-600">{modulesError}</div>}

              {modulesLoading && !modules.length ? (
                <div className="py-8 text-center text-sm text-slate-500">Loading learning modules...</div>
              ) : !modules.length ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No learning modules created yet for the selected filter. Create one above!
                </div>
              ) : (
                modules.map((mod) => {
                  const isSelected = activeModule?.id === mod.id;
                  const subjectName = subjects.find((s) => s.id === (mod.subject_id || mod.subjectId))?.name || "Subject";

                  return (
                    <div
                      key={mod.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? "border-violet-500 bg-violet-50/50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-base">{mod.title}</h3>
                            <Badge className="bg-violet-100 text-violet-700 border-violet-200">{mod.class}</Badge>
                            <Badge variant="outline" className="text-slate-600">{subjectName}</Badge>
                            {mod.published ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 flex items-center gap-1">
                                <Eye className="w-3 h-3" /> Published
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-slate-500 flex items-center gap-1">
                                <EyeOff className="w-3 h-3" /> Draft
                              </Badge>
                            )}
                          </div>
                          {mod.description && <p className="text-xs text-slate-600">{mod.description}</p>}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            className={isSelected ? "bg-violet-600 text-white" : "border-violet-200 text-violet-700 hover:bg-violet-50"}
                            onClick={() => handleSelectModuleForLessons(mod)}
                          >
                            <BookOpen className="w-4 h-4 mr-1" />
                            {isSelected ? "Managing Lessons" : "Manage Lessons"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => startEditModule(mod)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-500 hover:text-slate-900"
                            onClick={() => handleTogglePublishModule(mod)}
                          >
                            {mod.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-600" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteModule(mod.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Lesson Manager Panel for Selected Module (1 Col) */}
        {/* ============================================================ */}
        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-slate-800 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-violet-300">
                <Video className="w-5 h-5 text-violet-400" />
                {activeModule ? `Lessons in: ${activeModule.title}` : "Lesson Manager"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {!activeModule ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  Select a learning module on the left to add video lessons and curriculum content.
                </div>
              ) : (
                <>
                  {/* Add / Edit Lesson Form */}
                  <form onSubmit={handleSaveLesson} className="space-y-3 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-violet-300">
                      {editingLessonId ? "Edit Lesson" : "Add Lesson to Module"}
                    </h4>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Lesson Title *</label>
                      <Input
                        value={lessonForm.title}
                        onChange={(e) => setLessonForm((p) => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Lesson 1: States of Matter"
                        className="bg-slate-900 border-slate-700 text-white text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Lesson Description</label>
                      <Textarea
                        value={lessonForm.description}
                        onChange={(e) => setLessonForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Video summary or key concepts..."
                        className="bg-slate-900 border-slate-700 text-white text-sm"
                        rows={2}
                      />
                    </div>

                    {/* Lesson Video Source Options */}
                    <div className="space-y-2">
                      <label className="block text-xs text-slate-300 font-medium">Video Source</label>
                      <div className="flex items-center gap-4 text-xs text-slate-200 bg-slate-900 p-2.5 rounded-md border border-slate-700">
                        <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="videoType"
                            value="youtube"
                            checked={lessonForm.videoType === "youtube"}
                            onChange={() => setLessonForm((p) => ({ ...p, videoType: "youtube" }))}
                            className="text-violet-600 focus:ring-violet-500"
                          />
                          📹 YouTube URL
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="videoType"
                            value="uploaded"
                            checked={lessonForm.videoType === "uploaded"}
                            onChange={() => setLessonForm((p) => ({ ...p, videoType: "uploaded" }))}
                            className="text-violet-600 focus:ring-violet-500"
                          />
                          📁 Upload Video (MP4 / WebM)
                        </label>
                      </div>
                    </div>

                    {lessonForm.videoType === "youtube" ? (
                      <div>
                        <label className="block text-xs text-slate-300 mb-1 font-medium">
                          YouTube Video URL *
                        </label>
                        <Input
                          value={lessonForm.videoUrl}
                          onChange={(e) => setLessonForm((p) => ({ ...p, videoUrl: e.target.value }))}
                          placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/..."
                          className="bg-slate-900 border-slate-700 text-white text-xs"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Paste any YouTube link. It will automatically convert to an embeddable format for online playback.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs text-slate-300 font-medium">
                          Upload Video File (Supabase Storage: learning-videos)
                        </label>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setLessonForm((p) => ({ ...p, videoFile: file }));
                            }
                          }}
                          className="w-full text-xs text-slate-300 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700 cursor-pointer"
                        />

                        {uploadStatus && (
                          <div className="space-y-1">
                            <div className="text-[11px] text-violet-300 flex items-center justify-between">
                              <span>{uploadStatus}</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <Progress value={uploadProgress} className="h-1.5 bg-slate-700" />
                          </div>
                        )}

                        <div className="pt-1">
                          <label className="block text-[11px] text-slate-400 mb-1">Direct Storage Video URL (Optional Override)</label>
                          <Input
                            value={lessonForm.videoUrl}
                            onChange={(e) => setLessonForm((p) => ({ ...p, videoUrl: e.target.value }))}
                            placeholder="https://... direct .mp4 video URL"
                            className="bg-slate-900 border-slate-700 text-white text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">Duration (seconds)</label>
                        <Input
                          type="number"
                          value={lessonForm.duration}
                          onChange={(e) => setLessonForm((p) => ({ ...p, duration: e.target.value }))}
                          className="bg-slate-900 border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">Order Index</label>
                        <Input
                          type="number"
                          value={lessonForm.orderIndex}
                          onChange={(e) => setLessonForm((p) => ({ ...p, orderIndex: e.target.value }))}
                          className="bg-slate-900 border-slate-700 text-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lessonForm.isRequired}
                          onChange={(e) => setLessonForm((p) => ({ ...p, isRequired: e.target.checked }))}
                          className="rounded text-violet-600"
                        />
                        Required
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lessonForm.published}
                          onChange={(e) => setLessonForm((p) => ({ ...p, published: e.target.checked }))}
                          className="rounded text-violet-600"
                        />
                        Published
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {editingLessonId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingLessonId(null);
                            setLessonForm(defaultLessonForm());
                          }}
                          className="text-slate-400"
                        >
                          Cancel
                        </Button>
                      )}
                      <Button type="submit" disabled={submittingLesson} size="sm" className="w-full bg-violet-600 hover:bg-violet-700 text-white">
                        {submittingLesson ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                          </span>
                        ) : editingLessonId ? (
                          "Update Lesson"
                        ) : (
                          "Add Lesson"
                        )}
                      </Button>
                    </div>

                    {lessonError && <div className="text-xs text-red-400 bg-red-950/50 p-2 rounded border border-red-800">{lessonError}</div>}
                    {lessonSuccess && <div className="text-xs text-emerald-400 bg-emerald-950/50 p-2 rounded border border-emerald-800">{lessonSuccess}</div>}
                  </form>

                  {/* Lessons List */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Module Lessons ({activeModuleLessons.length})
                    </h4>

                    {loadingLessons ? (
                      <div className="py-6 text-center text-xs text-slate-400">Loading lessons...</div>
                    ) : !activeModuleLessons.length ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No lessons added yet. Use the form above to add your first lesson video!
                      </div>
                    ) : (
                      activeModuleLessons.map((les, index) => (
                        <div
                          key={les.id}
                          className="p-3 rounded-lg bg-slate-800 border border-slate-700 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-slate-100">
                                {index + 1}. {les.title}
                              </div>
                              {les.description && <div className="text-[11px] text-slate-400">{les.description}</div>}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                                onClick={() => handleTogglePublishLesson(les)}
                              >
                                {les.published ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                                onClick={() => startEditLesson(les)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                                onClick={() => handleDeleteLesson(les.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-700/50 pt-1.5">
                            <span>⏱️ {les.duration || 0} seconds</span>
                            {les.is_required ? (
                              <span className="text-amber-400 font-semibold">Required</span>
                            ) : (
                              <span>Optional</span>
                            )}
                            {les.video_url && (
                              <span className="text-emerald-400 truncate max-w-[120px]">📹 Video Attached</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Real-Time Student Lesson Progress Tracker */}
      <Card className="bg-slate-900 border-slate-800 text-white shadow-xl mt-8">
        <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> Student Lesson Progress Tracker
            </CardTitle>
            <p className="text-xs text-slate-400 mt-1">
              Real-time online completion data calculated from student activity across your school's modules
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={refetchProgress}
            className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
          >
            Refresh Progress
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {progressReportsLoading && (!progressReports || progressReports.length === 0) ? (
            <div className="py-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-violet-400" />
              Loading student progress reports...
            </div>
          ) : (!progressReports || progressReports.length === 0) ? (
            <div className="py-8 text-center text-slate-400 bg-slate-800/40 rounded-xl border border-dashed border-slate-700 p-6">
              No student progress recorded yet. Progress will update automatically when students complete video lessons.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Class</th>
                    <th className="p-3.5">Learning Module</th>
                    <th className="p-3.5 text-center">Completed Lessons</th>
                    <th className="p-3.5">Module Progress</th>
                    <th className="p-3.5 text-right">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {progressReports.map((item, idx) => (
                    <tr key={`${item.studentId}-${item.moduleId}-${idx}`} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-medium text-white">
                        {item.studentName}
                      </td>
                      <td className="p-3.5">
                        <Badge className="bg-slate-800 text-slate-200 border-slate-700">
                          {item.class}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-slate-200 font-medium">
                        {item.moduleTitle}
                      </td>
                      <td className="p-3.5 text-center font-semibold text-white">
                        {item.completedLessons} / {item.totalLessons}
                      </td>
                      <td className="p-3.5 min-w-[160px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className={item.progressPercent === 100 ? "text-emerald-400" : "text-slate-300"}>
                              {item.progressPercent}%
                            </span>
                            {item.isCompleted && (
                              <span className="text-emerald-400 text-[10px] font-bold">✓ DONE</span>
                            )}
                          </div>
                          <Progress
                            value={item.progressPercent}
                            className={`h-2 ${item.progressPercent === 100 ? "bg-emerald-950" : "bg-slate-800"}`}
                          />
                        </div>
                      </td>
                      <td className="p-3.5 text-right text-xs text-slate-400">
                        {item.lastUpdatedAt
                          ? new Date(item.lastUpdatedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Not started"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ModulesPage() {
  return (
    <>
      <SignedIn>
        <ModuleManager />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
