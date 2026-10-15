import type { Region } from '../../types/community';

/** Small inline symbol matching the map marker for a region. */
export function RegionSymbol({ region, size = 14 }: { region: Region; size?: number }) {
  const { color, shape } = region.style;
  const s = size;
  const inner =
    shape === 'circle' ? (
      <circle cx={s / 2} cy={s / 2} r={s / 2 - 1.5} />
    ) : shape === 'square' ? (
      <rect x={1.5} y={1.5} width={s - 3} height={s - 3} />
    ) : (
      <polygon points={`${s / 2},1 ${s - 1},${s / 2} ${s / 2},${s - 1} 1,${s / 2}`} />
    );
  return (
    <svg className="region-symbol" width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true" focusable="false">
      <g fill={color} stroke="#ffffff" strokeWidth={1.5}>
        {inner}
      </g>
    </svg>
  );
}
