import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'official' | 'derived' | 'caution' | 'muted';

export function Badge({ tone = 'neutral', children, title }: { tone?: BadgeTone; children: ReactNode; title?: string }) {
  return (
    <span className={`badge badge--${tone}`} title={title}>
      {children}
    </span>
  );
}
