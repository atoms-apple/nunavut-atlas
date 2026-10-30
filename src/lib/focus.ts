/**
 * Remembers which element opened a panel so keyboard focus can go back to it
 * when the panel closes.
 */
export interface FocusMemory {
  element: HTMLElement | null;
}

export function activeElement(): HTMLElement | null {
  const el = document.activeElement;
  return el instanceof HTMLElement && el !== document.body ? el : null;
}

/**
 * Focus the remembered opener if it is still on the page; otherwise focus
 * the map so keyboard users are not left on the page body.
 */
export function restoreFocus(memory: FocusMemory): void {
  const target = memory.element;
  memory.element = null;
  if (target && target.isConnected) {
    target.focus({ preventScroll: true });
    if (document.activeElement === target) return;
  }
  const map = document.querySelector<HTMLElement>('.map-region .leaflet-container') ?? document.querySelector<HTMLElement>('.map-region');
  map?.focus({ preventScroll: true });
}
