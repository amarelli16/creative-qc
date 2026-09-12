'use client';

import { useRef, useState, useCallback } from 'react';
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

  const validateFile = useCallback(
    (f) => {
      if (!ALL_SUPPORTED_TYPES.includes(f.type)) {
        onError?.(`Неподдерживаемый формат: ${f.type}`);
        return false;
      }

      const isVideo = SUPPORTED_VIDEO_TYPES.includes(f.type);
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

      if (f.size > maxSize) {
        const sizeStr = maxSize >= 1024 * 1024 * 1024
          ? `${(maxSize / (1024 * 1024 * 1024)).toFixed(0)} ГБ`
          : `${Math.round(maxSize / 1024 / 1024)} МБ`;
        onError?.(`Файл слишком большой. Максимум: ${sizeStr}`);
        return false;
      }

      return true;
    },
    [onError]
  );

  const handleFile = useCallback(
    (f) => {
      if (validateFile(f)) {
        onFileChange(f);
      }
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
        handleFile(droppedFile);
      }
    },
    [handleFile]
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
        handleFile(selectedFile);
      }
    },
    [handleFile]
  );

  if (file) {
    return (
      <MediaPreview
        file={file}
        onRemove={() => onFileChange(null)}
      />
    );
  }

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
        <span className="format-badge">JPG</span>
        <span className="format-badge">PNG</span>
        <span className="format-badge">WebP</span>
        <span className="format-badge">MP4</span>
        <span className="format-badge">MOV</span>
        <span className="format-badge">WebM</span>
      </div>
    </div>
  );
}

function MediaPreview({ file, onRemove }) {
  const isVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);
  const [meta, setMeta] = useState(null);
  const url = URL.createObjectURL(file);
  const sizeMb = (file.size / 1024 / 1024).toFixed(1);

  return (
    <div className="upload-zone glass-card has-file">
      <div className="media-preview">
        {isVideo ? (
          <video
            src={url}
            controls
            preload="metadata"
            onLoadedMetadata={(e) => {
              const v = e.target;
              const ratio = v.videoWidth / v.videoHeight;
              let aspect = '16:9';
              if (ratio < 0.65) aspect = '9:16';
              else if (ratio < 0.85) aspect = '4:5';
              else if (ratio < 1.15) aspect = '1:1';
              setMeta({
                dur: Math.round(v.duration * 10) / 10,
                res: `${v.videoWidth}×${v.videoHeight}`,
                aspect,
              });
            }}
          />
        ) : (
          <img src={url} alt="Креатив" />
        )}
        <button
          className="btn btn-danger btn-icon media-remove"
          onClick={(e) => {
            e.stopPropagation();
            URL.revokeObjectURL(url);
            onRemove();
          }}
          title="Удалить файл"
        >
          ✕
        </button>
      </div>
      <div className="media-info">
        <span>{file.name}</span>
        <span>
          {sizeMb} МБ • {isVideo ? '🎬 Видео' : '🖼️ Изображение'}
          {meta ? ` • ${meta.res} (${meta.aspect}) • ${meta.dur}с` : ''}
        </span>
      </div>
    </div>
  );
}
