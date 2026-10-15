// Shared chart furniture: recessive grid and axes, a crosshair tooltip on every
// plot, and a legend that is always present for two or more series.
export const AXIS = {
  stroke: '#45454f',
  tick: { fill: '#6e6e7c', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' },
  tickLine: false,
  axisLine: { stroke: '#24242e' },
};

export const GRID = { stroke: '#1d1d25', strokeDasharray: '0' };

export const CURSOR = { stroke: '#45454f', strokeWidth: 1, strokeDasharray: '3 3' };

/** Ticks from a computed domain ('dataMax + 0.5') arrive as raw floats. */
export const tick1 = (v) => Number(v).toFixed(1);
export const tickSec = (v) => `${Number(v).toFixed(1)}s`;

export function axisLabel(value, position = 'insideBottom') {
  return {
    value,
    position,
    offset: position === 'insideBottom' ? -4 : 10,
    fill: '#6e6e7c',
    fontSize: 10,
    letterSpacing: '0.1em',
    fontFamily: 'JetBrains Mono, monospace',
  };
}

/**
 * One tooltip for every chart. `format` turns a payload entry into a display
 * string; `title` turns the x value into the header.
 */
export function ChartTooltip({ active, payload, label, title, format, sort = true }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value !== null && p.value !== undefined);
  if (!rows.length) return null;
  const ordered = sort ? [...rows].sort((a, b) => b.value - a.value) : rows;

  return (
    <div className="tooltip">
      <div className="tooltip__title">{title ? title(label, payload) : label}</div>
      {ordered.map((p, i) => (
        <div className="tooltip__row" key={`${p.dataKey}-${i}`}>
          <span
            className="chart__swatch"
            style={{ background: p.color || p.stroke || p.fill }}
            aria-hidden
          />
          <span className="tooltip__label">{p.name ?? p.dataKey}</span>
          <span className="tooltip__value">{format ? format(p.value, p) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Legend rendered as plain HTML so it wraps and stays readable at any width. */
export function Legend({ items, line }) {
  if (!items?.length) return null;
  return (
    <div className="chart__legend">
      {items.map((it) => (
        <span className="chart__legend-item" key={it.label}>
          <span
            className={`chart__swatch ${line ? 'chart__swatch--line' : ''}`}
            style={{ background: it.color }}
            aria-hidden
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
