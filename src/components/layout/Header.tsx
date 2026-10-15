import { Info, Layers, List } from 'lucide-react';
import type { ReactNode } from 'react';

export type PanelId = 'communities' | 'layers' | 'about';

interface Props {
  search: ReactNode;
  activePanel: PanelId | null;
  onTogglePanel: (panel: PanelId) => void;
}

const BUTTONS: { id: PanelId; label: string; icon: typeof Info }[] = [
  { id: 'communities', label: 'Communities', icon: List },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'about', label: 'About & data', icon: Info },
];

export function Header({ search, activePanel, onTogglePanel }: Props) {
  return (
    <header className="app-header">
      <div className="brand">
        <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <path d="M5 23 L13 10 L17.5 17 L20.5 12.5 L27 23 Z" />
          <circle cx="23" cy="8" r="2.2" />
        </svg>
        <div className="brand__text">
          <h1 className="brand__title">Nunavut Atlas</h1>
          <p className="brand__subtitle">Mapping Nunavut through an Inuit-informed lens</p>
        </div>
      </div>
      <div className="app-header__search">{search}</div>
      <nav className="app-header__nav" aria-label="Atlas panels">
        {BUTTONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-button${activePanel === id ? ' is-active' : ''}`}
            aria-pressed={activePanel === id}
            onClick={() => onTogglePanel(id)}
          >
            <Icon size={18} aria-hidden="true" />
            <span className="nav-button__label">{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
