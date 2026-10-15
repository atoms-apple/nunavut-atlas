import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Search, X } from 'lucide-react';
import { search, type SearchEntry, type SearchResult } from '../../lib/search/search';

interface Props {
  entries: readonly SearchEntry[];
  onSelect: (entry: SearchEntry) => void;
  /** Plain-language description of what the search covers. */
  coverage: string;
}

/**
 * Accessible combobox (WAI-ARIA 1.2 pattern): type to filter, arrow keys to
 * move, Enter to choose, Escape to close or clear. Matching happens entirely
 * in the browser; queries are never sent anywhere.
 */
export function SearchBox({ entries, onSelect, coverage }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const hintId = useId();

  const results = useMemo(() => search(entries, query), [entries, query]);
  const trimmed = query.trim();
  const showList = open && trimmed.length > 0;
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  const choose = (result: SearchResult | undefined) => {
    if (!result) return;
    onSelect(result.entry);
    setQuery(result.entry.name);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setOpen(true);
        setActive((i) => (results.length ? (Math.min(i, results.length - 1) + 1) % results.length : 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setOpen(true);
        setActive((i) => (results.length ? (Math.min(i, results.length - 1) - 1 + results.length) % results.length : 0));
        break;
      case 'Enter':
        if (showList) {
          event.preventDefault();
          choose(results[activeIndex]);
        }
        break;
      case 'Escape':
        if (showList) setOpen(false);
        else setQuery('');
        break;
    }
  };

  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <div className="search" role="search">
      <label className="visually-hidden" htmlFor={`${listId}-input`}>
        Search communities, regions and geographic features
      </label>
      <Search className="search__icon" aria-hidden="true" size={18} />
      <input
        ref={inputRef}
        id={`${listId}-input`}
        className="search__input"
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        placeholder="Search communities and places"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-describedby={hintId}
        aria-activedescendant={showList && results.length > 0 ? optionId(activeIndex) : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {query && (
        <button
          type="button"
          className="search__clear icon-button"
          aria-label="Clear search"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setQuery('');
            setOpen(false);
            inputRef.current?.focus();
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
      <span id={hintId} className="visually-hidden">
        {coverage}
      </span>
      {showList && (
        <div className="search__popup">
          {results.length > 0 ? (
            <ul id={listId} role="listbox" aria-label="Search results" className="search__list">
              {results.map((r, i) => (
                <li
                  key={`${r.entry.kind}:${r.entry.id}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={`search__option${i === activeIndex ? ' is-active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(r)}
                >
                  <span className="search__name">{r.entry.name}</span>
                  {r.matchedAlias && (
                    <span className="search__alias">
                      {r.matchedAlias.label ? `${r.matchedAlias.label}: ` : ''}
                      {r.matchedAlias.value}
                    </span>
                  )}
                  <span className="search__context">
                    {r.entry.context}
                    {r.ambiguous ? ' · same name as another result' : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div id={listId} className="search__empty" role="status">
              <p>No matches for “{trimmed}”.</p>
              <p className="search__coverage">{coverage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
