import {
  DEFAULT_CHECKLIST_URL,
  LOCAL_CHECKLIST_PATH,
  CHECKLIST_CACHE_TTL,
} from './constants';

let cachedChecklist = null;
let cacheTimestamp = 0;

/**
 * Load checklist from GitHub raw URL or local fallback.
 * Caches for CHECKLIST_CACHE_TTL ms.
 */
export async function loadChecklist(customUrl = null) {
  const now = Date.now();

  // Return cache if still valid
  if (cachedChecklist && now - cacheTimestamp < CHECKLIST_CACHE_TTL) {
    return cachedChecklist;
  }

  const url = customUrl || getSavedChecklistUrl() || DEFAULT_CHECKLIST_URL;

  // Try remote URL first
  if (url) {
    try {
      const res = await fetch(`/api/checklist?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.sections) {
          cachedChecklist = data;
          cacheTimestamp = now;
          return data;
        }
      }
    } catch (err) {
      console.warn('Failed to load remote checklist, falling back to local:', err);
    }
  }

  // Fallback to local
  try {
    const res = await fetch(LOCAL_CHECKLIST_PATH);
    if (res.ok) {
      const data = await res.json();
      cachedChecklist = data;
      cacheTimestamp = now;
      return data;
    }
  } catch (err) {
    console.error('Failed to load local checklist:', err);
  }

  return null;
}

/**
 * Force reload checklist (bypass cache)
 */
export async function reloadChecklist(customUrl = null) {
  cachedChecklist = null;
  cacheTimestamp = 0;
  return loadChecklist(customUrl);
}

/**
 * Get saved checklist URL from localStorage
 */
export function getSavedChecklistUrl() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cqc_checklist_url') || '';
}

/**
 * Save checklist URL to localStorage
 */
export function saveChecklistUrl(url) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cqc_checklist_url', url);
  // Invalidate cache
  cachedChecklist = null;
  cacheTimestamp = 0;
}
