/**
 * AI Reviewer — client-side wrapper for /api/review.
 * Sends media + ad text to the server-side API route,
 * which proxies to OpenAI GPT-4o Vision.
 */

/**
 * Request AI review for uploaded media + ad text.
 * @param {Object} params
 * @param {File|null} params.file - Image or video file
 * @param {Object} params.adText - { primaryText, headline, description }
 * @param {string[]} params.placements - Selected placements
 * @param {Object} params.checklist - The checklist JSON
 * @returns {Object} AI review results keyed by item ID
 */
export async function requestAiReview({ file, adText, placements, checklist }) {
  const formData = new FormData();

  if (file) {
    formData.append('file', file);
  }

  formData.append('adText', JSON.stringify(adText));
  formData.append('placements', JSON.stringify(placements));
  formData.append('checklist', JSON.stringify(checklist));

  const res = await fetch('/api/review', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `AI review failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Extract key frames from a video file as base64 images.
 * Used client-side to send snapshots for AI analysis.
 * @param {File} videoFile
 * @param {number} count - Number of frames to extract
 * @returns {Promise<string[]>} Array of base64 data URLs
 */
export function extractVideoFrames(videoFile, count = 4) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frames = [];

    video.preload = 'auto';
    video.muted = true;

    video.onloadedmetadata = () => {
      canvas.width = Math.min(video.videoWidth, 1280);
      canvas.height = Math.min(video.videoHeight, 720);

      const duration = video.duration;
      const interval = duration / (count + 1);
      let currentFrame = 0;

      const captureFrame = () => {
        if (currentFrame >= count) {
          URL.revokeObjectURL(video.src);
          resolve(frames);
          return;
        }

        const time = interval * (currentFrame + 1);
        video.currentTime = time;
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.8));
        currentFrame++;
        captureFrame();
      };

      captureFrame();
    };

    video.onerror = () => {
      reject(new Error('Failed to load video for frame extraction'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}
