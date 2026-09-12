import { SEVERITY, VERDICT } from './constants';

/**
 * QC Engine — evaluates checklist results and generates a structured verdict.
 */

/**
 * Calculate verdict from checklist results.
 * @param {Object} checklist - The loaded checklist data
 * @param {Object} results - Map of itemId → { status: 'pass'|'fail'|'warning'|'skip', comment: string }
 * @param {string[]} placements - Selected placements
 * @param {string} mediaType - 'image' | 'video' | 'text'
 * @returns {Object} Structured verdict
 */
export function calculateVerdict(checklist, results, placements = [], mediaType = 'text') {
  const applicableItems = getApplicableItems(checklist, mediaType);
  const criticalFails = [];
  const warnings = [];
  const passed = [];
  const skipped = [];

  for (const item of applicableItems) {
    const result = results[item.id];

    if (!result || result.status === 'skip') {
      skipped.push({ ...item, comment: result?.comment || '' });
      continue;
    }

    if (result.status === 'fail') {
      if (item.severity === 'critical') {
        criticalFails.push({ ...item, comment: result.comment || '' });
      } else {
        warnings.push({ ...item, comment: result.comment || '' });
      }
    } else if (result.status === 'warning') {
      warnings.push({ ...item, comment: result.comment || '' });
    } else {
      passed.push({ ...item, comment: result.comment || '' });
    }
  }

  // Determine verdict
  let verdict;
  if (criticalFails.length > 0) {
    verdict = VERDICT.REJECT;
  } else if (warnings.length > 0) {
    verdict = VERDICT.NEEDS_FIXES;
  } else {
    verdict = VERDICT.PASS;
  }

  const totalApplicable = applicableItems.length;
  const totalChecked = totalApplicable - skipped.length;
  const progressPercent = totalApplicable > 0 ? Math.round((totalChecked / totalApplicable) * 100) : 0;

  return {
    verdict,
    criticalFails,
    warnings,
    passed,
    skipped,
    stats: {
      total: totalApplicable,
      checked: totalChecked,
      passed: passed.length,
      criticalFails: criticalFails.length,
      warnings: warnings.length,
      skipped: skipped.length,
      progressPercent,
    },
  };
}

/**
 * Get items applicable to the given media type.
 */
export function getApplicableItems(checklist, mediaType) {
  if (!checklist?.sections) return [];

  const items = [];
  for (const section of checklist.sections) {
    for (const item of section.items) {
      if (item.applies_to.includes(mediaType) || item.applies_to.includes('text')) {
        items.push({ ...item, sectionId: section.id, sectionTitle: section.title });
      }
    }
  }
  return items;
}

/**
 * Get section progress (for progress bars in UI).
 */
export function getSectionProgress(section, results, mediaType) {
  const applicable = section.items.filter(
    (item) => item.applies_to.includes(mediaType) || item.applies_to.includes('text')
  );
  const checked = applicable.filter((item) => {
    const r = results[item.id];
    return r && r.status !== 'skip';
  });

  return {
    total: applicable.length,
    checked: checked.length,
    percent: applicable.length > 0 ? Math.round((checked.length / applicable.length) * 100) : 0,
  };
}

/**
 * Format verdict as a copyable text for the editor.
 */
export function formatVerdictText(verdictResult, adText = {}) {
  const { verdict, criticalFails, warnings, passed, stats } = verdictResult;

  let text = `Вердикт: ${verdict.icon} ${verdict.label}\n`;
  text += `Проверено: ${stats.checked}/${stats.total} пунктов\n\n`;

  if (criticalFails.length > 0) {
    text += `🔴 Критичные проблемы (блокируют модерацию):\n`;
    for (const item of criticalFails) {
      text += `  • ${item.text}`;
      if (item.comment) text += ` — ${item.comment}`;
      text += `\n`;
    }
    text += '\n';
  }

  if (warnings.length > 0) {
    text += `🟡 Правки перед публикацией:\n`;
    for (const item of warnings) {
      text += `  • ${item.text}`;
      if (item.comment) text += ` — ${item.comment}`;
      text += `\n`;
    }
    text += '\n';
  }

  if (passed.length > 0) {
    text += `✅ Пройдено: ${passed.length} пунктов\n\n`;
  }

  if (adText.primaryText || adText.headline) {
    text += `---\nТекст объявления:\n`;
    if (adText.headline) text += `  Headline: ${adText.headline}\n`;
    if (adText.primaryText) text += `  Primary: ${adText.primaryText}\n`;
    if (adText.description) text += `  Description: ${adText.description}\n`;
  }

  return text;
}

/**
 * Merge AI review results into the results map.
 */
export function mergeAiResults(currentResults, aiResults) {
  const merged = { ...currentResults };

  for (const [itemId, aiResult] of Object.entries(aiResults)) {
    merged[itemId] = {
      status: aiResult.status,
      comment: aiResult.comment || '',
      aiGenerated: true,
    };
  }

  return merged;
}
