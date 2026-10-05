// Utility manager for downloading and storing lesson videos in Cache Storage for offline playback
import { getVideoType } from './videoHelpers';

const VIDEO_CACHE_NAME = 'glp-videos-v1';
const META_KEY = 'gyanaratna_offline_video_meta';

function getLocalMetadata() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Failed to read offline video metadata:', e);
    return {};
  }
}

function saveLocalMetadata(metaMap) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(META_KEY, JSON.stringify(metaMap));
  } catch (e) {
    console.warn('Failed to save offline video metadata:', e);
  }
}

/**
 * Downloads an uploaded lesson video into Cache Storage with progress tracking.
 * Rejects YouTube videos immediately without calling fetch().
 */
export async function downloadVideoForOffline(info, onProgress) {
  const { lessonId, videoUrl, title, moduleTitle, studentClass, schoolId, videoType } = info;

  const resolvedVideoType = videoType || getVideoType({ video_url: videoUrl });

  if (resolvedVideoType === 'youtube') {
    throw new Error('Offline download is unavailable for YouTube videos. YouTube lessons are available online.');
  }

  if (!videoUrl || typeof videoUrl !== 'string') {
    throw new Error('No valid video URL available for download.');
  }

  // Check if browser supports Cache API
  if (!('caches' in window)) {
    throw new Error('Cache Storage API is not supported in this browser environment.');
  }

  try {
    if (onProgress) onProgress(5);

    // Fetch video response with CORS
    const response = await fetch(videoUrl, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'video/*, */*',
      },
    });

    if (!response.ok) {
      if (response.status === 400 || response.status === 403 || response.status === 404) {
        throw new Error('This video is currently unavailable for offline download.');
      }
      throw new Error('Unable to download this video. Please check your internet connection and try again.');
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

    if (contentType && !contentType.includes('video/')) {
      throw new Error('This video format cannot be downloaded for offline use.');
    }

    // Read response body stream to calculate download percentage
    let receivedBytes = 0;
    let reader = null;
    let chunks = [];

    if (response.body && contentLength > 0) {
      reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.length;
        if (onProgress && contentLength > 0) {
          const pct = Math.min(95, Math.round((receivedBytes / contentLength) * 90) + 5);
          onProgress(pct);
        }
      }
    }

    // Reconstruct response object to store in Cache Storage
    let responseToCache;
    if (chunks.length > 0) {
      const blob = new Blob(chunks, { type: contentType || 'video/mp4' });
      responseToCache = new Response(blob, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } else {
      responseToCache = response.clone();
    }

    // Save to Cache Storage
    const cache = await caches.open(VIDEO_CACHE_NAME);
    await cache.put(videoUrl, responseToCache);

    if (onProgress) onProgress(100);

    // Update metadata registry
    const metaMap = getLocalMetadata();
    metaMap[lessonId] = {
      lessonId,
      videoUrl,
      title: title || 'Lesson Video',
      moduleTitle: moduleTitle || '',
      studentClass: studentClass || '',
      schoolId: schoolId || '',
      videoType: 'uploaded',
      downloadedAt: new Date().toISOString(),
      sizeBytes: receivedBytes || contentLength || 0,
    };
    saveLocalMetadata(metaMap);

    return {
      success: true,
      lessonId,
      videoUrl,
    };
  } catch (err) {
    console.error('Offline video download error:', err);

    // Clean up partial cache on failure
    try {
      const cache = await caches.open(VIDEO_CACHE_NAME);
      await cache.delete(videoUrl);
    } catch (e) {}

    if (err.name === 'QuotaExceededError' || err.message?.includes('quota')) {
      throw new Error('Insufficient storage space on device for offline video.');
    }

    if (err.message === 'Failed to fetch' || !navigator.onLine) {
      throw new Error('Internet connection lost. Download paused. Try again when you\'re online.');
    }

    throw new Error(err.message || 'Unable to download this video. Please check your internet connection and try again.');
  }
}

/**
 * Removes a downloaded lesson video from Cache Storage and metadata.
 */
export async function removeOfflineVideo(lessonId, videoUrl) {
  try {
    if ('caches' in window && videoUrl) {
      const cache = await caches.open(VIDEO_CACHE_NAME);
      await cache.delete(videoUrl);
    }
  } catch (e) {
    console.warn('Error deleting video from cache:', e);
  }

  const metaMap = getLocalMetadata();
  if (metaMap[lessonId]) {
    delete metaMap[lessonId];
    saveLocalMetadata(metaMap);
  }

  return { success: true };
}

/**
 * Checks if a lesson video is available offline in Cache Storage.
 */
export async function isLessonVideoDownloaded(lessonId, videoUrl) {
  const metaMap = getLocalMetadata();
  if (!metaMap[lessonId]) return false;

  if (!('caches' in window) || !videoUrl) return Boolean(metaMap[lessonId]);

  try {
    const cache = await caches.open(VIDEO_CACHE_NAME);
    const match = await cache.match(videoUrl);
    return Boolean(match);
  } catch (e) {
    return Boolean(metaMap[lessonId]);
  }
}

/**
 * Gets a local Object URL for an offline cached video so it plays without internet.
 */
export async function getOfflineVideoBlobUrl(videoUrl) {
  if (typeof window === 'undefined' || !('caches' in window) || !videoUrl) return null;
  try {
    const cache = await caches.open(VIDEO_CACHE_NAME);
    const match = await cache.match(videoUrl);
    if (!match) return null;
    const blob = await match.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn('Failed to retrieve offline video blob:', e);
    return null;
  }
}

/**
 * Retrieves list of all offline downloaded lessons.
 */
export function getAllOfflineVideosMetadata() {
  return getLocalMetadata();
}
