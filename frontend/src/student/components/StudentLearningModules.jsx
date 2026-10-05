"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Play,
  Video,
  X,
  Sparkles,
  Loader2,
  Award,
  ChevronDown,
  ChevronUp,
  DownloadCloud,
  Check,
  Trash2,
  WifiOff,
  RefreshCw,
  Lock,
  Unlock,
} from "lucide-react";
import { useStudentModules } from "@/hooks/useApi";
import apiClient from "@/lib/api";
import { getYouTubeEmbedUrl, getVideoType } from "@/lib/videoHelpers";
import {
  downloadVideoForOffline,
  removeOfflineVideo,
  isLessonVideoDownloaded,
  getOfflineVideoBlobUrl,
} from "@/lib/offlineVideoManager";
import { Card, CardContent } from "@/student/components/ui/card";
import { Badge } from "@/student/components/ui/badge";
import { Button } from "@/student/components/ui/button";
import { Progress } from "@/student/components/ui/progress";

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "Self-paced";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

export default function StudentLearningModules() {
  const router = useRouter();
  const { modules, studentClass, schoolId, loading, error, markLessonProgress } =
    useStudentModules();

  const [activeVideoLesson, setActiveVideoLesson] = useState(null);
  const [activeVideoModule, setActiveVideoModule] = useState(null);
  const [offlineBlobUrl, setOfflineBlobUrl] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [updatingLessonId, setUpdatingLessonId] = useState(null);
  const [downloadStates, setDownloadStates] = useState({});

  useEffect(() => {
    if (!modules || modules.length === 0) return;
    let active = true;

    async function checkDownloads() {
      const stateMap = {};
      for (const mod of modules) {
        if (!mod.lessons) continue;
        for (const les of mod.lessons) {
          const vType = getVideoType(les);
          if (vType === "uploaded" && (les.video_url || les.video_path)) {
            const isDownloaded = await isLessonVideoDownloaded(les.id, les.video_url);
            stateMap[les.id] = { isDownloaded, isDownloading: false, progress: 0 };
          }
        }
      }
      if (active) setDownloadStates(stateMap);
    }

    checkDownloads();
    return () => {
      active = false;
    };
  }, [modules]);

  const toggleModuleExpand = (modId) => {
    setExpandedModules((prev) => ({
      ...prev,
      [modId]: prev[modId] === undefined ? false : !prev[modId],
    }));
  };

  const handleToggleCompletion = async (e, lesson, module) => {
    e.stopPropagation();
    if (updatingLessonId) return;

    const nextCompleted = !lesson.progress?.completed;
    setUpdatingLessonId(lesson.id);
    try {
      await markLessonProgress(lesson.id, nextCompleted, lesson.progress?.lastPosition || 0);
    } catch (err) {
      alert("Failed to update lesson completion: " + err.message);
    } finally {
      setUpdatingLessonId(null);
    }
  };

  const openVideoPlayer = async (lesson, module) => {
    setActiveVideoLesson(lesson);
    setActiveVideoModule(module);
    setOfflineBlobUrl(null);

    const vType = getVideoType(lesson);
    if (vType === "uploaded" && lesson.video_url) {
      try {
        const cachedBlobUrl = await getOfflineVideoBlobUrl(lesson.video_url);
        if (cachedBlobUrl) {
          setOfflineBlobUrl(cachedBlobUrl);
        }
      } catch (e) {
        console.warn("Failed to load cached video blob:", e);
      }
    }

    try {
      await markLessonProgress(lesson.id, false, lesson.progress?.lastPosition || 0, "start");
    } catch (e) {
      console.warn("Failed to record lesson start:", e);
    }
  };

  const closeVideoPlayer = () => {
    if (offlineBlobUrl) {
      try {
        URL.revokeObjectURL(offlineBlobUrl);
      } catch (e) {}
    }
    setActiveVideoLesson(null);
    setActiveVideoModule(null);
    setOfflineBlobUrl(null);
  };

  const handleDownloadVideo = async (e, lesson, module) => {
    e.stopPropagation();
    const vType = getVideoType(lesson);
    if (vType === "youtube") {
      alert("Offline download is unavailable for YouTube videos. YouTube lessons are available when connected to the internet.");
      return;
    }

    const targetUrl = lesson.video_url;
    if (!targetUrl) {
      alert("No valid video URL available for offline download.");
      return;
    }

    setDownloadStates((prev) => ({
      ...prev,
      [lesson.id]: { isDownloaded: false, isDownloading: true, progress: 5, error: null },
    }));

    try {
      await downloadVideoForOffline(
        {
          lessonId: lesson.id,
          videoUrl: targetUrl,
          title: lesson.title,
          moduleTitle: module.title,
          studentClass,
          schoolId,
          videoType: vType,
        },
        (pct) => {
          setDownloadStates((prev) => ({
            ...prev,
            [lesson.id]: { ...(prev[lesson.id] || {}), progress: pct, isDownloading: true },
          }));
        }
      );

      setDownloadStates((prev) => ({
        ...prev,
        [lesson.id]: { isDownloaded: true, isDownloading: false, progress: 100, error: null },
      }));
    } catch (err) {
      alert(err.message);
      setDownloadStates((prev) => ({
        ...prev,
        [lesson.id]: { isDownloaded: false, isDownloading: false, progress: 0, error: err.message },
      }));
    }
  };

  const handleRemoveDownload = async (e, lesson) => {
    e.stopPropagation();
    try {
      await removeOfflineVideo(lesson.id, lesson.video_url);
      setDownloadStates((prev) => ({
        ...prev,
        [lesson.id]: { isDownloaded: false, isDownloading: false, progress: 0 },
      }));
    } catch (err) {
      alert("Failed to remove offline video: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm">Loading curriculum & learning modules...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-center space-y-2">
        <p className="font-semibold">Unable to load learning modules</p>
        <p className="text-xs text-red-300/80">{error}</p>
      </div>
    );
  }

  if (!modules || modules.length === 0) {
    return (
      <Card className="bg-slate-800/40 border-slate-700/60 shadow-lg">
        <CardContent className="p-8 text-center space-y-3">
          <BookOpen className="w-12 h-12 mx-auto text-slate-500" />
          <h3 className="text-lg font-bold text-white">No Learning Modules Assigned Yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Your school teachers haven&apos;t published any learning modules for {studentClass || "your class"} yet. Check back soon!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Learning Modules List */}
      <div className="space-y-4">
        {modules.map((mod) => {
          const isExpanded = expandedModules[mod.id] !== false; // Default expanded
          const stats = mod.stats || { totalLessons: 0, completedLessons: 0, isCompleted: false };
          const percent = stats.totalLessons > 0 ? Math.round((stats.completedLessons / stats.totalLessons) * 100) : 0;

          return (
            <Card
              key={mod.id}
              className="bg-slate-800/80 border-slate-700/60 shadow-xl overflow-hidden backdrop-blur-md"
            >
              {/* Module Header */}
              <div
                onClick={() => toggleModuleExpand(mod.id)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-700/30 transition-colors border-b border-slate-700/50"
              >
                <div className="flex items-start gap-4">
                  {mod.thumbnail_url ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-700">
                      <img
                        src={mod.thumbnail_url}
                        alt={mod.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-white shrink-0 shadow-lg">
                      <BookOpen className="w-7 h-7" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-indigo-600/90 text-white text-[11px]">
                        {mod.subject?.name || "General"}
                      </Badge>
                      <Badge variant="outline" className="text-slate-300 border-slate-600 text-[11px]">
                        {mod.class}
                      </Badge>
                      {stats.isCompleted && (
                        <Badge className="bg-emerald-600 text-white text-[11px] gap-1">
                          <Check className="w-3 h-3" /> Module Completed
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white leading-snug">{mod.title}</h3>
                    {mod.description && (
                      <p className="text-xs text-slate-300 line-clamp-2">{mod.description}</p>
                    )}
                  </div>
                </div>

                {/* Progress & Toggle */}
                <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-700/40">
                  <div className="w-36 space-y-1 text-right">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                      <span>Progress</span>
                      <span className="text-indigo-400 font-bold">{percent}%</span>
                    </div>
                    <Progress value={percent} className="h-2 bg-slate-900" />
                    <div className="text-[10px] text-slate-400">
                      {stats.completedLessons} of {stats.totalLessons} lessons
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white p-1 h-8 w-8"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              {/* Module Content & Lessons (Collapsible) */}
              {isExpanded && (
                <CardContent className="p-5 pt-4 space-y-4 bg-slate-900/40">
                  {/* Lessons List */}
                  {!mod.lessons || mod.lessons.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No video lessons published for this module yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {mod.lessons.map((lesson) => {
                        const isCompleted = lesson.progress?.completed;
                        const dState = downloadStates[lesson.id];
                        const vType = getVideoType(lesson);

                        return (
                          <div
                            key={lesson.id}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isCompleted
                                ? "bg-slate-800/40 border-slate-700/40 opacity-90"
                                : "bg-slate-800/90 border-slate-700/70 hover:border-indigo-500/50"
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <button
                                onClick={(e) => handleToggleCompletion(e, lesson, mod)}
                                disabled={updatingLessonId === lesson.id}
                                className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-400 transition-colors"
                              >
                                {updatingLessonId === lesson.id ? (
                                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                                ) : isCompleted ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                                ) : (
                                  <Circle className="w-5 h-5" />
                                )}
                              </button>

                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-slate-400 font-semibold">
                                    Lesson {lesson.order_index}
                                  </span>
                                  {lesson.is_required && (
                                    <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 bg-amber-500/10">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                                <h4
                                  onClick={() => openVideoPlayer(lesson, mod)}
                                  className="text-sm font-semibold text-white hover:text-indigo-300 cursor-pointer truncate"
                                >
                                  {lesson.title}
                                </h4>
                              </div>
                            </div>

                            {/* Right Actions & Controls */}
                            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                              <div className="hidden md:flex items-center gap-1 text-xs text-slate-400 mr-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{formatDuration(lesson.duration)}</span>
                              </div>

                              {/* Video Type / Offline Download Controls */}
                              {vType === "youtube" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                                  <span>Online Video</span>
                                </span>
                              ) : (lesson.video_url || lesson.video_path) && (
                                dState?.isDownloading ? (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/60 text-indigo-400 border border-indigo-800 text-xs font-medium">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Downloading {dState.progress || 0}%</span>
                                  </div>
                                ) : dState?.isDownloaded ? (
                                  <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-medium">
                                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Available Offline
                                    </span>
                                    <button
                                      onClick={(e) => handleRemoveDownload(e, lesson)}
                                      title="Remove offline download"
                                      className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => handleDownloadVideo(e, lesson, mod)}
                                    className="text-slate-300 border-slate-700 hover:bg-slate-800 text-xs gap-1"
                                  >
                                    <DownloadCloud className="w-3.5 h-3.5 text-indigo-400" /> Download for Offline
                                  </Button>
                                )
                              )}

                              <Button
                                size="sm"
                                onClick={() => openVideoPlayer(lesson, mod)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm gap-1.5 text-xs"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Watch Video
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Module Quiz Section */}
                  {mod.quiz && (
                    <div className="pt-2 border-t border-slate-700/50 mt-2">
                      {mod.quiz.state === "LESSONS_INCOMPLETE" && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-900/50 bg-amber-950/30">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-900/50 text-amber-300">
                              <Lock className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                🔒 Quiz Locked
                              </h4>
                              <p className="text-xs text-slate-300">
                                Complete all required lessons to unlock the quiz.
                              </p>
                            </div>
                          </div>
                          <Button disabled variant="outline" size="sm" className="opacity-60 cursor-not-allowed text-xs border-amber-800 text-amber-200 shrink-0">
                            <Lock className="w-3.5 h-3.5 mr-1" /> Locked
                          </Button>
                        </div>
                      )}

                      {mod.quiz.state === "NOT_RELEASED" && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-700 bg-slate-800/60">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-700 text-slate-300">
                              <Lock className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                🔒 Quiz Locked
                              </h4>
                              <p className="text-xs text-slate-300">
                                Your teacher has not released the quiz yet.
                              </p>
                            </div>
                          </div>
                          <Button disabled variant="outline" size="sm" className="opacity-60 cursor-not-allowed text-xs border-slate-700 text-slate-300 shrink-0">
                            <Lock className="w-3.5 h-3.5 mr-1" /> Pending Release
                          </Button>
                        </div>
                      )}

                      {mod.quiz.state === "UNLOCKED" && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-emerald-900/50 bg-emerald-950/30">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-900/50 text-emerald-300">
                              <Unlock className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-emerald-200 flex items-center gap-1.5">
                                🔓 Quiz Unlocked
                              </h4>
                              <p className="text-xs text-emerald-300">
                                {mod.quiz.title || "Module Quiz"} is ready for you!
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => router.push(`/student/quiz?id=${mod.quiz.id}`)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm text-xs gap-1.5 shrink-0"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Start Quiz
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Video Player Modal */}
      {activeVideoLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden text-white space-y-0">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="space-y-0.5 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-600 text-white text-[10px]">
                    {activeVideoModule?.title || "Module"}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    Lesson {activeVideoLesson.order_index}
                  </span>
                  {downloadStates[activeVideoLesson.id]?.isDownloaded && (
                    <Badge className="bg-emerald-600 text-white text-[10px] flex items-center gap-1">
                      <Check className="w-3 h-3" /> Offline Ready
                    </Badge>
                  )}
                  {getVideoType(activeVideoLesson) === "youtube" && (
                    <Badge className="bg-slate-700 text-slate-300 text-[10px]">
                      YouTube Stream
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white truncate">
                  {activeVideoLesson.title}
                </h3>
              </div>
              <button
                onClick={closeVideoPlayer}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player Area */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              {activeVideoLesson.video_url || activeVideoLesson.video_path ? (
                getVideoType(activeVideoLesson) === "youtube" ? (
                  <iframe
                    src={getYouTubeEmbedUrl(activeVideoLesson.video_url)}
                    title={activeVideoLesson.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={offlineBlobUrl || activeVideoLesson.video_url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                )
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Video className="w-12 h-12 mx-auto text-slate-600" />
                  <p>Video content is currently processing or unavailable.</p>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm text-slate-300">
                {activeVideoLesson.description || "Watch this lesson to complete your module requirements."}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  onClick={(e) =>
                    handleToggleCompletion(e, activeVideoLesson, activeVideoModule)
                  }
                  disabled={updatingLessonId === activeVideoLesson.id}
                  className={
                    activeVideoLesson.progress?.completed
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                  }
                >
                  {updatingLessonId === activeVideoLesson.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : activeVideoLesson.progress?.completed ? (
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  ) : (
                    <Circle className="w-4 h-4 mr-1.5" />
                  )}
                  {activeVideoLesson.progress?.completed ? "Completed" : "Mark as Complete"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
