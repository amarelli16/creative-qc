import { NextResponse } from 'next/server';
import defaultChecklist from '@/data/default-checklist.json';

/**
 * POST /api/review
 * Multimodal AI QC audit for Meta Ads creative drafts (GPT-4o Vision).
 */
export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json(
      { error: 'Неверный JSON запрос' },
      { status: 400 }
    );
  }

  // Priority: 1. Server env variable -> 2. Client header -> 3. Request body
  const serverKey = process.env.OPENAI_API_KEY;
  const headerKey = request.headers.get('x-openai-key');
  const bodyKey = body?.apiKey;
  const apiKey = (serverKey || headerKey || bodyKey || '').trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY не настроен. Укажите ключ в ⚙️ Настройках сервиса (вверху справа) или в переменных окружения Vercel.' },
      { status: 401 }
    );
  }

  try {
    const {
      adText = {},
      placements = [],
      checklist = null,
      videoFrames = null,
      videoMeta = null,
      imageBase64 = null,
    } = body;

    // Guaranteed fallback to default checklist if client sends empty object
    const activeChecklist =
      checklist && checklist.sections && checklist.sections.length > 0
        ? checklist
        : defaultChecklist;

    // Extract all items from checklist
    const allItems = [];
    for (const section of activeChecklist.sections) {
      for (const item of section.items) {
        allItems.push(item);
      }
    }

    // Build the system prompt with checklist criteria & strict ID enforcement
    const systemPrompt = buildSystemPrompt(activeChecklist, allItems);

    // Build multimodal user message (text + video frames / image)
    const userContent = buildUserContent({
      adText,
      placements,
      videoFrames,
      videoMeta,
      imageBase64,
    });

    // Call OpenAI GPT-4o
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: `OpenAI API error: ${err.error?.message || response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'Пустой ответ от OpenAI' },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(content);

    // Strictly normalize AI results so all keys match the checklist item IDs
    const normalizedResults = normalizeResults(parsed.results, allItems);

    return NextResponse.json({
      results: normalizedResults,
      summary: parsed.summary || 'Анализ завершён.',
      suggested_fixes: parsed.suggested_fixes || [],
    });

  } catch (err) {
    console.error('AI review error:', err);
    return NextResponse.json(
      { error: `Ошибка ревью: ${err.message}` },
      { status: 500 }
    );
  }
}

/**
 * Build system prompt from checklist structure with strict ID enforcement.
 */
function buildSystemPrompt(checklist, allItems) {
  const validIds = allItems.map((i) => i.id);

  let prompt = `Ты — ведущий QC-ревьюер рекламных креативов для Meta Ads (Facebook/Instagram/Reels).
Бренд: Академия MindBodyFace — образовательный продукт в сфере фейспластики, естественного омоложения, массажа лица и здоровья.
МУЛЬТИЯЗЫЧНЫЙ: креативы могут быть на любом языке (ES, EN, RU и др.). Обращение на «ты» / «tú» / «you» — ДОПУСТИМО. Нарушение — только когда обращение СОЧЕТАЕТСЯ с указанием на физический дефект внешности.

ВНИМАНИЕ: Это чувствительная вертикаль (Personal Attributes / Health / Aesthetic Claims).
Meta банит рекламу за:
1. Агрессивный "до/после" или фокус на недостатках ("твои морщины", "второй подбородок").
2. Обращение к зрителю С УКАЗАНИЕМ на дефект внешности (само «ты» допустимо!).
3. Медицинские обещания («cura», «elimina», результат за 24 часа).
4. Затянутый темный хук (боль должна быть с 0-й секунды).
5. Текст или субтитры под интерфейсом Reels/Stories (safe zones).
6. Кликбейтный хук (привлекает зевак, а не целевую аудиторию). По данным 140 крео: hook rate > 33% — красный флаг кликбейта.

ТВОЯ ЗАДАЧА:
Проверить креатив (текст, метаданные и прикрепленные кадры) по каждому применимому пункту регламента.

КРИТИЧЕСКИ ВАЖНО ДЛЯ ПОЛЯ "results":
Ключами объекта "results" ДОЛЖНЫ БЫТЬ ТОЛЬКО точные ID пунктов из списка:
${validIds.map((id) => `"${id}"`).join(', ')}

НИКОГДА НЕ ПРИДУМЫВАЙ СВОИ КЛЮЧИ (никаких "headline", "hook", "safe_zones" и т.п.)!
Используй ТОЛЬКО идентификаторы: "pa-001", "pa-002", "ba-001", "vp-001", "tr-001", "ac-001" и т.д.

ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "results": {
    "pa-001": {
      "status": "pass" | "fail" | "warning" | "skip",
      "comment": "Пояснение на русском с указанием конкретной проблемы или подтверждением нормы"
    },
    "vp-001": {
      "status": "pass" | "fail" | "warning" | "skip",
      "comment": "Пояснение по хуку 0.1с"
    }
  },
  "summary": "Краткий вывод по креативу (2-3 предложения): готов к запуску или нужны правки монтажеру",
  "suggested_fixes": [
    {
      "item_id": "<id из списка выше>",
      "was": "Что не так сейчас в кадре или тексте",
      "should_be": "Конкретная рекомендация монтажеру/копирайтеру как исправить"
    }
  ]
}

