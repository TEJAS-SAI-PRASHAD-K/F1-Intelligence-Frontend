import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Cell,
} from 'recharts';

import { useRaceDashboard, useSessions, useLaps, usePitStops } from '../api/hooks';
import {
  Panel,
  SectionHead,
  Async,
  Loading,
  Position,
  DriverCell,
  Compound,
  Chip,
  Note,
  Tile,
  Tabs,
} from '../components/Primitives';
import { AXIS, GRID, CURSOR, axisLabel, Legend, ChartTooltip } from '../components/ChartKit';
import { teamColor, compoundColor } from '../lib/teams';
import { num, date, lapTime, signed, pct, statusTone } from '../lib/format';

// `status` distinguishes who saw the flag; a classified position alone does not.
const FINISHED = new Set(['Finished', 'Lapped']);

function ResultsTable({ results }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 54 }}>Pos</th>
            <th>Driver</th>
            <th>Team</th>
            <th className="num">Grid</th>
            <th className="num">Places</th>
            <th className="num">Points</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.driver}>
              <td><Position value={r.position} /></td>
              <td><DriverCell code={r.driver} team={r.team} /></td>
              <td className="secondary">{r.team}</td>
              <td className="num muted">{num(r.grid_position)}</td>
              <td className={`num ${r.places_gained > 0 ? 'pos-good' : r.places_gained < 0 ? 'pos-bad' : 'muted'}`}>
                {r.places_gained ? signed(r.places_gained, 0) : '—'}
              </td>
              <td className="num" style={{ fontWeight: 600 }}>
                {r.points ? num(r.points) : <span className="muted">—</span>}
              </td>
              <td className={statusTone(r.status)}>{r.status ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Stint chart: one row per driver, bars laid out along the race distance. */
function StintChart({ stints, totalLaps, results }) {
  const order = useMemo(() => {
    const pos = new Map((results ?? []).map((r) => [r.driver, r.position ?? 99]));
    const byDriver = new Map();
    for (const s of stints) {
      if (!byDriver.has(s.driver)) byDriver.set(s.driver, []);
      byDriver.get(s.driver).push(s);
    }
    return [...byDriver.entries()]
      .map(([driver, list]) => ({
        driver,
        stints: [...list].sort((a, b) => a.lap_start - b.lap_start),
      }))
      .sort((a, b) => (pos.get(a.driver) ?? 99) - (pos.get(b.driver) ?? 99));
  }, [stints, results]);

  const laps = totalLaps || Math.max(...stints.map((s) => s.lap_end), 1);
  const compoundsUsed = [...new Set(stints.map((s) => s.compound).filter(Boolean))];

  return (
    <div className="stack" style={{ gap: 10 }}>
      <Legend items={compoundsUsed.map((c) => ({ label: c, color: compoundColor(c) }))} />

      <div className="stack" style={{ gap: 1 }}>
        {order.map(({ driver, stints: list }) => (
          <div className="stint-row" key={driver}>
            <Link to={`/driver/${driver}`} className="stint-row__driver">
              {driver}
            </Link>
            <div className="stint-row__track">
              {list.map((s, i) => {
                const prevEnd = i === 0 ? 0 : list[i - 1].lap_end;
                const gap = s.lap_start - prevEnd - 1;
                const width = (s.laps / laps) * 100;
                return (
                  <div key={s.stint_number} style={{ display: 'contents' }}>
                    {gap > 0 && <div style={{ flex: `0 0 ${(gap / laps) * 100}%` }} aria-hidden />}
                    <div
                      className="stint-bar"
                      style={{ flex: `0 0 ${width}%`, background: compoundColor(s.compound) }}
                      title={`${driver} · ${s.compound ?? 'unknown'} · laps ${s.lap_start}–${s.lap_end} (${s.laps}) · median ${lapTime(s.median_green_lap_s)} · deg ${s.degradation_s_per_lap == null ? 'n/a' : `${signed(s.degradation_s_per_lap, 3)} s/lap`}`}
                    >
                      {width > 6 ? s.laps : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="row" style={{ justifyContent: 'space-between', paddingLeft: 56 }}>
        <span className="mono muted" style={{ fontSize: 10 }}>LAP 1</span>
        <span className="mono muted" style={{ fontSize: 10 }}>LAP {laps}</span>
      </div>

      <Note>
        Bar width is the stint length; the number inside is laps run. Hover a bar for its median
        green lap and measured degradation slope. Compound is labelled in the legend, never colour
        alone.
      </Note>
    </div>
  );
}

function PredictionCheck({ rows, note }) {
  const data = rows.map((r) => ({
    predicted: r.predicted_rank,
    actual: r.actual_position,
    driver: r.driver,
    grid: r.grid_position,
    podium: r.podium_probability,
    error: r.rank_error,
  }));

  const withActual = data.filter((d) => d.actual != null);
  const mae = withActual.length
    ? withActual.reduce((s, d) => s + Math.abs(d.predicted - d.actual), 0) / withActual.length
    : null;

  return (
    <div className="stack" style={{ gap: 12 }}>
      {note && <Note warn>{note}</Note>}

      <div className="grid grid--tiles">
        <Tile label="Rank MAE (this race)" value={mae == null ? '—' : num(mae, 2)} unit="pos" />
        <Tile
          label="Exact hits"
          value={withActual.filter((d) => d.predicted === Math.round(d.actual)).length}
          note={`of ${withActual.length} classified`}
        />
        <Tile
          label="Podium called"
          value={withActual.filter((d) => d.predicted <= 3 && d.actual <= 3).length}
          unit="/ 3"
        />
      </div>

      <div className="chart" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 16, bottom: 26, left: 2 }}>
            <CartesianGrid {...GRID} />
            <XAxis
              type="number"
              dataKey="predicted"
              domain={[0, 21]}
              {...AXIS}
              label={axisLabel('PREDICTED RANK')}
            />
            <YAxis
              type="number"
              dataKey="actual"
              domain={[0, 21]}
              reversed
              width={38}
              {...AXIS}
            />
            <ZAxis range={[70, 70]} />
            <ReferenceLine
              ifOverflow="extendDomain"
              segment={[
                { x: 0, y: 0 },
                { x: 21, y: 21 },
              ]}
              stroke="#6e6e7c"
              strokeDasharray="5 4"
              strokeWidth={1.5}
            />
            <Tooltip
              cursor={CURSOR}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="tooltip">
                    <div className="tooltip__title">{d.driver}</div>
                    <div className="tooltip__row">
                      <span className="tooltip__label">Predicted</span>
                      <span className="tooltip__value">P{d.predicted}</span>
                    </div>
                    <div className="tooltip__row">
                      <span className="tooltip__label">Actual</span>
                      <span className="tooltip__value">{d.actual == null ? '—' : `P${Math.round(d.actual)}`}</span>
                    </div>
                    <div className="tooltip__row">
                      <span className="tooltip__label">Grid</span>
                      <span className="tooltip__value">{num(d.grid)}</span>
                    </div>
                    <div className="tooltip__row">
                      <span className="tooltip__label">P(podium)</span>
                      <span className="tooltip__value">{pct(d.podium)}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Scatter data={withActual} isAnimationActive={false}>
              {withActual.map((d) => (
                <Cell
                  key={d.driver}
                  fill={Math.abs(d.predicted - d.actual) <= 2 ? '#36a86d' : '#ee4155'}
                  stroke="#101014"
                  strokeWidth={2}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <Legend
        items={[
          { label: 'Within 2 places', color: '#36a86d' },
          { label: 'Off by 3 or more', color: '#ee4155' },
        ]}
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Driver</th>
              <th className="num">Predicted</th>
              <th className="num">Actual</th>
              <th className="num">Error</th>
              <th className="num">Grid</th>
              <th className="num">P(podium)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.driver}>
                <td><DriverCell code={r.driver} /></td>
                <td className="num">P{r.predicted_rank}</td>
                <td className="num">{r.actual_position == null ? '—' : `P${Math.round(r.actual_position)}`}</td>
                <td className={`num ${Math.abs(r.rank_error ?? 0) <= 2 ? 'muted' : 'pos-bad'}`}>
                  {r.rank_error == null ? '—' : signed(r.rank_error, 0)}
                </td>
                <td className="num muted">{num(r.grid_position)}</td>
                <td className="num">{pct(r.podium_probability)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Lap-by-lap pace for up to five drivers, green laps only. */
function PaceChart({ sessionId, results }) {
  const top = (results ?? []).slice(0, 5).map((r) => r.driver);
  const [selected, setSelected] = useState(top.slice(0, 3));
  const q = useLaps(sessionId, { green_only: 'true', accurate_only: 'true', limit: '3000' });

  const toggle = (d) =>
    setSelected((s) => (s.includes(d) ? s.filter((x) => x !== d) : s.length < 5 ? [...s, d] : s));

  const { data, series } = useMemo(() => {
    const laps = q.data ?? [];
    const byLap = new Map();
    for (const l of laps) {
      if (!selected.includes(l.driver) || l.lap_time_s == null) continue;
      if (!byLap.has(l.lap_number)) byLap.set(l.lap_number, { lap: l.lap_number });
      byLap.get(l.lap_number)[l.driver] = l.lap_time_s;
    }
    const teamOf = new Map((results ?? []).map((r) => [r.driver, r.team]));
    return {
      data: [...byLap.values()].sort((a, b) => a.lap - b.lap),
      series: selected.map((d) => ({ key: d, color: teamColor(teamOf.get(d)) })),
    };
  }, [q.data, selected, results]);

  if (q.isLoading) return <Loading label="Loading laps" />;

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 6 }}>
        <span className="field__label" style={{ marginRight: 4 }}>Drivers</span>
        {(results ?? []).slice(0, 12).map((r) => (
          <button
            key={r.driver}
            className={`btn btn--sm ${selected.includes(r.driver) ? 'btn--primary' : ''}`}
            onClick={() => toggle(r.driver)}
            aria-pressed={selected.includes(r.driver)}
          >
            {r.driver}
          </button>
        ))}
      </div>

      <Legend items={series.map((s) => ({ label: s.key, color: s.color }))} line />

      <div className="chart" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 16, bottom: 24, left: 6 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="lap" {...AXIS} label={axisLabel('LAP')} />
            <YAxis
              {...AXIS}
              domain={['dataMin - 0.6', 'dataMax + 0.6']}
              tickFormatter={(v) => lapTime(v)}
              width={62}
            />
            <Tooltip
              cursor={CURSOR}
              content={(p) => (
                <ChartTooltip
                  {...p}
                  title={(l) => `Lap ${l}`}
                  format={(v) => lapTime(v)}
                  sort
                />
              )}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.key}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#101014' }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <Note>
        Strictly green, FastF1-accurate laps only. Gaps are in-laps, out-laps and anything under a
        yellow — a lifted lap is not representative pace.
      </Note>
    </div>
  );
}

function PitStops({ sessionId }) {
  const q = usePitStops(sessionId);
  return (
    <Async query={q} label="Loading pit stops" empty="No pit stops recorded.">
      {(stops) => (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Driver</th>
                <th className="num">Stop</th>
                <th className="num">Lap</th>
                <th className="num">Stationary</th>
                <th>In</th>
                <th>Out</th>
              </tr>
            </thead>
            <tbody>
              {stops.map((s, i) => (
                <tr key={`${s.driver}-${s.stop_number}-${i}`}>
                  <td><DriverCell code={s.driver} /></td>
                  <td className="num muted">{s.stop_number}</td>
                  <td className="num">{s.lap_number ?? '—'}</td>
                  <td className="num">
                    {s.duration_ms_est == null ? (
                      <span className="muted" title="Pit delta was implausible — not a measurable stop">
                        n/a
                      </span>
                    ) : (
                      `${num(s.duration_ms_est / 1000, 2)}s`
                    )}
                  </td>
                  <td><Compound value={s.compound_in} /></td>
                  <td><Compound value={s.compound_out} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Async>
  );
}

export default function Race() {
  const { eventId } = useParams();
  const q = useRaceDashboard(eventId);
  const sessionsQ = useSessions(eventId);
  const [tab, setTab] = useState('result');

  const raceSession = (sessionsQ.data ?? []).find((s) => s.session_type === 'R');

  return (
    <div className="stack stack--lg">
      <Async query={q} label="Loading race">
        {(d) => {
          const podium = d.results.slice(0, 3);
          return (
            <>
              <SectionHead title={d.event_name} sub={`${d.circuit} · Round ${d.round} · ${date(d.event_date)}`}>
                <Link to={`/races?year=${d.season_year}`} className="btn btn--sm">
                  ← {d.season_year} calendar
                </Link>
              </SectionHead>

              <div className="grid grid--tiles">
                {podium.map((p, i) => (
                  <div className="tile" key={p.driver}>
                    <span className="tile__label">P{i + 1}</span>
                    <span className="tile__value" style={{ color: teamColor(p.team) }}>
                      {p.driver}
                    </span>
                    <span className="tile__note">
                      {p.team} · from P{num(p.grid_position)}
                    </span>
                  </div>
                ))}
                <Tile label="Race distance" value={d.total_laps ?? '—'} unit="laps" />
                <Tile
                  label="Saw the flag"
                  value={d.results.filter((r) => FINISHED.has(r.status) || r.status?.startsWith('+')).length}
                  note={`of ${d.results.length} classified`}
                />
              </div>

              <Panel flush>
                <div style={{ padding: '0 8px' }}>
                  <Tabs
                    value={tab}
                    onChange={setTab}
                    options={[
                      { value: 'result', label: 'Result' },
                      { value: 'stints', label: 'Stints' },
                      { value: 'pace', label: 'Pace' },
                      { value: 'pits', label: 'Pit stops' },
                      { value: 'prediction', label: 'Prediction check' },
                    ]}
                  />
                </div>

                {tab === 'result' && <ResultsTable results={d.results} />}

                {tab === 'stints' && (
                  <div className="panel__body">
                    <StintChart stints={d.stints} totalLaps={d.total_laps} results={d.results} />
                  </div>
                )}

                {tab === 'pace' && (
                  <div className="panel__body">
                    {sessionsQ.isLoading ? (
                      <Loading />
                    ) : raceSession ? (
                      <PaceChart sessionId={raceSession.id} results={d.results} />
                    ) : (
                      <Note warn>No race session ingested for this event, so there are no laps to plot.</Note>
                    )}
                  </div>
                )}

                {tab === 'pits' && (
                  <div>
                    {sessionsQ.isLoading ? (
                      <Loading />
                    ) : raceSession ? (
                      <PitStops sessionId={raceSession.id} />
                    ) : (
                      <div className="panel__body">
                        <Note warn>No race session ingested for this event.</Note>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'prediction' && (
                  <div className="panel__body">
                    {d.prediction_vs_actual?.length ? (
                      <PredictionCheck rows={d.prediction_vs_actual} note={d.prediction_note} />
                    ) : (
                      <Note warn>No prediction is registered for this race.</Note>
                    )}
                  </div>
                )}
              </Panel>

              {sessionsQ.data?.length > 0 && (
                <Panel title="Sessions ingested">
                  <div className="row">
                    {sessionsQ.data.map((s) => (
                      <Chip key={s.id}>
                        {s.session_type}
                        {s.total_laps ? ` · ${s.total_laps} laps` : ''}
                      </Chip>
                    ))}
                  </div>
                </Panel>
              )}
            </>
          );
        }}
      </Async>
    </div>
  );
}
