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
export function getYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/i;
  const match = trimmed.match(regExp);
  return (match && match[1] && match[1].length === 11) ? match[1] : null;
}

export function parseYouTubeVideoId(url) {
  return getYouTubeVideoId(url);
}

export function isYouTubeUrl(url) {
  return getYouTubeVideoId(url) !== null;
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
 * Determines whether a lesson video is youtube, hls, mp4, or unknown.
 * Accepts either a URL string or a lesson object.
 * Returns 'youtube' | 'hls' | 'mp4' | 'unknown'.
 */
export function getVideoType(input) {
  if (!input) return 'unknown';

  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (typeof input === 'object') {
    if (input.video_type === 'youtube' || input.videoType === 'youtube') {
      return 'youtube';
    }
    url = input.video_url || input.videoUrl || input.video_path || input.videoPath || '';
  }

  if (!url || typeof url !== 'string') return 'unknown';

  if (parseYouTubeVideoId(url)) {
    return 'youtube';
  }

  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('.m3u8')) {
    return 'hls';
  }

  if (lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.mov') || lowerUrl.includes('supabase.co/storage')) {
    return 'mp4';
  }

  return 'unknown';
}
