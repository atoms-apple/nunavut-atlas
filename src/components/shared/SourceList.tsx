import { getSource } from '../../data/sources/sources';
import { Badge } from './Badge';
import { CLASSIFICATION_LABEL } from './labels';

export function SourceList({ sourceIds, compact = false }: { sourceIds: string[]; compact?: boolean }) {
  const unique = [...new Set(sourceIds)];
  if (unique.length === 0) return <p className="muted">No source recorded.</p>;
  return (
    <ul className={`source-list${compact ? ' source-list--compact' : ''}`}>
      {unique.map((id) => {
        const source = getSource(id);
        if (!source) return <li key={id}>Unknown source “{id}”</li>;
        const cls = CLASSIFICATION_LABEL[source.classification];
        return (
          <li key={id}>
            <a href={source.url} target="_blank" rel="noreferrer noopener">
              {source.name}
            </a>
            {!compact && (
              <>
                {' '}
                <span className="muted">— {source.publisher}</span>{' '}
                <Badge tone={cls.tone} title={cls.explanation}>
                  {cls.label}
                </Badge>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
