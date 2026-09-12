'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import UploadZone from '@/components/UploadZone';
import ChecklistPanel from '@/components/ChecklistPanel';
import VerdictCard from '@/components/VerdictCard';
import SettingsModal from '@/components/SettingsModal';
import { loadChecklist, reloadChecklist } from '@/lib/checklist-loader';
import { calculateVerdict, mergeAiResults } from '@/lib/qc-engine';
import { requestAiReview } from '@/lib/ai-reviewer';
import { PLACEMENTS, SUPPORTED_VIDEO_TYPES } from '@/lib/constants';

export default function Home() {
  // State
  const [checklist, setChecklist] = useState(null);
  const [file, setFile] = useState(null);
  const [adText, setAdText] = useState({
    primaryText: '',
    headline: '',
    description: '',
  });
  const [placements, setPlacements] = useState([]);
  const [results, setResults] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatusText, setAiStatusText] = useState('');
  const [checklistLoading, setChecklistLoading] = useState(true);

  // Determine media type
  const mediaType = file
    ? SUPPORTED_VIDEO_TYPES.includes(file.type)
      ? 'video'
      : 'image'
    : 'text';

  // Load checklist on mount
  useEffect(() => {
    setChecklistLoading(true);
    loadChecklist()
      .then((data) => {
        if (data) setChecklist(data);
      })
      .finally(() => setChecklistLoading(false));
  }, []);

  // Calculate verdict
  const verdictResult =
    checklist && Object.keys(results).length > 0
      ? calculateVerdict(checklist, results, placements, mediaType)
      : null;

  // Handlers
  const handleResultChange = useCallback((itemId, result) => {
    setResults((prev) => ({ ...prev, [itemId]: result }));
  }, []);

  const handlePlacementToggle = useCallback((placementId) => {
    setPlacements((prev) =>
      prev.includes(placementId)
        ? prev.filter((p) => p !== placementId)
        : [...prev, placementId]
    );
  }, []);

  const handleReloadChecklist = useCallback(async (url) => {
    setChecklistLoading(true);
    try {
      const data = await reloadChecklist(url || undefined);
      if (data) {
        setChecklist(data);
        showToast('success', '✅ Чек-лист обновлён');
      }
    } catch {
      showToast('error', '❌ Не удалось загрузить чек-лист');
    } finally {
      setChecklistLoading(false);
    }
  }, []);

  const handleAiReview = useCallback(async () => {
    if (!checklist) return;

    setAiLoading(true);
    setAiStatusText('Подготовка к анализу...');
    try {
      const aiResult = await requestAiReview({
        file,
        adText,
        placements,
        checklist,
        onProgress: (stage) => {
          if (stage === 'extracting') {
            setAiStatusText('Извлекаем опорные кадры видео (хук, динамика, CTA)...');
          } else if (stage === 'analyzing') {
            setAiStatusText('GPT-4o анализирует кадры и текст...');
          }
        },
      });

      if (aiResult.results) {
        const merged = mergeAiResults(results, aiResult.results);
        setResults(merged);
      }

      // Store suggested fixes if available
      if (aiResult.suggested_fixes) {
        setResults((prev) => ({
          ...prev,
          _suggestedFixes: aiResult.suggested_fixes,
        }));
      }

      showToast('success', '🤖 AI-ревью завершено');
    } catch (err) {
      showToast('error', `❌ AI-ревью: ${err.message}`);
    } finally {
      setAiLoading(false);
      setAiStatusText('');
    }
  }, [checklist, file, adText, placements, results]);

  const handleReset = useCallback(() => {
    setFile(null);
    setAdText({ primaryText: '', headline: '', description: '' });
    setPlacements([]);
    setResults({});
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopy = () => {
    showToast('success', '📋 Скопировано в буфер обмена');
  };

  const handleError = (msg) => {
    showToast('error', msg);
  };

  // Has any content been entered?
  const hasContent = file || adText.primaryText || adText.headline || adText.description;

  return (
    <div className="app-container">
      <Header onSettingsClick={() => setShowSettings(true)} />

      <div className="main-grid">
        {/* Left Panel — Upload & Input */}
        <div className="panel">
          {/* Upload Zone */}
          <div className="animate-in">
            <UploadZone
              file={file}
              onFileChange={setFile}
              onError={handleError}
            />
          </div>

          {/* Ad Text */}
          <div className="glass-card animate-in stagger-1" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '0.875rem', fontWeight: 600 }}>
              📝 Текст объявления
            </h3>
            <div className="ad-text-section">
              <div className="field-group">
                <label className="field-label">Headline</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Заголовок объявления..."
                  value={adText.headline}
                  onChange={(e) =>
                    setAdText((prev) => ({ ...prev, headline: e.target.value }))
                  }
                />
              </div>
              <div className="field-group">
                <label className="field-label">Primary Text</label>
                <textarea
                  className="field-textarea"
                  placeholder="Основной текст объявления..."
                  value={adText.primaryText}
                  onChange={(e) =>
                    setAdText((prev) => ({
                      ...prev,
                      primaryText: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="field-group">
                <label className="field-label">Description</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Дополнительное описание..."
                  value={adText.description}
                  onChange={(e) =>
                    setAdText((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Placements */}
          <div className="glass-card animate-in stagger-2" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '0.875rem', fontWeight: 600 }}>
              📱 Плейсменты
            </h3>
            <div className="placement-selector">
              {PLACEMENTS.map((p) => (
                <button
                  key={p.id}
                  className={`placement-chip ${placements.includes(p.id) ? 'active' : ''}`}
                  onClick={() => handlePlacementToggle(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {placements.length > 0 && (
              <div style={{ marginTop: 12, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                {PLACEMENTS.filter((p) => placements.includes(p.id)).map((p) => (
                  <div key={p.id} style={{ marginBottom: 4 }}>
                    <strong>{p.label}:</strong> {p.aspect} • Safe zone: {p.safeZone}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Review Button */}
          {hasContent && (
            <div className="glass-card animate-in stagger-3 ai-review-section">
              {aiLoading ? (
                <div className="ai-loading">
                  <div className="ai-spinner" />
                  <div className="ai-loading-text">
                    {aiStatusText || '🤖 AI анализирует креатив...'}
                  </div>
                </div>
              ) : (
                <>
                  <button
                    className="btn btn-primary btn-lg ai-review-btn"
                    onClick={handleAiReview}
                    disabled={aiLoading}
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      padding: 2,
                      background: 'var(--primary-gradient)',
                    }}
                  >
                    <span>🤖 Запустить AI-ревью</span>
                  </button>
                  <div style={{
                    marginTop: 8,
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                  }}>
                    GPT-4o Vision проанализирует креатив по чек-листу
                  </div>
                </>
              )}
            </div>
          )}

          {/* Reset Button */}
          {hasContent && (
            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-ghost" onClick={handleReset}>
                🗑️ Очистить всё
              </button>
            </div>
          )}
        </div>

        {/* Right Panel — Checklist & Verdict */}
        <div className="panel">
          {/* Checklist */}
          {checklistLoading ? (
            <div className="glass-card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
              <div className="ai-spinner" style={{ margin: '0 auto var(--space-md)' }} />
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Загрузка чек-листа...
              </div>
            </div>
          ) : (
            <div className="animate-in stagger-1">
              <ChecklistPanel
                checklist={checklist}
                results={results}
                onResultChange={handleResultChange}
                mediaType={mediaType}
              />
            </div>
          )}

          {/* Verdict */}
          {verdictResult && (
            <div className="animate-in stagger-2">
              <VerdictCard
                verdictResult={{
                  ...verdictResult,
                  suggestedFixes: results._suggestedFixes || [],
                }}
                adText={adText}
                onCopy={handleCopy}
              />
            </div>
          )}

          {/* Empty state when no results */}
          {!verdictResult && !checklistLoading && (
            <div className="glass-card empty-state animate-in stagger-3">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">
                Загрузи креатив и пройди чек-лист — здесь появится вердикт
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onReloadChecklist={handleReloadChecklist}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
