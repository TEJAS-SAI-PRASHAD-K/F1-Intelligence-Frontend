import { NavLink, Outlet, Link } from 'react-router-dom';
import { useHealth } from '../api/hooks';

const LINKS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/standings', label: 'Standings' },
  { to: '/races', label: 'Races' },
  { to: '/drivers', label: 'Drivers' },
  { to: '/tire', label: 'Tire Lab' },
  { to: '/strategy', label: 'Strategy' },
  { to: '/prediction', label: 'Prediction' },
  { to: '/models', label: 'Models' },
];

function Health() {
  const { data, isError, isLoading } = useHealth();
  const up = !isError && data?.status === 'ok';
  const state = isLoading ? 'checking' : up ? 'api live' : 'api down';
  const laps = data?.laps_ingested;

  return (
    <div className="nav__health" title={up ? `${laps?.toLocaleString()} laps ingested` : 'Backend unreachable'}>
      <span className={`dot ${isLoading ? '' : up ? 'dot--live' : 'dot--down'}`} />
      <span>{state}</span>
      {up && laps != null && (
        <span style={{ color: 'var(--ink-faint)' }}>· {laps.toLocaleString()} laps</span>
      )}
    </div>
  );
}

export default function Layout() {
  return (
    <div className="app">
      <div className="app__bleed" aria-hidden />

      <nav className="nav">
        <div className="nav__inner">
          <Link to="/" className="nav__brand">
            <span className="nav__mark" aria-hidden />
            <span className="nav__name">
              F1 <span>Intelligence</span>
            </span>
          </Link>

          <div className="nav__links">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}
              >
                {l.label}
              </NavLink>
            ))}
          </div>

          <div className="nav__right">
            <Health />
          </div>
        </div>
      </nav>

      <main className="app__main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <span>
            Built on <strong style={{ color: 'var(--ink-secondary)' }}>FastF1</strong> timing data,
            2019–2024.
          </span>
          <span className="muted">
            Points are race points only — sprints are not ingested, so sprint-year totals fall short
            of the official championship.
          </span>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            style={{ marginLeft: 'auto', color: 'var(--ink-secondary)' }}
          >
            API docs ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
