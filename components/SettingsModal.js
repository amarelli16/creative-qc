'use client';

import { useState, useEffect } from 'react';
import {
  getSavedChecklistUrl,
  saveChecklistUrl,
  getSavedApiKey,
  saveApiKey,
} from '@/lib/checklist-loader';

export default function SettingsModal({ isOpen, onClose, onReloadChecklist }) {
  const [checklistUrl, setChecklistUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setChecklistUrl(getSavedChecklistUrl() || '');
      setApiKey(getSavedApiKey() || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveChecklistUrl(checklistUrl);
    saveApiKey(apiKey);
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
          {/* OpenAI API Key */}
          <div className="field-group">
            <label className="field-label">OpenAI API Key (GPT-4o Vision)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type={showKey ? 'text' : 'password'}
                className="field-input"
                placeholder="sk-proj-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8125rem' }}
              />
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '0.75rem', padding: '0 12px' }}
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? 'Скрыть' : 'Показать'}
              </button>
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 4 }}>
              💡 Ключ сохраняется локально в браузере. Это позволяет запускать AI-ревью на Vercel даже без настройки переменных окружения в панели Vercel.
            </div>
          </div>

          {/* Checklist URL */}
          <div className="field-group">
            <label className="field-label">URL чек-листа (GitHub Raw)</label>
            <input
              type="url"
              className="field-input"
              placeholder="https://raw.githubusercontent.com/amarelli16/creative-qc-checklist/main/checklist.json"
              value={checklistUrl}
              onChange={(e) => setChecklistUrl(e.target.value)}
              style={{ fontSize: '0.8125rem' }}
            />
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 4 }}>
              По умолчанию используется динамический чек-лист из GitHub репозитория amarelli16/creative-qc-checklist.
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Сохранить настройки
          </button>
        </div>
      </div>
    </div>
  );
}
