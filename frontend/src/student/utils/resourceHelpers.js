import { PlayCircle, FileText, Layers, Target, Folder } from 'lucide-react';

export const RESOURCE_TYPE_META = {
  video: { label: 'Video Lessons', icon: PlayCircle },
  article: { label: 'Articles & Notes', icon: FileText },
  material: { label: 'Study Materials', icon: Layers },
  quiz: { label: 'Assessments', icon: Target },
  other: { label: 'Other Resources', icon: Folder },
};

export const RESOURCE_SECTION_ORDER = ['video', 'article', 'material', 'quiz', 'other'];

export function normalizeContentType(type) {
  const normalized = String(type || '').toLowerCase().trim();
  return Object.prototype.hasOwnProperty.call(RESOURCE_TYPE_META, normalized) ? normalized : 'other';
}

export function getResourceMeta(type) {
  const key = normalizeContentType(type);
  return { key, ...RESOURCE_TYPE_META[key] };
}

export function extractYoutubeId(value) {
  if (!value) return null;
  const text = String(value);
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/i,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/i,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/i,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

export function buildResourcePreview(item, maxLength = 260) {
  if (!item) return null;
  const source = item.description || item.body;
  if (!source) return null;
  const clean = String(source).replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trim()}…`;
}
