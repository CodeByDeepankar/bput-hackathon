/**
 * Video Helper Utilities for Gyanaratna
 * Supports YouTube parsing and video type detection (youtube vs uploaded)
 */

/**
 * Extracts 11-character YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID&feature=shared
 * - https://youtu.be/VIDEO_ID
 * - https://youtu.be/VIDEO_ID?t=10
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 */
export function parseYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/i;
  const match = trimmed.match(regExp);
  return (match && match[1] && match[1].length === 11) ? match[1] : null;
}

/**
 * Converts any YouTube URL to an embeddable youtube-nocookie.com embed URL.
 * Returns null if the URL is not a valid YouTube URL.
 */
export function getYouTubeEmbedUrl(url) {
  const videoId = parseYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

/**
 * Determines whether a lesson video is a YouTube video or an uploaded video file.
 * Returns 'youtube' | 'uploaded'.
 */
export function getVideoType(lesson) {
  if (!lesson) return 'uploaded';
  
  if (lesson.video_type === 'youtube' || lesson.videoType === 'youtube') {
    return 'youtube';
  }
  if (lesson.video_type === 'uploaded' || lesson.videoType === 'uploaded') {
    return 'uploaded';
  }

  // Auto-detect based on video_url / video_path
  const url = String(lesson.video_url || '').toLowerCase();
  const path = String(lesson.video_path || '').toLowerCase();

  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('youtube-nocookie.com')) {
    return 'youtube';
  }

  if (path || url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov') || url.includes('supabase.co/storage')) {
    return 'uploaded';
  }

  return 'uploaded';
}
