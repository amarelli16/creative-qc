'use client';

import { useMemo } from 'react';
import { formatVerdictText } from '@/lib/qc-engine';

export default function VerdictCard({ verdictResult, adText, onCopy }) {
  const { verdict, criticalFails, warnings, passed, stats } = verdictResult;

  const verdictClass = useMemo(() => {
    if (verdict.label === 'ГОДЕН') return 'pass';
    if (verdict.label === 'ОТКЛОНИТЬ') return 'reject';
    if (verdict.label === 'НЕ ПРОВЕРЕНО') return 'unverified';
    return 'needs-fixes';
  }, [verdict]);

  const handleCopy = () => {
    const text = formatVerdictText(verdictResult, adText);
    navigator.clipboard.writeText(text).then(() => {
      onCopy?.();
    });
  };

  return (
    <div className={`verdict-card glass-card ${verdictClass} animate-in`}>
      <div className="verdict-icon">{verdict.icon}</div>
      <div className="verdict-label" style={{ color: verdict.color }}>
        {verdict.label}
      </div>

      <div className="verdict-stats">
        <div className="stat">
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>
            {stats.passed}
          </div>
          <div className="stat-label">Пройдено</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: 'var(--color-critical)' }}>
            {stats.criticalFails}
          </div>
          <div className="stat-label">Критично</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
            {stats.warnings}
          </div>
          <div className="stat-label">Правки</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: 'var(--text-muted)' }}>
            {stats.skipped}
          </div>
          <div className="stat-label">Пропущено</div>
        </div>
      </div>

      {/* Progress */}
      <div className="progress-bar-container" style={{ marginBottom: 'var(--space-lg)' }}>
        <div
          className="progress-bar"
          style={{ width: `${stats.progressPercent}%` }}
        />
      </div>

      {/* Critical Issues */}
      {criticalFails.length > 0 && (
        <div className="verdict-issues">
          <h4 style={{ color: 'var(--color-critical)' }}>
            🔴 Критичные проблемы
          </h4>
          {criticalFails.map((item) => (
            <div key={item.id} className="issue-item">
              <span className="issue-icon">🔴</span>
              <div>
                <div className="issue-text">{item.text}</div>
                {item.comment && (
                  <div className="issue-comment">💬 {item.comment}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="verdict-issues">
          <h4 style={{ color: 'var(--color-warning)' }}>
            🟡 Правки перед публикацией
          </h4>
          {warnings.map((item) => (
            <div key={item.id} className="issue-item">
              <span className="issue-icon">🟡</span>
              <div>
                <div className="issue-text">{item.text}</div>
                {item.comment && (
                  <div className="issue-comment">💬 {item.comment}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Fix Suggestions */}
      {verdictResult.suggestedFixes?.length > 0 && (
        <div className="verdict-issues">
          <h4>💡 Предложенные исправления</h4>
          {verdictResult.suggestedFixes.map((fix, i) => (
            <div key={i} className="fix-suggestion">
              <div className="fix-was">
                <strong>Было:</strong> {fix.was}
              </div>
              <div className="fix-should">
                <strong>Стало:</strong> {fix.should_be}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="verdict-actions">
        <button className="btn btn-primary btn-lg" onClick={handleCopy}>
          📋 Скопировать для монтажёра
        </button>
      </div>
    </div>
  );
}
