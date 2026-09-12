'use client';

import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  ALL_SUPPORTED_TYPES,
  MAX_VIDEO_SIZE,
  MAX_IMAGE_SIZE,
} from '@/lib/constants';

export default function UploadZone({ file, onFileChange, onError }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processStage, setProcessStage] = useState('');
  const [pendingFile, setPendingFile] = useState(null);

  const validateFile = useCallback(
    (f) => {
      if (!ALL_SUPPORTED_TYPES.includes(f.type)) {
        onError?.(`Неподдерживаемый формат: ${f.type || 'неизвестный'}. Поддерживаются MP4, MOV, WebM, JPG, PNG, WebP.`);
        return false;
      }

      const isVideo = SUPPORTED_VIDEO_TYPES.includes(f.type);
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

      if (f.size > maxSize) {
        const sizeStr = maxSize >= 1024 * 1024 * 1024
          ? `${(maxSize / (1024 * 1024 * 1024)).toFixed(0)} ГБ`
          : `${Math.round(maxSize / 1024 / 1024)} МБ`;
        onError?.(`Файл слишком большой (${(f.size / 1024 / 1024).toFixed(1)} МБ). Максимум: ${sizeStr}`);
        return false;
      }

      return true;
    },
    [onError]
  );

  const processAndSetFile = useCallback(
    (f) => {
      if (!validateFile(f)) return;

      setIsProcessing(true);
      setPendingFile(f);
      setProcessProgress(15);
      setProcessStage('Буферизация медиафайла в браузере...');

      // Smooth staged progress bar so the user clearly sees loading status
      const t1 = setTimeout(() => {
        setProcessProgress(55);
        setProcessStage(
          SUPPORTED_VIDEO_TYPES.includes(f.type)
            ? 'Анализ метаданных, разрешения и кадров...'
            : 'Обработка изображения...'
        );
      }, 400);

      const t2 = setTimeout(() => {
        setProcessProgress(90);
        setProcessStage('Подготовка превью и safe zones...');
      }, 850);

      const t3 = setTimeout(() => {
        setProcessProgress(100);
        setProcessStage('Готово!');
        setTimeout(() => {
          setIsProcessing(false);
          setPendingFile(null);
          onFileChange(f);
        }, 200);
      }, 1200);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    },
    [validateFile, onFileChange]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        processAndSetFile(droppedFile);
      }
    },
    [processAndSetFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        processAndSetFile(selectedFile);
      }
    },
    [processAndSetFile]
  );

  // 1. Loading / Processing state with animated progress bar
  if (isProcessing && pendingFile) {
    const sizeMb = (pendingFile.size / 1024 / 1024).toFixed(1);
    const isVideo = SUPPORTED_VIDEO_TYPES.includes(pendingFile.type);

    return (
      <div className="upload-zone glass-card upload-loading-card">
        <div className="upload-loading-header">
          <div className="upload-loading-icon">{isVideo ? '🎬' : '🖼️'}</div>
          <div className="upload-loading-info">
            <div className="upload-loading-name">{pendingFile.name}</div>
            <div className="upload-loading-meta">
              {sizeMb} МБ • {isVideo ? 'Видеофайл' : 'Изображение'} • Локальная обработка
            </div>
          </div>
        </div>

        <div className="progress-container" style={{ margin: '20px 0 10px' }}>
          <div className="progress-header">
            <span className="progress-status">{processStage}</span>
            <span className="progress-percent">{processProgress}%</span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{
                width: `${processProgress}%`,
                transition: 'width 0.35s ease-out',
              }}
            />
          </div>
        </div>

        <div className="upload-loading-footer">
          <span className="upload-time-est">
            ⏱️ {processProgress < 100 ? 'Осталось ~1 сек...' : 'Завершение...'}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            onClick={() => {
              setIsProcessing(false);
              setPendingFile(null);
            }}
          >
            Отмена
          </button>
        </div>
      </div>
    );
  }

  // 2. Ready state: File loaded, stable preview without glitching
  if (file) {
    return (
      <MediaPreview
        file={file}
        onRemove={() => onFileChange(null)}
      />
    );
  }

  // 3. Initial empty dropzone
  return (
    <div
      className={`upload-zone glass-card ${isDragOver ? 'drag-over' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ALL_SUPPORTED_TYPES.join(',')}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
      <div className="upload-icon">📁</div>
      <div className="upload-title">Загрузи креатив</div>
      <div className="upload-hint">
        Перетащи файл сюда или кликни для выбора (до 2 ГБ)
      </div>
      <div className="upload-formats">
        <span className="format-badge">MP4</span>
        <span className="format-badge">MOV</span>
        <span className="format-badge">WebM</span>
        <span className="format-badge">JPG</span>
        <span className="format-badge">PNG</span>
        <span className="format-badge">WebP</span>
      </div>
    </div>
  );
}

function MediaPreview({ file, onRemove }) {
  const isVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);
  const [meta, setMeta] = useState(null);
  const [showSafeZones, setShowSafeZones] = useState(false);

  // Stable blob URL with useMemo and cleanup with useEffect.
  // This completely eliminates infinite re-render flickering!
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);

  const sizeMb = (file.size / 1024 / 1024).toFixed(1);

  return (
    <div className="upload-zone glass-card has-file" style={{ cursor: 'default' }}>
      <div className="media-preview-container">
        <div className="media-preview" style={{ position: 'relative' }}>
          {isVideo ? (
            <video
              src={url}
              controls
              playsInline
              preload="metadata"
              onLoadedMetadata={(e) => {
                const v = e.target;
                const ratio = v.videoWidth / v.videoHeight;
                let aspect = '16:9';
                if (ratio < 0.65) aspect = '9:16 (Reels/Stories)';
                else if (ratio < 0.85) aspect = '4:5 (Feed)';
                else if (ratio < 1.15) aspect = '1:1 (Square)';

                setMeta({
                  dur: Math.round(v.duration * 10) / 10,
                  res: `${v.videoWidth}×${v.videoHeight}`,
                  aspect,
                  isReels: ratio < 0.65,
                });
              }}
            />
          ) : (
            <img src={url} alt="Креатив" />
          )}

          {/* Safe Zones Overlay (Meta Reels 9:16) */}
          {showSafeZones && (
            <div className="safe-zone-overlay">
              <div className="safe-zone-top">
                <span>⚠️ Верхняя зона интерфейса Meta (~14%)</span>
              </div>
              <div className="safe-zone-center">
                <span>✅ БЕЗОПАСНАЯ ЗОНА ДЛЯ ТЕКСТА И ХУКА</span>
              </div>
              <div className="safe-zone-bottom">
                <span>⚠️ Нижняя зона (описание, звук, CTA)</span>
              </div>
              <div className="safe-zone-sidebar">
                <span>Иконки ❤️ 💬 ↗️</span>
              </div>
            </div>
          )}

          {/* Safe Zone Toggle for vertical videos */}
          {isVideo && (
            <button
              type="button"
              className={`safe-zone-toggle ${showSafeZones ? 'active' : ''}`}
              onClick={() => setShowSafeZones(!showSafeZones)}
              title="Переключить безопасные зоны Meta Reels/Stories"
            >
              📐 {showSafeZones ? 'Скрыть Safe Zones' : 'Показать Safe Zones'}
            </button>
          )}

          {/* Remove Button */}
          <button
            type="button"
            className="btn btn-danger btn-icon media-remove"
            onClick={onRemove}
            title="Удалить файл"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="media-info">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {sizeMb} МБ • {isVideo ? '🎬 Видео' : '🖼️ Изображение'}
            {meta ? ` • ${meta.res} • ${meta.aspect} • ${meta.dur}с` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge-ready">✓ Готов к проверке</span>
        </div>
      </div>
    </div>
  );
}