СПИСОК ВСЕХ ПУНКТОВ РЕГЛАМЕНТА:
`;

  if (checklist?.sections) {
    for (const section of checklist.sections) {
      prompt += `\n### [${section.id}] ${section.title}\n`;
      for (const item of section.items) {
        prompt += `- ID: "${item.id}" (${item.severity}) ${item.text}\n`;
        if (item.ai_prompt) {
          prompt += `  Инструкция: ${item.ai_prompt}\n`;
        }
        if (item.bad_examples?.length) {
          prompt += `  ❌ Нарушение: ${item.bad_examples.join('; ')}\n`;
        }
        if (item.good_examples?.length) {
          prompt += `  ✅ Норма: ${item.good_examples.join('; ')}\n`;
        }
      }
    }
  }

  prompt += `\nОбязательно оцени каждый применимый пункт!
- Кадр 0.1s: показана ли проблема сразу (vp-001)?
- Safe zones Reels: нет ли текста под UI (tr-001, tr-003)?
- Персональные атрибуты: обращение к зрителю С УКАЗАНИЕМ на дефект (pa-001, pa-002)? Просто «ты» без дефекта — OK!
- CTA и логотип (bc-001, bc-004)?
- Хук не кликбейтный (vp-009)? Привлекает ли целевую аудиторию?
- Середина видео удерживает (vp-010)? Нет ли резкого обвала после хука?

Отвечай строго на русском языке.`;

  return prompt;
}

/**
 * Normalize AI results so keys match the checklist item IDs 100%.
 */
