import { NextResponse } from 'next/server';

/**
 * POST /api/review
 * Receives lightweight JSON payload:
 * {
 *   adText: { primaryText, headline, description },
 *   placements: string[],
 *   checklist: Object,
 *   videoFrames: Array<{ label, time, dataUrl }>,
 *   videoMeta: { name, sizeMb, durationSec, resolution, aspectRatio },
 *   imageBase64: string | null
 * }
 *
 * Sends formatted multimodal prompt to OpenAI GPT-4o Vision.
 * Returns structured QC results with pass/fail/warning and fixes.
 */
export async function POST(request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY не настроен. Укажите ключ в .env.local или переменных Vercel.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const {
      adText = {},
      placements = [],
      checklist = {},
      videoFrames = null,
      videoMeta = null,
      imageBase64 = null,
    } = body;

    // Build the system prompt with checklist criteria
    const systemPrompt = buildSystemPrompt(checklist);

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
    return NextResponse.json(parsed);

  } catch (err) {
    console.error('AI review error:', err);
    return NextResponse.json(
      { error: `Ошибка ревью: ${err.message}` },
      { status: 500 }
    );
  }
}

/**
 * Build system prompt from checklist structure.
 */
function buildSystemPrompt(checklist) {
  let prompt = `Ты — старший QC-ревьюер рекламных креативов для Meta Ads (Facebook/Instagram/Reels).
Бренд: Академия MindBodyFace — образовательный продукт в сфере фейспластики, естественного омоложения, массажа лица и здоровья (испаноязычный рынок: Испания, Мексика, США LatAm).

ВНИМАНИЕ: Это чувствительная вертикаль (Personal Attributes / Health / Aesthetic Claims).
Meta автоматически банит рекламу, если:
1. Есть агрессивный "до/после" или фокус на недостатках ("твои морщины", "второй подбородок").
2. Текст обращается на «ты» с указанием на дефект внешности.
3. Обещаются медицинские чудеса за 24 часа.
4. В хуке (0-3 сек) нет проблемы или кадр темный/наигранный сток.
5. Важные элементы/субтитры попадают под интерфейс Reels (safe zones).

Проверь предоставленный креатив (текст, метаданные видео и кадры) строго по чек-листу.

Формат ответа (СТРОГО JSON):
{
  "results": {
    "<item_id>": {
      "status": "pass" | "fail" | "warning",
      "comment": "Краткое обоснование на русском с указанием конкретной проблемы"
    }
  },
  "summary": "Краткий вывод по креативу (2-3 предложения): готов к запуску или нужны правки монтажеру",
  "suggested_fixes": [
    {
      "item_id": "<id>",
      "was": "Что не так сейчас (в кадре/тексте)",
      "should_be": "Конкретная рекомендация монтажеру/копирайтеру как исправить"
    }
  ]
}

ЧЕК-ЛИСТ ПРОВЕРКИ:
`;

  if (checklist?.sections) {
    for (const section of checklist.sections) {
      prompt += `\n### ${section.title}\n`;
      for (const item of section.items) {
        prompt += `- [${item.id}] (${item.severity}) ${item.text}\n`;
        if (item.ai_prompt) {
          prompt += `  Инструкция проверки: ${item.ai_prompt}\n`;
        }
        if (item.bad_examples?.length) {
          prompt += `  ❌ Нарушения: ${item.bad_examples.join('; ')}\n`;
        }
        if (item.good_examples?.length) {
          prompt += `  ✅ Норма: ${item.good_examples.join('; ')}\n`;
        }
      }
    }
  }

  prompt += `\nОценивай реальные кадры видео:
- Кадр 0.1s: показана ли боль/проблема сразу?
- Кадры 0.1s - 3.0s: нет ли задержек, темных сцен, неестественного стока?
- Safe zones: нет ли критичного текста у самого верха или низа?
- Финал: есть ли понятный призыв к действию (CTA)?

Отвечай профессионально, аргументированно и только на русском языке.`;

  return prompt;
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
