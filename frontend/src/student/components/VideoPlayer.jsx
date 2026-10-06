"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/student/components/ui/badge";
import { Button } from "@/student/components/ui/button";
import { X, CheckCircle2, Circle, Loader2, Video, Wifi, WifiOff } from "lucide-react";
import { getVideoType, isYouTubeUrl } from "@/lib/videoHelpers";
import YouTubePlayer from "./YouTubePlayer";
import HLSPlayer from "./HLSPlayer";
import MP4Player from "./MP4Player";

export default function VideoPlayer({ lesson, module, offlineBlobUrl, onClose, onComplete, updatingLessonId, downloadState }) {
  const [dataSaver, setDataSaver] = useState(false);
  const [networkType, setNetworkType] = useState("unknown");
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const updateNetworkInfo = () => {
      if (typeof navigator !== "undefined" && navigator.connection) {
        const type = navigator.connection.effectiveType;
        if (type === "slow-2g" || type === "2g") {
          setNetworkType("poor");
          setDataSaver(true);
        } else if (type === "3g") {
          setNetworkType("moderate");
        } else if (type === "4g") {
          setNetworkType("good");
        } else {
          setNetworkType("unknown");
        }
      }
    };

    updateNetworkInfo();
    if (typeof navigator !== "undefined" && navigator.connection) {
      navigator.connection.addEventListener("change", updateNetworkInfo);
      return () => navigator.connection.removeEventListener("change", updateNetworkInfo);
    }
  }, []);

  if (!lesson) return null;

  const url = offlineBlobUrl || lesson.video_url || lesson.video_path;
  const vType = getVideoType(url);

  const renderPlayer = () => {
    if (!url) {
      return (
        <div className="p-8 text-center text-slate-400 space-y-2">
          <Video className="w-12 h-12 mx-auto text-slate-600" />
          <p>Video content is currently processing or unavailable.</p>
        </div>
      );
    }

    switch (vType) {
      case "youtube":
        return <YouTubePlayer url={url} lessonId={lesson.id} autoPlay={true} dataSaver={dataSaver} />;
      case "hls":
        return <HLSPlayer url={url} autoPlay={!dataSaver} />;
      case "mp4":
        return <MP4Player url={url} autoPlay={!dataSaver} />;
      default:
        return (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Video className="w-12 h-12 mx-auto text-slate-600" />
            <p>Unsupported video format.</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden text-white flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="space-y-0.5 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-indigo-600 text-white text-[10px]">
                {module?.title || "Module"}
              </Badge>
              <span className="text-xs text-slate-400">
                Lesson {lesson.order_index}
              </span>
              {downloadState?.isDownloaded && (
                <Badge className="bg-emerald-600 text-white text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Offline Ready
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-bold text-white truncate">
              {lesson.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {renderPlayer()}
        </div>

        {/* Lower Controls & Info */}
        <div className="p-4 bg-slate-900/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300 font-medium flex items-center gap-1">
                  {networkType === "poor" ? <WifiOff className="w-4 h-4 text-red-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
                  Connection:
                </span>
                <span className={`text-xs font-bold uppercase ${
                  networkType === "good" ? "text-emerald-400" :
                  networkType === "moderate" ? "text-yellow-400" :
                  networkType === "poor" ? "text-red-400" : "text-slate-400"
                }`}>
                  {networkType}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-300 font-medium">Data Saver</label>
                <button
                  onClick={() => setDataSaver(!dataSaver)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    dataSaver ? 'bg-indigo-500' : 'bg-slate-600'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    dataSaver ? 'translate-x-4.5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs text-indigo-400 hover:text-indigo-300 text-left underline underline-offset-2"
            >
              {showDebug ? "Hide Stream Info" : "Show Stream Info"}
            </button>
            
            {showDebug && (
              <div className="bg-slate-950 p-2 rounded-md text-xs text-slate-400 font-mono mt-1 w-full max-w-sm">
                <div>Source: {vType.toUpperCase()}</div>
                {vType === "youtube" && <div>Streaming: YouTube Adaptive Streaming</div>}
                {vType === "hls" && <div>Streaming: Gyanaratna HLS Chunked Streaming</div>}
                {vType === "mp4" && <div>Streaming: Direct MP4 / Cached</div>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <Button
              onClick={(e) => onComplete(e)}
              disabled={updatingLessonId === lesson.id}
              className={
                lesson.progress?.completed
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              }
            >
              {updatingLessonId === lesson.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : lesson.progress?.completed ? (
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
              ) : (
                <Circle className="w-4 h-4 mr-1.5" />
              )}
              {lesson.progress?.completed ? "Completed" : "Mark as Complete"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