function normalizeResults(rawResults, allItems) {
  const normalized = {};
  if (!rawResults || typeof rawResults !== 'object') return normalized;

  // Build lookup map for IDs (exact, lowercase, underscores)
  const idMap = new Map();
  for (const item of allItems) {
    idMap.set(item.id.toLowerCase(), item.id);
    idMap.set(item.id.replace(/-/g, '_').toLowerCase(), item.id);
    idMap.set(item.id.replace(/-/g, '').toLowerCase(), item.id);
  }

  for (const [key, val] of Object.entries(rawResults)) {
    if (!val || typeof val !== 'object') continue;

    const cleanKey = key.trim().toLowerCase().replace(/[\[\]"]/g, '');
    let matchedId = idMap.get(cleanKey);

    // Semantic fallbacks if AI slipped into descriptive names
    if (!matchedId) {
      if (cleanKey.includes('clickbait') || cleanKey.includes('кликбейт') || cleanKey.includes('bait')) {
        matchedId = 'vp-009';
      } else if (cleanKey.includes('retention') || cleanKey.includes('mid_video') || cleanKey.includes('middle') || cleanKey.includes('середин')) {
        matchedId = 'vp-010';
      } else if (cleanKey.includes('hook') || cleanKey.includes('0.1s') || cleanKey.includes('0-3')) {
        matchedId = 'vp-001';
      } else if (cleanKey.includes('personal') || cleanKey.includes('attribute') || cleanKey.includes('arrugas')) {
        matchedId = 'pa-001';
      } else if (cleanKey.includes('before') || cleanKey.includes('after') || cleanKey.includes('antes') || cleanKey.includes('despues')) {
        matchedId = 'ba-002';
      } else if (cleanKey.includes('medical') || cleanKey.includes('cura') || cleanKey.includes('elimina')) {
        matchedId = 'mc-001';
      } else if (cleanKey.includes('safe') || cleanKey.includes('zone') || cleanKey.includes('aspect')) {
        matchedId = 'tr-001';
      } else if (cleanKey.includes('subtitle') || cleanKey.includes('subtitulo')) {
        matchedId = 'tr-002';
      } else if (cleanKey.includes('logo') || cleanKey.includes('brand')) {
        matchedId = 'bc-001';
      } else if (cleanKey.includes('cta') || cleanKey.includes('call_to_action')) {
        matchedId = 'bc-004';
      } else if (cleanKey.includes('sensational') || cleanKey.includes('headline') || cleanKey.includes('copy')) {
        matchedId = 'ac-001';
      }
    }

    if (matchedId) {
      let status = val.status?.toLowerCase() || 'pass';
      if (!['pass', 'fail', 'warning', 'skip'].includes(status)) {
        status = status.includes('fail') ? 'fail' : status.includes('warn') ? 'warning' : 'pass';
      }

      normalized[matchedId] = {
        status,
        comment: val.comment || '',
        aiGenerated: true,
      };
    }
  }

  return normalized;
}

/**
 * Build multimodal user message content.
 */
function buildUserContent({ adText, placements, videoFrames, videoMeta, imageBase64 }) {
  const content = [];

  let textPart = 'Пожалуйста, проверь следующий креатив:\n\n';

  if (videoMeta) {
    textPart += `📹 ТЕХНИЧЕСКИЕ ПАРАМЕТРЫ ВИДЕО:\n`;
    textPart += `- Файл: ${videoMeta.name} (${videoMeta.sizeMb} МБ)\n`;
    textPart += `- Длительность: ${videoMeta.durationSec} сек\n`;
    textPart += `- Разрешение: ${videoMeta.resolution} [Соотношение: ${videoMeta.aspectRatio}]\n\n`;
  }

  if (placements && placements.length > 0) {
    textPart += `📱 Целевые плейсменты: ${placements.join(', ')}\n\n`;
  }

  textPart += `📝 РЕКЛАМНЫЙ КОПИРАЙТ:\n`;
  textPart += `- Headline: ${adText.headline || '(не указан)'}\n`;
  textPart += `- Primary Text: ${adText.primaryText || '(не указан)'}\n`;
  textPart += `- Description: ${adText.description || '(не указан)'}\n\n`;

  if (videoFrames && videoFrames.length > 0) {
    textPart += `🎞️ КЛЮЧЕВЫЕ КАДРЫ ВИДЕО ДЛЯ QC-АНАЛИЗА:\nНиже прикреплены ${videoFrames.length} опорных кадров ролика с точными таймкодами (хук 0.1с, 1.5с, 3с, середина и финал):\n`;
  }

  content.push({ type: 'text', text: textPart });

  // Attach video frames
  if (videoFrames && Array.isArray(videoFrames)) {
    for (const frame of videoFrames) {
      content.push({
        type: 'text',
        text: `📍 [Кадр таймкода: ${frame.label}]`,
      });
      content.push({
        type: 'image_url',
        image_url: {
          url: frame.dataUrl,
          detail: 'high',
        },
      });
    }
  }

  // Attach static image if image mode
  if (imageBase64) {
    content.push({
      type: 'text',
      text: '🖼️ Изображение креатива (баннер):',
    });
    content.push({
      type: 'image_url',
      image_url: {
        url: imageBase64,
        detail: 'high',
      },
    });
  }

  return content;
}
