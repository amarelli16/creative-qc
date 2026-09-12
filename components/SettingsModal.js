'use client';

import { useState, useEffect } from 'react';
import { getSavedChecklistUrl, saveChecklistUrl } from '@/lib/checklist-loader';

export default function SettingsModal({ isOpen, onClose, onReloadChecklist }) {
  const [checklistUrl, setChecklistUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      setChecklistUrl(getSavedChecklistUrl() || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveChecklistUrl(checklistUrl);
    onReloadChecklist?.(checklistUrl);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">⚙️ Настройки</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Checklist URL */}
          <div className="field-group">
            <label className="field-label">URL чек-листа (GitHub Raw)</label>
            <input
              type="url"
              className="field-input"
              placeholder="https://raw.githubusercontent.com/user/repo/main/checklist.json"
              value={checklistUrl}
              onChange={(e) => setChecklistUrl(e.target.value)}
            />
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Оставь пустым для использования встроенного чек-листа. 
              Поддерживаются raw.githubusercontent.com и gist.githubusercontent.com
            </div>
          </div>

          {/* API Key info */}
          <div className="field-group">
            <label className="field-label">OpenAI API Key</label>
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-info-bg)',
              border: '1px solid var(--color-info-border)',
              fontSize: '0.8125rem',
              color: 'var(--color-info)',
            }}>
              🔑 API-ключ настраивается в переменных окружения сервера (OPENAI_API_KEY в .env.local или Vercel Environment Variables). Он не хранится в браузере из соображений безопасности.
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
