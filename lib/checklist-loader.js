import {
  DEFAULT_CHECKLIST_URL,
  LOCAL_CHECKLIST_PATH,
  CHECKLIST_CACHE_TTL,
} from './constants';
import fallbackChecklist from '@/data/default-checklist.json';

let cachedChecklist = null;
let cacheTimestamp = 0;

/**
 * Get initial synchronous checklist (guaranteed instant load, zero SSR/client lag).
 */
export function getInitialChecklist() {
  return cachedChecklist || fallbackChecklist;
}

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

  // Try remote GitHub URL first via API proxy
  if (url && typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/checklist?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.sections && Array.isArray(data.sections)) {
          cachedChecklist = data;
          cacheTimestamp = now;
          return data;
        }
      }
    } catch (err) {
      console.warn('Failed to load remote checklist from proxy, trying direct/fallback:', err);
    }

    // If proxy failed, try direct fetch from GitHub raw
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.sections) {
          cachedChecklist = data;
          cacheTimestamp = now;
          return data;
        }
      }
    } catch (err) {
      console.warn('Failed direct fetch from GitHub:', err);
    }
  }

  // Fallback to static JSON file or bundled fallback
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(LOCAL_CHECKLIST_PATH);
      if (res.ok) {
        const data = await res.json();
        if (data && data.sections) {
          cachedChecklist = data;
          cacheTimestamp = now;
          return data;
        }
      }
    } catch (err) {
      console.warn('Failed to load /data/default-checklist.json:', err);
    }
  }

  // Ultimate guaranteed fallback
  cachedChecklist = fallbackChecklist;
  cacheTimestamp = now;
  return fallbackChecklist;
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
  cachedChecklist = null;
  cacheTimestamp = 0;
}

/**
 * Get saved OpenAI API Key from localStorage
 */
export function getSavedApiKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('cqc_openai_key') || '';
}

/**
 * Save OpenAI API Key to localStorage
 */
export function saveApiKey(key) {
  if (typeof window === 'undefined') return;
  if (key) {
    localStorage.setItem('cqc_openai_key', key.trim());
  } else {
    localStorage.removeItem('cqc_openai_key');
  }
}
