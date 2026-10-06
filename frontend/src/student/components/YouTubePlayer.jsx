"use client";

import { useEffect, useRef, useState } from "react";
import { getYouTubeVideoId } from "@/lib/videoHelpers";
import { saveLocalLessonProgress } from "@/lib/offlineDb";

export default function YouTubePlayer({
  url,
  lessonId,
  autoPlay = false,
  dataSaver = false,
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  const videoId = getYouTubeVideoId(url);

  useEffect(() => {
    if (!videoId) return;

    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
        return;
      }

      // Check if script is already injected
      if (!document.getElementById("youtube-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    };

    const initPlayer = () => {
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videoId,
        playerVars: {
          autoplay: autoPlay && !dataSaver ? 1 : 0,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            setPlayerReady(true);
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }
          },
        },
      });
    };

    loadYouTubeAPI();

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, autoPlay, dataSaver]);

  // Track playback position periodically
  useEffect(() => {
    if (!isPlaying || !playerReady || !lessonId) return;

    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const currentTime = playerRef.current.getCurrentTime();
        // Save quietly to local offline DB without triggering re-renders
        saveLocalLessonProgress({
          lessonId,
          completed: false,
          lastPosition: currentTime,
          action: "progress",
        }).catch((e) => console.warn("Failed to save background progress:", e));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, playerReady, lessonId]);

  if (!videoId) {
    return <div className="p-4 text-white">Invalid YouTube URL</div>;
  }

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
