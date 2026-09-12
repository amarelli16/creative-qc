// Creative QC — Constants & Design Tokens

// Default checklist source URL (GitHub raw)
export const DEFAULT_CHECKLIST_URL =
  'https://raw.githubusercontent.com/amarelli16/creative-qc-checklist/main/checklist.json';

// Local fallback
export const LOCAL_CHECKLIST_PATH = '/data/default-checklist.json';

// Cache TTL for checklist (5 minutes)
export const CHECKLIST_CACHE_TTL = 5 * 60 * 1000;

// Supported file types
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
export const ALL_SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES];

// Max file size (100MB for video, 10MB for images)
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// Placement definitions
export const PLACEMENTS = [
  {
    id: 'feed',
    label: 'Feed (FB/IG)',
    aspect: '1:1 / 4:5',
    safeZone: 'Без строгих safe zone, текст на картинке — минимально',
    videoMax: '240 мин, рекомендуется 15–30 сек',
  },
  {
    id: 'stories',
    label: 'Stories',
    aspect: '9:16 (1080×1920)',
    safeZone: 'Верх ~14% и низ ~20% перекрываются UI',
    videoMax: 'до 60 сек оптимально',
  },
  {
    id: 'reels',
    label: 'Reels',
    aspect: '9:16 (1080×1920)',
    safeZone: 'Верх/низ + нижний правый угол (иконки)',
    videoMax: 'до 90 сек, субтитры обязательны',
  },
  {
    id: 'audience-network',
    label: 'Audience Network',
    aspect: '1:1 / 9:16',
    safeZone: '—',
    videoMax: '—',
  },
];

// Severity config
export const SEVERITY = {
  critical: {
    label: 'Критично',
    color: '#FF6B6B',
    bgColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
    icon: '🔴',
  },
  warning: {
    label: 'Предупреждение',
    color: '#FECA57',
    bgColor: 'rgba(254, 202, 87, 0.1)',
    borderColor: 'rgba(254, 202, 87, 0.3)',
    icon: '🟡',
  },
  info: {
    label: 'Инфо',
    color: '#54A0FF',
    bgColor: 'rgba(84, 160, 255, 0.1)',
    borderColor: 'rgba(84, 160, 255, 0.3)',
    icon: '🔵',
  },
};

// Verdict types
export const VERDICT = {
  PASS: {
    label: 'ГОДЕН',
    color: '#00D2D3',
    bgGradient: 'linear-gradient(135deg, rgba(0, 210, 211, 0.15), rgba(0, 210, 211, 0.05))',
    icon: '✅',
  },
  NEEDS_FIXES: {
    label: 'НУЖНЫ ПРАВКИ',
    color: '#FECA57',
    bgGradient: 'linear-gradient(135deg, rgba(254, 202, 87, 0.15), rgba(254, 202, 87, 0.05))',
    icon: '⚠️',
  },
  REJECT: {
    label: 'ОТКЛОНИТЬ',
    color: '#FF6B6B',
    bgGradient: 'linear-gradient(135deg, rgba(255, 107, 107, 0.15), rgba(255, 107, 107, 0.05))',
    icon: '❌',
  },
};

// AI Providers
export const AI_PROVIDERS = {
  openai: {
    label: 'OpenAI GPT-4o',
    model: 'gpt-4o',
    endpoint: '/api/review',
  },
};
