import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';

import { useSeasons, useSeasonDashboard } from '../api/hooks';
import {
  Panel,
  SectionHead,
  Async,
  Position,
  DriverCell,
  Tabs,
  Note,
  Tile,
} from '../components/Primitives';
import { AXIS, GRID, axisLabel, tick1 } from '../components/ChartKit';
import { teamColor } from '../lib/teams';
import { num, signed, lapTime } from '../lib/format';

function SeasonPicker({ year, onChange }) {
  const { data } = useSeasons();
  return (
    <label className="row" style={{ gap: 8 }}>
      <span className="field__label">Season</span>
      <select className="select" value={year ?? ''} onChange={(e) => onChange(Number(e.target.value))}>
        {(data ?? []).map((s) => (
          <option key={s.year} value={s.year}>
            {s.year}
          </option>
        ))}
      </select>
    </label>
  );
}

function DriverTable({ drivers }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 48 }}>#</th>
            <th>Driver</th>
            <th>Team</th>
            <th className="num">Pts</th>
            <th className="num">Races</th>
            <th className="num">Wins</th>
            <th className="num">Podiums</th>
            <th className="num">Pts fin.</th>
            <th className="num">DNF</th>
            <th className="num">Avg finish</th>
            <th className="num">Avg grid</th>
            <th className="num">Places +/−</th>
            <th className="num">Tire mgmt</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((d, i) => (
            <tr key={d.driver}>
              <td><Position value={i + 1} /></td>
              <td><DriverCell code={d.driver} name={d.full_name} team={d.team} /></td>
              <td className="secondary">{d.team}</td>
              <td className="num" style={{ fontWeight: 700 }}>{num(d.points)}</td>
              <td className="num muted">{d.races}</td>
              <td className="num">{d.wins || <span className="muted">—</span>}</td>
              <td className="num">{d.podiums || <span className="muted">—</span>}</td>
              <td className="num muted">{d.points_finishes}</td>
              <td className="num">{d.dnfs ? <span className="pos-bad">{d.dnfs}</span> : <span className="muted">0</span>}</td>
              <td className="num muted">{num(d.mean_finish, 2)}</td>
              <td className="num muted">{num(d.mean_grid, 2)}</td>
              <td className={`num ${d.mean_places_gained > 0 ? 'pos-good' : d.mean_places_gained < 0 ? 'pos-bad' : 'muted'}`}>
                {signed(d.mean_places_gained, 2)}
              </td>
              <td
                className={`num ${d.tire_mgmt_s_per_lap == null ? 'muted' : d.tire_mgmt_s_per_lap < 0 ? 'pos-good' : 'pos-bad'}`}
                title={d.tire_mgmt_races ? `${d.tire_mgmt_races} races measured` : undefined}
              >
                {d.tire_mgmt_s_per_lap == null ? '—' : signed(d.tire_mgmt_s_per_lap, 4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamTable({ teams }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 48 }}>#</th>
            <th>Constructor</th>
            <th className="num">Pts</th>
            <th className="num">Entries</th>
            <th className="num">Drivers</th>
            <th className="num">Wins</th>
            <th className="num">Podiums</th>
            <th className="num">DNF</th>
            <th className="num">Avg finish</th>
            <th className="num">Avg grid</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
            <tr key={t.team}>
              <td><Position value={i + 1} /></td>
              <td>
                <div className="driver-cell">
                  <span className="team-bar" style={{ background: teamColor(t.team) }} />
                  <span style={{ fontWeight: 600 }}>{t.team}</span>
                </div>
              </td>
              <td className="num" style={{ fontWeight: 700 }}>{num(t.points)}</td>
              <td className="num muted">{t.entries}</td>
              <td className="num muted">{t.drivers}</td>
              <td className="num">{t.wins || <span className="muted">—</span>}</td>
              <td className="num">{t.podiums || <span className="muted">—</span>}</td>
              <td className="num">{t.dnfs ? <span className="pos-bad">{t.dnfs}</span> : <span className="muted">0</span>}</td>
              <td className="num muted">{num(t.mean_finish, 2)}</td>
              <td className="num muted">{num(t.mean_grid, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CircuitTable({ circuits }) {
  const sorted = [...circuits].sort((a, b) => a.median_lap_s - b.median_lap_s);
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Circuit</th>
            <th className="num">Median lap</th>
            <th className="num">Fastest lap</th>
            <th className="num">Clean laps</th>
            <th className="num">Air °C</th>
            <th className="num">Track °C</th>
            <th className="num">Pit stops</th>
            <th className="num">Stationary</th>
            <th className="num">SC laps</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.circuit}>
              <td style={{ fontWeight: 600 }}>{c.circuit}</td>
              <td className="num">{lapTime(c.median_lap_s)}</td>
              <td className="num" style={{ color: '#b78cf0' }}>{lapTime(c.fastest_lap_s)}</td>
              <td className="num muted">{c.clean_laps}</td>
              <td className="num muted">{num(c.air_temp, 1)}</td>
              <td className="num muted">{num(c.track_temp, 1)}</td>
              <td className="num muted">{c.pit_stops ?? '—'}</td>
              <td className="num muted">{c.mean_stationary_s ? `${num(c.mean_stationary_s, 2)}s` : '—'}</td>
              <td className="num">
                {c.sc_laps ? <span className="pos-bad">{c.sc_laps}</span> : <span className="muted">0</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Grid vs finish: where a driver sits relative to the break-even line. */
function GridVsFinish({ drivers }) {
  const data = drivers.map((d) => ({
    x: d.mean_grid,
    y: d.mean_finish,
    driver: d.driver,
    team: d.team,
    gained: d.mean_places_gained,
  }));

  return (
    <>
      <div className="chart" style={{ height: 330 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 16, bottom: 26, left: 2 }}>
            <CartesianGrid {...GRID} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 'dataMax + 1']}
              {...AXIS}
              tickFormatter={tick1}
              label={axisLabel('MEAN GRID')}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 'dataMax + 1']}
              reversed
              width={38}
              {...AXIS}
              tickFormatter={tick1}
            />
            <ZAxis range={[70, 70]} />
            <ReferenceLine
              ifOverflow="extendDomain"
              segment={[
                { x: 0, y: 0 },
                { x: 24, y: 24 },
              ]}
              stroke="#6e6e7c"
              strokeDasharray="5 4"
              strokeWidth={1.5}
            />
            <Tooltip
              cursor={{ stroke: '#45454f', strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="tooltip">
                    <div className="tooltip__title">
                      {d.driver} · {d.team}
                    </div>
                    <div className="tooltip__row">
                      <span className="tooltip__label">Mean grid</span>
                      <span className="tooltip__value">{num(d.x, 2)}</span>
                    </div>
                    <div className="tooltip__row">
                      <span className="tooltip__label">Mean finish</span>
                      <span className="tooltip__value">{num(d.y, 2)}</span>
                    </div>
                    <div className="tooltip__row">
                      <span className="tooltip__label">Places gained</span>
                      <span className="tooltip__value">{signed(d.gained, 2)}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Scatter data={data} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.driver} fill={teamColor(d.team)} stroke="#101014" strokeWidth={2} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="muted" style={{ fontSize: 11.5, margin: '4px 0 0' }}>
        Both axes are positions and the finish axis is reversed, so the dashed line is break-even
        and better is higher. A dot <strong>above</strong> the line is a driver who finishes ahead
        of where they qualify. Hover any dot for the driver and the exact figures.
      </p>
    </>
  );
}

function TireManagement({ drivers }) {
  const data = drivers
    .filter((d) => d.tire_mgmt_s_per_lap != null)
    .sort((a, b) => a.tire_mgmt_s_per_lap - b.tire_mgmt_s_per_lap)
    .map((d) => ({ driver: d.driver, value: d.tire_mgmt_s_per_lap, team: d.team, races: d.tire_mgmt_races }));

  if (!data.length) return <Note>No tire-management figures for this season.</Note>;

  return (
    <>
      <div className="chart" style={{ height: 50 + data.length * 24 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 22, left: 4 }}>
            <CartesianGrid {...GRID} horizontal={false} />
            <XAxis type="number" {...AXIS} label={axisLabel('S / LAP vs FIELD MEDIAN')} />
            <YAxis type="category" dataKey="driver" width={46} interval={0} {...AXIS} />
            <ReferenceLine x={0} stroke="#45454f" />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="tooltip">
                    <div className="tooltip__title">{d.driver} · {d.team}</div>
                    <div className="tooltip__row">
                      <span className="tooltip__label">vs field median</span>
                      <span className="tooltip__value">{signed(d.value, 4)} s/lap</span>
                    </div>
                    <div className="tooltip__row">
                      <span className="tooltip__label">Races measured</span>
                      <span className="tooltip__value">{d.races}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" name="s/lap" barSize={11} radius={2}>
              {data.map((d) => (
                <Cell key={d.driver} fill={teamColor(d.team)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Note>
        Negative is better: the slope is measured relative to the field median in the same race, so
        the fuel effect cancels without a fuel model.
      </Note>
    </>
  );
}

export default function Standings() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('drivers');
  const yearParam = params.get('year');
  const { data: seasons } = useSeasons();
  const year = yearParam ? Number(yearParam) : (seasons?.[0]?.year ?? null);
  const q = useSeasonDashboard(year);

  const setYear = (y) => setParams({ year: String(y) }, { replace: true });

  return (
    <div className="stack stack--lg">
      <SectionHead
        title={`${year ?? ''} Championship`}
        sub="Standings, constructor table and per-circuit pace, from ingested race sessions."
      >
        <SeasonPicker year={year} onChange={setYear} />
      </SectionHead>

      <Async query={q} label="Loading standings">
        {(d) => (
          <div className="stack stack--lg">
            <div className="grid grid--tiles">
              <Tile label="Races" value={d.races} note="race sessions ingested" />
              <Tile label="Champion" value={d.drivers[0]?.driver ?? '—'} note={d.drivers[0]?.full_name} small />
              <Tile label="Leader pts" value={num(d.drivers[0]?.points)} note={`${d.drivers[0]?.wins ?? 0} wins`} />
              <Tile
                label="Constructor"
                value={d.teams[0]?.team ?? '—'}
                note={`${num(d.teams[0]?.points)} pts`}
                small
              />
              <Tile
                label="Total DNFs"
                value={d.drivers.reduce((s, x) => s + x.dnfs, 0)}
                note="across all classified drivers"
              />
            </div>

            <Panel flush>
              <div style={{ padding: '0 8px' }}>
                <Tabs
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: 'drivers', label: 'Drivers' },
                    { value: 'teams', label: 'Constructors' },
                    { value: 'circuits', label: 'Circuits' },
                  ]}
                />
              </div>
              {tab === 'drivers' && <DriverTable drivers={d.drivers} />}
              {tab === 'teams' && <TeamTable teams={d.teams} />}
              {tab === 'circuits' && <CircuitTable circuits={d.circuits} />}
            </Panel>

            <div className="grid grid--split-even">
              <Panel title="Qualifying vs race pace" aside="mean finishing position">
                <GridVsFinish drivers={d.drivers} />
              </Panel>
              <Panel title="Tire management" aside="relative to field">
                <TireManagement drivers={d.drivers} />
              </Panel>
            </div>

            {d.notes?.length > 0 && (
              <div className="stack" style={{ gap: 8 }}>
                {d.notes.map((n) => (
                  <Note key={n}>{n}</Note>
                ))}
              </div>
            )}
          </div>
        )}
      </Async>
    </div>
  );
}
