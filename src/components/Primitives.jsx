import { Link } from 'react-router-dom';
import { teamColor, compoundColor } from '../lib/teams';

export function Panel({ title, eyebrow, aside, children, flush, accent, className = '', ...rest }) {
  return (
    <section className={`panel ${accent ? 'panel--accent' : ''} ${className}`} {...rest}>
      {(title || eyebrow || aside) && (
        <header className="panel__head">
          {eyebrow && <span className="panel__eyebrow">{eyebrow}</span>}
          {title && <h3 className="panel__title">{title}</h3>}
          {aside && <span className="panel__aside">{aside}</span>}
        </header>
      )}
      <div className={`panel__body ${flush ? 'panel__body--flush' : ''}`}>{children}</div>
    </section>
  );
}

export function Tile({ label, value, unit, note, tone, small }) {
  return (
    <div className="tile">
      <span className="tile__label">{label}</span>
      <span className={`tile__value ${small ? 'tile__value--sm' : ''} ${tone ?? ''}`}>
        {value}
        {unit && <span className="tile__unit">{unit}</span>}
      </span>
      {note && <span className="tile__note">{note}</span>}
    </div>
  );
}

export function SectionHead({ title, sub, children }) {
  return (
    <div className="section">
      <div>
        <h2 className="section__title">{title}</h2>
        {sub && <p className="section__sub" style={{ margin: '3px 0 0' }}>{sub}</p>}
      </div>
      {children && <div className="section__right">{children}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading' }) {
  return (
    <div className="state" role="status">
      <div className="spinner" />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state" role="alert">
      <span style={{ color: 'var(--critical)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
        ERROR
      </span>
      <span>{error?.message ?? 'Something went wrong.'}</span>
      {onRetry && (
        <button className="btn btn--sm" onClick={onRetry} style={{ marginTop: 6 }}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Empty({ children = 'No data for this selection.' }) {
  return <div className="state">{children}</div>;
}

/** Renders loading / error / empty consistently, or the children. */
export function Async({ query, children, empty, label }) {
  if (query.isLoading) return <Loading label={label} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;
  const d = query.data;
  if (!d || (Array.isArray(d) && d.length === 0)) return <Empty>{empty}</Empty>;
  return children(d);
}

export function Note({ children, warn }) {
  return (
    <div className={`note ${warn ? 'note--warn' : ''}`}>
      <span className="note__icon">{warn ? '!' : 'i'}</span>
      <span>{children}</span>
    </div>
  );
}

export function Position({ value }) {
  if (value === null || value === undefined) return <span className="muted">—</span>;
  const p = Math.round(value);
  return <span className={`pos ${p <= 3 ? `pos--${p}` : ''}`}>{p}</span>;
}

export function DriverCell({ code, name, team, link = true }) {
  const inner = (
    <div className="driver-cell">
      <span className="team-bar" style={{ background: teamColor(team) }} />
      <div style={{ minWidth: 0 }}>
        <div className="driver-cell__code">{code}</div>
        {name && <div className="driver-cell__name">{name}</div>}
      </div>
    </div>
  );
  return link ? <Link to={`/driver/${code}`}>{inner}</Link> : inner;
}

export function Compound({ value, showLabel = true }) {
  if (!value) return <span className="muted">—</span>;
  return (
    <span className="compound" style={{ color: compoundColor(value) }}>
      <span className="compound__dot" />
      {showLabel && <span style={{ color: 'var(--ink-secondary)' }}>{value}</span>}
    </span>
  );
}

export function Chip({ children, tone }) {
  return <span className={`chip ${tone ? `chip--${tone}` : ''}`}>{children}</span>;
}

export function Tabs({ value, onChange, options }) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={`tab ${value === o.value ? 'tab--active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}
