"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import Hls from "hls.js";

export default function HLSPlayer({ url, autoPlay = false, className = "w-full h-full object-contain" }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30, // For low bandwidth
        startLevel: -1, // Auto quality
      });
      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        if (autoPlay) {
          video.play().catch((e) => console.log("HLS autoPlay prevented:", e));
        }
      });

      hls.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("HLS Network Error, attempting recovery...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("HLS Media Error, attempting recovery...");
              hls.recoverMediaError();
              break;
            default:
              console.error("Fatal HLS Error, cannot recover.");
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native support (Safari)
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        if (autoPlay) {
          video.play().catch((e) => console.log("Native HLS autoPlay prevented:", e));
        }
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [url, autoPlay]);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        controls
        controlsList="nodownload"
        className={className}
        playsInline
      />
    </div>
  );
}
