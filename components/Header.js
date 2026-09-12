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
        <button className="btn btn-ghost btn-icon" onClick={onSettingsClick} title="Настройки">
          ⚙️
        </button>
      </div>
    </header>
  );
}
