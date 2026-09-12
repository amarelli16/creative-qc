/**
 * AI Reviewer — client-side frame extraction & evaluation.
 *
 * For videos of ANY size (100MB, 500MB, 2GB+):
 * We NEVER send the raw heavy video over the network to Vercel/serverless.
 * Instead, the browser extracts 5 strategic QC keyframes via HTML5 Canvas:
 *  1. t=0.1s — Initial hook visual (pain point check)
 *  2. t=1.5s — Hook dynamics & animations check
 *  3. t=3.0s — Hook completion & transition check
 *  4. t=50%  — Body & visual style check
 *  5. t=90%  — Final CTA / offer frame check
 *
 * The resulting payload is under 800 KB total, loads in 0.5s,
 * completely bypasses Vercel's 4.5MB request limit, and provides
 * GPT-4o Vision with high-resolution, labeled frames for frame-accurate QC.
 */

import { SUPPORTED_VIDEO_TYPES } from './constants';

/**
 * Request AI review for uploaded media + ad text.
 * @param {Object} params
 * @param {File|null} params.file - Image or video file
 * @param {Object} params.adText - { primaryText, headline, description }
 * @param {string[]} params.placements - Selected placements
 * @param {Object} params.checklist - The checklist JSON
 * @param {Function} [params.onProgress] - Optional progress callback ('extracting' | 'analyzing')
 * @returns {Promise<Object>} AI review results
 */
export async function requestAiReview({
  file,
  adText,
  placements,
  checklist,
  onProgress,
}) {
  let videoFrames = null;
  let videoMeta = null;
  let imageBase64 = null;

  if (file) {
    const isVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);

    if (isVideo) {
      onProgress?.('extracting');
      const extracted = await extractVideoMetadataAndFrames(file);
      videoFrames = extracted.frames;
      videoMeta = extracted.meta;
    } else if (file.type?.startsWith('image/')) {
      onProgress?.('extracting');
      imageBase64 = await processImageFile(file);
    }
  }

  onProgress?.('analyzing');

  const clientApiKey = typeof window !== 'undefined' ? localStorage.getItem('cqc_openai_key') || '' : '';

  const payload = {
    adText,
    placements,
    checklist,
    videoFrames,
    videoMeta,
    imageBase64,
  };

  const res = await fetch('/api/review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(clientApiKey ? { 'x-openai-key': clientApiKey } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `AI review failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Extract QC keyframes and metadata from video in browser memory.
 * Never uploads the video file — works instantly on files up to 2GB+.
 *
 * @param {File} videoFile
 * @returns {Promise<{ frames: Array<{ label: string, time: number, dataUrl: string }>, meta: Object }>}
 */
export function extractVideoMetadataAndFrames(videoFile) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Таймаут чтения видео. Проверьте формат файла.'));
    }, 20000);

    video.onloadedmetadata = () => {
      const duration = video.duration || 10;
      const width = video.videoWidth || 1080;
      const height = video.videoHeight || 1920;

      // Calculate aspect ratio label
      const ratio = width / height;
      let aspectLabel = 'unknown';
      if (ratio < 0.65) aspectLabel = '9:16 (Reels/Stories)';
      else if (ratio < 0.85) aspectLabel = '4:5 (Feed portrait)';
      else if (ratio < 1.15) aspectLabel = '1:1 (Square)';
      else aspectLabel = '16:9 (Landscape)';

      const meta = {
        name: videoFile.name,
        sizeMb: (videoFile.size / 1024 / 1024).toFixed(1),
        durationSec: Math.round(duration * 10) / 10,
        resolution: `${width}×${height}`,
        aspectRatio: aspectLabel,
      };

      // Target moments for Meta creative QC
      const targetTimestamps = [];

      // 1. Hook start (first visual)
      targetTimestamps.push({ time: Math.min(0.1, duration * 0.05), label: '0.1s (Хук: первый кадр)' });

      // 2. Hook middle
      if (duration >= 2) {
        targetTimestamps.push({ time: 1.5, label: '1.5s (Хук: развитие динамики)' });
      }

      // 3. Hook end (rule: 3 seconds)
      if (duration >= 3.5) {
        targetTimestamps.push({ time: 3.0, label: '3.0s (Хук: завершение 3-й сек)' });
      }

      // 4. Middle of video (production & visual style)
      if (duration >= 5) {
        targetTimestamps.push({ time: duration * 0.5, label: `${Math.round(duration * 0.5)}s (Середина ролика)` });
      }

      // 5. CTA / Ending
      if (duration >= 2) {
        const ctaTime = Math.max(duration - 1.0, duration * 0.85);
        targetTimestamps.push({ time: ctaTime, label: `${Math.round(ctaTime * 10) / 10}s (Финал / CTA)` });
      }

      // Set canvas size (downscale if larger than 960px to keep payload tiny)
      const maxDim = 960;
      let targetW = width;
      let targetH = height;
      if (Math.max(width, height) > maxDim) {
        if (width >= height) {
          targetW = maxDim;
          targetH = Math.round((height * maxDim) / width);
        } else {
          targetH = maxDim;
          targetW = Math.round((width * maxDim) / height);
        }
      }

      canvas.width = targetW;
      canvas.height = targetH;

      const frames = [];
      let stepIndex = 0;

      const seekNext = () => {
        if (stepIndex >= targetTimestamps.length) {
          clearTimeout(timeout);
          URL.revokeObjectURL(video.src);
          resolve({ frames, meta });
          return;
        }

        const target = targetTimestamps[stepIndex];
        video.currentTime = Math.min(Math.max(target.time, 0), Math.max(duration - 0.1, 0));
      };

      video.onseeked = () => {
        try {
          ctx.drawImage(video, 0, 0, targetW, targetH);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          frames.push({
            label: targetTimestamps[stepIndex].label,
            time: targetTimestamps[stepIndex].time,
            dataUrl,
          });
        } catch (e) {
          console.warn('Frame capture error:', e);
        }
        stepIndex++;
        seekNext();
      };

      seekNext();
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(video.src);
      reject(new Error('Не удалось декодировать видео в браузере'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Optimize image client-side to ensure small JSON payload.
 * @param {File} imageFile
 * @returns {Promise<string>} Base64 data URL
 */
export function processImageFile(imageFile) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const maxDim = 1200;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;

      if (Math.max(w, h) > maxDim) {
        if (w >= h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось загрузить изображение'));
    };

    img.src = url;
  });
}
