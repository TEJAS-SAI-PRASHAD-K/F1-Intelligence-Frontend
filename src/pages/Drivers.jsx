import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDrivers, useLatestSeason, useSeasonDashboard } from '../api/hooks';
import { SectionHead, Async, Panel } from '../components/Primitives';
import { teamColor } from '../lib/teams';
import { num } from '../lib/format';

export default function Drivers() {
  const [q, setQ] = useState('');
  const driversQ = useDrivers();
  const { year } = useLatestSeason();
  const seasonQ = useSeasonDashboard(year);

  const teamOf = useMemo(() => {
    const m = new Map();
    for (const d of seasonQ.data?.drivers ?? []) m.set(d.driver, d.team);
    return m;
  }, [seasonQ.data]);

  return (
    <div className="stack stack--lg">
      <SectionHead
        title="Drivers"
        sub="Every driver seen in an ingested session. Open one for their season-by-season record."
      >
        <input
          className="input"
          style={{ width: 220 }}
          placeholder="Search code or name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search drivers"
        />
      </SectionHead>

      <Async query={driversQ} label="Loading drivers">
        {(all) => {
          const term = q.trim().toLowerCase();
          const list = all
            .filter(
              (d) =>
                !term ||
                d.abbreviation.toLowerCase().includes(term) ||
                (d.full_name ?? '').toLowerCase().includes(term),
            )
            .sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));

          if (!list.length) {
            return <Panel><div className="state">No driver matches “{q}”.</div></Panel>;
          }

          return (
            <div className="grid grid--cards">
              {list.map((d) => {
                const team = teamOf.get(d.abbreviation);
                return (
                  <Link key={d.id} to={`/driver/${d.abbreviation}`} className="race-card">
                    <div className="driver-cell">
                      <span className="team-bar" style={{ background: teamColor(team), height: 32 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800 }}>
                          {d.abbreviation}
                        </div>
                        <div className="race-card__meta">{d.full_name ?? '—'}</div>
                      </div>
                      {d.driver_number != null && (
                        <span
                          className="mono"
                          style={{ marginLeft: 'auto', fontSize: 20, color: 'var(--ink-faint)', fontWeight: 800 }}
                        >
                          {num(d.driver_number)}
                        </span>
                      )}
                    </div>
                    <div className="row" style={{ marginTop: 10, gap: 6 }}>
                      {team && <span className="chip">{team}</span>}
                      {d.country_code && <span className="chip">{d.country_code}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        }}
      </Async>
    </div>
  );
}
