"use client";

export default function MP4Player({ url, autoPlay = false, className = "w-full h-full object-contain" }) {
  if (!url) return null;

  return (
    <video
      src={url}
      controls
      autoPlay={autoPlay}
      controlsList="nodownload"
      className={className}
      playsInline
    />
  );
}
