import { NextResponse } from 'next/server';

/**
 * POST /api/review
 * Receives creative media + ad text + checklist,
 * sends to OpenAI GPT-4o Vision for QC analysis.
 * Returns structured verdict per checklist item.
 */
export async function POST(request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured. Set it in environment variables.' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const adText = JSON.parse(formData.get('adText') || '{}');
    const placements = JSON.parse(formData.get('placements') || '[]');
    const checklist = JSON.parse(formData.get('checklist') || '{}');

    // Build the prompt from checklist
    const systemPrompt = buildSystemPrompt(checklist);
    const userContent = await buildUserContent(file, adText, placements);

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
        { error: 'Empty response from AI' },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);

  } catch (err) {
    console.error('AI review error:', err);
    return NextResponse.json(
      { error: `Review failed: ${err.message}` },
      { status: 500 }
    );
  }
}

/**
 * Build system prompt from checklist structure.
 */
function buildSystemPrompt(checklist) {
  let prompt = `Ты — QC-ревьюер рекламных креативов для Meta Ads (Facebook/Instagram).
Академия MindBodyFace — образовательный продукт в сфере фейспластики/массажа лица/бьюти, испаноязычный рынок.
Это чувствительная вертикаль: Meta банит контент, который выглядит как медицинское обещание или комментирует внешность/тело зрителя.

Проверь креатив по следующему чек-листу и верни JSON с результатами.

Формат ответа (строго JSON):
{
  "results": {
    "<item_id>": {
      "status": "pass" | "fail" | "warning",
      "comment": "Краткое пояснение"
    }
  },
  "summary": "Общий краткий вывод",
  "suggested_fixes": [
    {
      "item_id": "<id>",
      "was": "Проблемный текст/описание",
      "should_be": "Исправленный вариант"
    }
  ]
}

ЧЕК-ЛИСТ:
`;

  if (checklist?.sections) {
    for (const section of checklist.sections) {
      prompt += `\n### ${section.title}\n`;
      for (const item of section.items) {
        prompt += `- [${item.id}] (${item.severity}) ${item.text}\n`;
        if (item.ai_prompt) {
          prompt += `  Инструкция: ${item.ai_prompt}\n`;
        }
        if (item.bad_examples?.length) {
          prompt += `  ❌ Примеры нарушений: ${item.bad_examples.join('; ')}\n`;
        }
        if (item.good_examples?.length) {
          prompt += `  ✅ Правильно: ${item.good_examples.join('; ')}\n`;
        }
      }
    }
  }

  prompt += `\nПроверяй только те пункты, которые применимы к предоставленному контенту.
Не одобряй креатив с критичными проблемами — дай конкретную переформулировку.
Отвечай на русском.`;

  return prompt;
}

/**
 * Build user message content with text and optional image.
 */
async function buildUserContent(file, adText, placements) {
  const content = [];

  // Text part
  let textPart = 'Проверь следующий рекламный креатив:\n\n';

  if (placements.length > 0) {
    textPart += `Плейсменты: ${placements.join(', ')}\n\n`;
  }

  if (adText.headline) {
    textPart += `Headline: ${adText.headline}\n`;
  }
  if (adText.primaryText) {
    textPart += `Primary Text: ${adText.primaryText}\n`;
  }
  if (adText.description) {
    textPart += `Description: ${adText.description}\n`;
  }

  content.push({ type: 'text', text: textPart });

  // Image part (if file is an image)
  if (file && file.type?.startsWith('image/')) {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = file.type;

    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${base64}`,
        detail: 'high',
      },
    });
  }

  // For video files, we get frames client-side and send them as separate images
  // The client extracts key frames before sending to this endpoint
  if (file && file.type?.startsWith('video/')) {
    textPart += '\n[Видео-файл загружен. Для полного анализа видео используйте извлечение ключевых кадров на клиенте.]';
    // Still try to read as best we can
    content[0] = { type: 'text', text: textPart };
  }

  return content;
}

// Increase body size limit for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
