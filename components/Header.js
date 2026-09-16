'use client';

export default function Header({ onSettingsClick }) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo">QC</div>
        <div>
          <div className="header-title">Creative QC</div>
          <div className="header-subtitle">Контроль качества рекламных креативов Meta Ads</div>
        </div>
      </div>
      <div className="header-actions">
        <a
          href="/reglament/editor"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          title="Открыть регламент для видеомонтажёров"
        >
          🎬 Монтаж
        </a>
        <a
          href="/reglament/scripts"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          title="Открыть регламент для сценаристов"
        >
          ✍️ Сценарии
        </a>
        <button className="btn btn-ghost btn-icon" onClick={onSettingsClick} title="Настройки">
          ⚙️
        </button>
      </div>
    </header>
  );
}
