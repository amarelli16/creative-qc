'use client';

import { useState, useCallback } from 'react';
import { getSectionProgress } from '@/lib/qc-engine';

export default function ChecklistPanel({
  checklist,
  results,
  onResultChange,
  mediaType,
}) {
  const [openSections, setOpenSections] = useState(new Set());
  const [showOnlyFailed, setShowOnlyFailed] = useState(false);

  const toggleSection = useCallback((sectionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  if (!checklist?.sections) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-text">Чек-лист не загружен</div>
      </div>
    );
  }

  return (
    <div>
      <div className="checklist-header">
        <h2>📋 Чек-лист</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showOnlyFailed}
            onChange={(e) => setShowOnlyFailed(e.target.checked)}
          />
          Только проваленные
        </label>
      </div>

      {checklist.sections.map((section) => (
        <ChecklistSection
          key={section.id}
          section={section}
          results={results}
          onResultChange={onResultChange}
          mediaType={mediaType}
          isOpen={openSections.has(section.id)}
          onToggle={() => toggleSection(section.id)}
          showOnlyFailed={showOnlyFailed}
        />
      ))}
    </div>
  );
}

function ChecklistSection({
  section,
  results,
  onResultChange,
  mediaType,
  isOpen,
  onToggle,
  showOnlyFailed,
}) {
  const progress = getSectionProgress(section, results, mediaType);

  // Filter applicable items
  const applicableItems = section.items.filter(
    (item) => item.applies_to.includes(mediaType) || item.applies_to.includes('text')
  );

  // Filter by failed if needed
  const displayItems = showOnlyFailed
    ? applicableItems.filter((item) => {
        const r = results[item.id];
        return r && (r.status === 'fail' || r.status === 'warning');
      })
    : applicableItems;

  if (applicableItems.length === 0) return null;

  return (
    <div className="checklist-section animate-in">
      <div className="section-header" onClick={onToggle}>
        <span className="section-icon">{section.icon}</span>
        <div className="section-info">
          <div className="section-title">{section.title}</div>
          <div className="section-count">
            {progress.checked}/{progress.total} проверено
          </div>
        </div>
        <div className="section-progress">
          <div
            className="section-progress-bar"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <span className={`section-chevron ${isOpen ? 'open' : ''}`}>▼</span>
      </div>

      {isOpen && (
        <div className="section-items">
          {displayItems.map((item) => (
            <ChecklistItem
              key={item.id}
              item={item}
              result={results[item.id]}
              onResultChange={onResultChange}
            />
          ))}
          {showOnlyFailed && displayItems.length === 0 && (
            <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ✅ Все пункты пройдены
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChecklistItem({ item, result, onResultChange }) {
  const [showExamples, setShowExamples] = useState(false);
  const currentStatus = result?.status || 'skip';

  const handleStatusClick = (status) => {
    // Toggle off if clicking the same status
    const newStatus = currentStatus === status ? 'skip' : status;
    onResultChange(item.id, {
      ...result,
      status: newStatus,
      comment: result?.comment || '',
    });
  };

  const handleCommentChange = (e) => {
    onResultChange(item.id, {
      ...result,
      status: result?.status || 'skip',
      comment: e.target.value,
    });
  };

  return (
    <div className="checklist-item">
      <div className="item-status-buttons">
        <button
          className={`status-btn ${currentStatus === 'pass' ? 'pass' : ''}`}
          onClick={() => handleStatusClick('pass')}
          title="Пройдено"
        >
          ✓
        </button>
        <button
          className={`status-btn ${currentStatus === 'fail' ? 'fail' : ''}`}
          onClick={() => handleStatusClick('fail')}
          title="Не пройдено"
        >
          ✕
        </button>
        <button
          className={`status-btn ${currentStatus === 'warning' ? 'warn' : ''}`}
          onClick={() => handleStatusClick('warning')}
          title="Предупреждение"
        >
          !
        </button>
      </div>
      <div className="item-content">
        <div className="item-text">
          {item.text}
          <span className={`item-severity ${item.severity}`}>
            {item.severity === 'critical' ? 'критично' : item.severity === 'warning' ? 'важно' : 'инфо'}
          </span>
          {result?.aiGenerated && (
            <span className="item-ai-badge">🤖 AI</span>
          )}
          {(item.bad_examples?.length > 0 || item.good_examples?.length > 0) && (
            <button
              onClick={() => setShowExamples(!showExamples)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.6875rem',
                marginLeft: 8,
                textDecoration: 'underline',
              }}
            >
              {showExamples ? 'скрыть' : 'примеры'}
            </button>
          )}
        </div>

        {showExamples && (
          <div className="item-examples">
            {item.bad_examples?.length > 0 && (
              <div>❌ {item.bad_examples.join(' • ')}</div>
            )}
            {item.good_examples?.length > 0 && (
              <div>✅ {item.good_examples.join(' • ')}</div>
            )}
          </div>
        )}

        {(currentStatus === 'fail' || currentStatus === 'warning' || result?.comment) && (
          <div className="item-comment">
            <textarea
              className="item-comment-input"
              placeholder="Комментарий..."
              value={result?.comment || ''}
              onChange={handleCommentChange}
              rows={2}
            />
          </div>
        )}
      </div>
    </div>
  );
}
