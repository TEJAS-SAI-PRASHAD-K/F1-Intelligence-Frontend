import { useParams, Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

import { useDriverDashboard } from '../api/hooks';
import { Panel, Async, Tile, Note } from '../components/Primitives';
import { AXIS, GRID, CURSOR, axisLabel } from '../components/ChartKit';
import { teamColor } from '../lib/teams';
import { num, signed } from '../lib/format';

function SeasonCharts({ seasons }) {
  const data = seasons.map((s) => ({
    year: s.season_year,
    points: s.points,
    wins: s.wins,
    team: s.team,
    meanFinish: s.mean_finish,
  }));

  // Points (0-600) and mean finish (1-20) are different quantities on different
  // scales. Two charts rather than two y-axes on one.
  return (
    <div className="grid grid--split-even">
      <Panel title="Points by season" aside="race points only">
        <div className="chart" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 6, right: 8, bottom: 22, left: 2 }}>
              <CartesianGrid {...GRID} vertical={false} />
              <XAxis dataKey="year" {...AXIS} label={axisLabel('SEASON')} />
              <YAxis {...AXIS} width={44} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="tooltip">
                      <div className="tooltip__title">{label} · {d.team ?? '—'}</div>
                      <div className="tooltip__row">
                        <span className="tooltip__label">Points</span>
                        <span className="tooltip__value">{num(d.points)}</span>
                      </div>
                      <div className="tooltip__row">
                        <span className="tooltip__label">Wins</span>
                        <span className="tooltip__value">{d.wins}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="points" name="Points" barSize={30} radius={[4, 4, 0, 0]}>
                {data.map((x) => (
                  <Cell key={x.year} fill={teamColor(x.team)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="muted" style={{ fontSize: 11.5, margin: '4px 0 0' }}>
          Each bar takes that season&apos;s constructor colour; the team is named in the tooltip and
          in the table below.
        </p>
      </Panel>

      <Panel title="Mean finishing position" aside="lower is better">
        <div className="chart" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 12, bottom: 22, left: 2 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="year" {...AXIS} label={axisLabel('SEASON')} />
              <YAxis
                {...AXIS}
                width={44}
                reversed
                domain={[1, 'dataMax + 1']}
                tickFormatter={(v) => `P${Math.round(v)}`}
              />
              <Tooltip
                cursor={CURSOR}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="tooltip">
                      <div className="tooltip__title">{label} · {d.team ?? '—'}</div>
                      <div className="tooltip__row">
                        <span className="tooltip__label">Mean finish</span>
                        <span className="tooltip__value">{num(d.meanFinish, 2)}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="meanFinish"
                name="Mean finish"
                stroke="#4b93e6"
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, stroke: '#101014', fill: '#4b93e6' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="muted" style={{ fontSize: 11.5, margin: '4px 0 0' }}>
          One series, so no legend is needed — the panel title names it. The axis is reversed so
          better results sit higher.
        </p>
      </Panel>
    </div>
  );
}

function CircuitBars({ rows, tone }) {
  if (!rows?.length) return <Note>Not enough races to rank circuits.</Note>;
  const data = rows.map((c) => ({ ...c, label: c.circuit }));

  return (
    <div className="chart" style={{ height: 56 + data.length * 34 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 34, bottom: 20, left: 4 }}>
          <CartesianGrid {...GRID} horizontal={false} />
          <XAxis type="number" {...AXIS} label={axisLabel('MEAN FINISH')} />
          <YAxis type="category" dataKey="label" width={96} {...AXIS} tick={{ ...AXIS.tick, fontSize: 10.5 }} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="tooltip">
                  <div className="tooltip__title">{d.circuit}</div>
                  <div className="tooltip__row">
                    <span className="tooltip__label">Mean finish</span>
                    <span className="tooltip__value">{num(d.mean_finish, 2)}</span>
                  </div>
                  <div className="tooltip__row">
                    <span className="tooltip__label">Mean grid</span>
                    <span className="tooltip__value">{num(d.mean_grid, 2)}</span>
                  </div>
                  <div className="tooltip__row">
                    <span className="tooltip__label">Best finish</span>
                    <span className="tooltip__value">P{num(d.best_finish)}</span>
                  </div>
                  <div className="tooltip__row">
                    <span className="tooltip__label">Races</span>
                    <span className="tooltip__value">{d.races}</span>
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="mean_finish" name="Mean finish" barSize={16} radius={[0, 4, 4, 0]} fill={tone} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Driver() {
  const { abbr } = useParams();
  const q = useDriverDashboard(abbr?.toUpperCase());

  return (
    <div className="stack stack--lg">
      <Async query={q} label={`Loading ${abbr}`}>
        {(d) => {
          const latest = d.seasons[d.seasons.length - 1];
          const totalPoints = d.seasons.reduce((s, x) => s + x.points, 0);
          const totalDnfs = d.seasons.reduce((s, x) => s + x.dnfs, 0);

          return (
            <>
              <div className="hero" style={{ background: `radial-gradient(900px 400px at 12% 0%, ${teamColor(latest?.team)}33, transparent 62%), linear-gradient(135deg, #111118 0%, #0a0a0c 70%)`, borderColor: `${teamColor(latest?.team)}55` }}>
                <div className="hero__grid" aria-hidden />
                <div className="hero__inner">
                  <div>
                    <div className="hero__eyebrow" style={{ color: teamColor(latest?.team) }}>
                      {latest?.team ?? 'Driver'} · {d.country_code ?? '—'}
                    </div>
                    <h1 className="hero__title">{d.full_name ?? d.driver}</h1>
                    <p className="hero__sub">
                      {d.career_races} races across {d.seasons.length} ingested seasons —{' '}
                      {d.career_wins} wins and {d.career_podiums} podiums.
                    </p>
                  </div>
                  <div className="hero__stats">
                    <div>
                      <div className="hero__stat-label">Wins</div>
                      <div className="hero__stat-value">{d.career_wins}</div>
                    </div>
                    <div>
                      <div className="hero__stat-label">Podiums</div>
                      <div className="hero__stat-value">{d.career_podiums}</div>
                    </div>
                    <div>
                      <div className="hero__stat-label">Races</div>
                      <div className="hero__stat-value">{d.career_races}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid--tiles">
                <Tile label="Points (ingested)" value={num(totalPoints)} note="race points only" />
                <Tile label="Win rate" value={`${num((d.career_wins / Math.max(d.career_races, 1)) * 100, 1)}%`} />
                <Tile label="Podium rate" value={`${num((d.career_podiums / Math.max(d.career_races, 1)) * 100, 1)}%`} />
                <Tile label="DNFs" value={totalDnfs} note={`${num((totalDnfs / Math.max(d.career_races, 1)) * 100, 1)}% of starts`} />
                <Tile
                  label="Latest team"
                  value={latest?.team ?? '—'}
                  note={latest ? `${latest.season_year} season` : null}
                  small
                />
              </div>

              <SeasonCharts seasons={d.seasons} />

              <Panel flush title="Record">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Season</th>
                        <th>Team</th>
                        <th className="num">Races</th>
                        <th className="num">Pts</th>
                        <th className="num">Wins</th>
                        <th className="num">Podiums</th>
                        <th className="num">DNF</th>
                        <th className="num">Mean finish</th>
                        <th className="num">Places +/−</th>
                        <th className="num">Tire mgmt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...d.seasons].reverse().map((s) => (
                        <tr key={s.season_year}>
                          <td style={{ fontWeight: 700 }}>
                            <Link to={`/standings?year=${s.season_year}`}>{s.season_year}</Link>
                          </td>
                          <td>
                            <div className="driver-cell">
                              <span className="team-bar" style={{ background: teamColor(s.team) }} />
                              <span className="secondary">{s.team ?? '—'}</span>
                            </div>
                          </td>
                          <td className="num muted">{s.races}</td>
                          <td className="num" style={{ fontWeight: 700 }}>{num(s.points)}</td>
                          <td className="num">{s.wins || <span className="muted">—</span>}</td>
                          <td className="num">{s.podiums || <span className="muted">—</span>}</td>
                          <td className="num">{s.dnfs ? <span className="pos-bad">{s.dnfs}</span> : <span className="muted">0</span>}</td>
                          <td className="num muted">{num(s.mean_finish, 2)}</td>
                          <td className={`num ${s.mean_places_gained > 0 ? 'pos-good' : s.mean_places_gained < 0 ? 'pos-bad' : 'muted'}`}>
                            {signed(s.mean_places_gained, 2)}
                          </td>
                          <td className={`num ${s.tire_mgmt_s_per_lap == null ? 'muted' : s.tire_mgmt_s_per_lap < 0 ? 'pos-good' : 'pos-bad'}`}>
                            {s.tire_mgmt_s_per_lap == null ? '—' : signed(s.tire_mgmt_s_per_lap, 4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <div className="grid grid--split-even">
                <Panel title="Strongest circuits" aside="by mean finish">
                  <CircuitBars rows={d.best_circuits} tone="#36a86d" />
                </Panel>
                <Panel title="Weakest circuits" aside="by mean finish">
                  <CircuitBars rows={d.worst_circuits} tone="#ee4155" />
                </Panel>
              </div>

              <Note>
                Tire management is the driver&apos;s degradation slope relative to the field median in
                the same race — negative means they preserve tires better than the field.
              </Note>
            </>
          );
        }}
      </Async>
    </div>
  );
}
