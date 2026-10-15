import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  /** Short line under the title. */
  subtitle?: ReactNode;
  side: 'left' | 'right';
  onClose: () => void;
  children: ReactNode;
  /** Move keyboard focus to the panel heading when it opens. */
  autoFocus?: boolean;
  className?: string;
}

/**
 * Floating panel (desktop) / bottom sheet (mobile). Rendered as a labelled
 * region rather than a modal so the map stays usable alongside it.
 */
export function Panel({ title, subtitle, side, onClose, children, autoFocus = true, className = '' }: Props) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (autoFocus) headingRef.current?.focus({ preventScroll: true });
  }, [autoFocus, title]);

  return (
    <section
      className={`panel panel--${side} ${className}`}
      aria-labelledby={headingId}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="panel__header">
        <div className="panel__titles">
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className="panel__title">
            {title}
          </h2>
          {subtitle && <div className="panel__subtitle">{subtitle}</div>}
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label={`Close ${title} panel`}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <div className="panel__body">{children}</div>
    </section>
  );
}
