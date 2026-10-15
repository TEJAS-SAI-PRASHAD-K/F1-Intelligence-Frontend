import { useEffect, useState, useMemo } from 'react';
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
  Cell,
  ReferenceLine,
} from 'recharts';

import {
  useCircuits,
  useDegradation,
  useTireModelInfo,
  useLatestSeason,
  useRaceSessions,
  useObservedStints,
} from '../api/hooks';
import {
  Panel,
  SectionHead,
  Tile,
  Note,
  Field,
  Tabs,
  Loading,
  ErrorState,
  Compound,
  DriverCell,
  Async,
} from '../components/Primitives';
import { AXIS, GRID, CURSOR, axisLabel, Legend, ChartTooltip } from '../components/ChartKit';
import { compoundColor, COMPOUNDS } from '../lib/teams';
import { num, signed, lapTime } from '../lib/format';

/* ------------------------------------------------------------------ */
/* Model curve                                                         */
/* ------------------------------------------------------------------ */

function CurveBuilder() {
  const { circuits, isLoading: circuitsLoading } = useCircuits();
  const [form, setForm] = useState({
    circuit: '',
    max_tyre_life: 30,
    race_laps: 57,
    air_temp: 25,
    track_temp: 38,
  });
  const [compounds, setCompounds] = useState(['SOFT', 'MEDIUM', 'HARD']);
  const [curves, setCurves] = useState(null);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const deg = useDegradation();

  useEffect(() => {
    if (!form.circuit && circuits.length) {
      setForm((f) => ({ ...f, circuit: circuits.find((c) => c.name === 'Sakhir')?.name ?? circuits[0].name }));
    }
  }, [circuits, form.circuit]);

  const set = (k) => (e) => {
    const v = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const toggle = (c) =>
    setCompounds((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  async function run(e) {
    e?.preventDefault();
    if (!form.circuit || !compounds.length) return;
    setPending(true);
    setError(null);
    try {
      const results = await Promise.all(
        compounds.map((c) => deg.mutateAsync({ ...form, compound: c })),
      );
      setCurves(results);
    } catch (err) {
      setError(err);
      setCurves(null);
    } finally {
      setPending(false);
    }
  }

  // Run once as soon as a circuit is available, so the page is never empty.
  useEffect(() => {
    if (form.circuit && !curves && !pending && !error) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.circuit]);

  const chartData = useMemo(() => {
    if (!curves?.length) return [];
    const byLife = new Map();
    for (const c of curves) {
      for (const p of c.points) {
        if (!byLife.has(p.tyre_life)) byLife.set(p.tyre_life, { life: p.tyre_life });
        byLife.get(p.tyre_life)[c.compound] = p.delta_vs_fresh_s;
      }
    }
    return [...byLife.values()].sort((a, b) => a.life - b.life);
  }, [curves]);

  const unseen = curves?.flatMap((c) => Object.keys(c.unseen_categories ?? {})) ?? [];

  return (
    <div className="stack">
      <Panel title="Curve inputs" aside="POST /tire/degradation">
        <form onSubmit={run} className="stack" style={{ gap: 14 }}>
          <div className="form-grid">
            <Field label="Circuit">
              <select className="select" value={form.circuit} onChange={set('circuit')} disabled={circuitsLoading}>
                {circuits.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                    {c.country ? ` — ${c.country}` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tire age" hint="laps of age to project (2–60)">
              <input className="input" type="number" min={2} max={60} value={form.max_tyre_life} onChange={set('max_tyre_life')} />
            </Field>
            <Field label="Race laps" hint="20–100">
              <input className="input" type="number" min={20} max={100} value={form.race_laps} onChange={set('race_laps')} />
            </Field>
            <Field label="Air temp °C">
              <input className="input" type="number" min={-10} max={60} value={form.air_temp} onChange={set('air_temp')} />
            </Field>
            <Field label="Track temp °C">
              <input className="input" type="number" min={-10} max={80} value={form.track_temp} onChange={set('track_temp')} />
            </Field>
          </div>

          <div className="row">
            <span className="field__label" style={{ marginRight: 4 }}>Compounds</span>
            {COMPOUNDS.map((c) => (
              <button
                type="button"
                key={c}
                className={`btn btn--sm ${compounds.includes(c) ? 'btn--primary' : ''}`}
                aria-pressed={compounds.includes(c)}
                onClick={() => toggle(c)}
              >
                {c}
              </button>
            ))}
            <button className="btn btn--primary" type="submit" disabled={pending || !compounds.length} style={{ marginLeft: 'auto' }}>
              {pending ? 'Projecting…' : 'Project curve'}
            </button>
          </div>
        </form>
      </Panel>

      {error && <ErrorState error={error} onRetry={run} />}
      {pending && !curves && <Loading label="Running the model" />}

      {curves?.length > 0 && (
        <>
          <div className="grid grid--tiles">
            {curves.map((c) => (
              <div className="tile" key={c.compound}>
                <span className="tile__label">{c.compound} · rate</span>
                <span className="tile__value" style={{ color: compoundColor(c.compound) }}>
                  {num(c.degradation_rate_s_per_lap, 3)}
                  <span className="tile__unit">s/lap</span>
                </span>
                <span className="tile__note">
                  {num(c.total_loss_s, 2)}s lost by lap {form.max_tyre_life}
                </span>
              </div>
            ))}
          </div>

          <Panel title="Predicted lap-time loss" aside={`seconds vs fresh · ${curves[0]?.model_backend}`}>
            <Legend items={curves.map((c) => ({ label: c.compound, color: compoundColor(c.compound) }))} line />
            <div className="chart" style={{ height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 6, right: 16, bottom: 24, left: 4 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="life" {...AXIS} label={axisLabel('TIRE AGE (LAPS)')} />
                  <YAxis
                    {...AXIS}
                    tickFormatter={(v) => `${v.toFixed(1)}s`}
                    width={56}
                  />
                  <Tooltip
                    cursor={CURSOR}
                    content={(p) => (
                      <ChartTooltip
                        {...p}
                        title={(l) => `Tire age ${l} laps`}
                        format={(v) => `+${num(v, 3)}s`}
                      />
                    )}
                  />
                  {curves.map((c) => (
                    <Line
                      key={c.compound}
                      type="monotone"
                      dataKey={c.compound}
                      name={c.compound}
                      stroke={compoundColor(c.compound)}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: '#101014' }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <Note>
              Read <strong>loss vs fresh</strong>: how much slower the tire is at that age than it
              was new. The reference lap is held at the stint midpoint so the curve shows the
              partial effect of tire age alone.
            </Note>
          </Panel>

          {unseen.length > 0 && (
            <Note warn>
              Unseen in training: {[...new Set(unseen)].join(', ')}. The prediction fell back toward
              the global average for those fields — treat this curve with suspicion.
            </Note>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Observed stints (Stage A)                                           */
/* ------------------------------------------------------------------ */

function ObservedStints() {
  const { year } = useLatestSeason();
  const [season, setSeason] = useState(null);
  const activeYear = season ?? year;
  const { sessions, isLoading: sessionsLoading } = useRaceSessions(activeYear);
  const [sessionId, setSessionId] = useState(null);
  const [minLaps, setMinLaps] = useState(5);

  useEffect(() => {
    if (sessions.length) setSessionId((s) => (sessions.some((x) => x.sessionId === s) ? s : sessions[0].sessionId));
  }, [sessions]);

  const q = useObservedStints(sessionId, minLaps);

  const scatter = useMemo(
    () =>
      (q.data ?? []).map((s) => ({
        x: s.laps,
        y: s.slope_s_per_lap,
        r2: s.r2,
        driver: s.driver,
        compound: s.compound,
        stint: s.stint_number,
      })),
    [q.data],
  );

  const current = sessions.find((s) => s.sessionId === sessionId);

  return (
    <div className="stack">
      <Panel title="Measured degradation" aside="GET /tire/stints/{session_id}">
        <div className="form-grid">
          <Field label="Season">
            <select className="select" value={activeYear ?? ''} onChange={(e) => setSeason(Number(e.target.value))}>
              {[2024, 2023, 2022, 2021, 2020, 2019].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </Field>
          <Field label="Race">
            <select
              className="select"
              value={sessionId ?? ''}
              onChange={(e) => setSessionId(Number(e.target.value))}
              disabled={sessionsLoading}
            >
              {sessions.map((s) => (
                <option key={s.sessionId} value={s.sessionId}>
                  R{s.event.round} · {s.event.event_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Min clean laps" hint="to fit a slope (≥2)">
            <input className="input" type="number" min={2} max={30} value={minLaps} onChange={(e) => setMinLaps(Number(e.target.value))} />
          </Field>
        </div>
      </Panel>

      {sessionsLoading && <Loading label="Loading races" />}

      {sessionId && (
        <Async query={q} label="Fitting stints" empty="No stint met the minimum clean-lap threshold.">
          {(stints) => {
            const byCompound = COMPOUNDS.map((c) => {
              const rows = stints.filter((s) => s.compound === c);
              const mean = rows.length ? rows.reduce((a, s) => a + s.slope_s_per_lap, 0) / rows.length : null;
              return { compound: c, n: rows.length, mean };
            }).filter((x) => x.n > 0);

            return (
              <div className="stack">
                <div className="grid grid--tiles">
                  <Tile label="Stints fitted" value={stints.length} note={current?.event.event_name} />
                  {byCompound.map((c) => (
                    <div className="tile" key={c.compound}>
                      <span className="tile__label">{c.compound} · mean slope</span>
                      <span className="tile__value" style={{ color: compoundColor(c.compound) }}>
                        {signed(c.mean, 3)}
                        <span className="tile__unit">s/lap</span>
                      </span>
                      <span className="tile__note">{c.n} stints</span>
                    </div>
                  ))}
                </div>

                <Panel title="Slope vs stint length" aside="s/lap · fuel-corrected OLS">
                  <Legend items={COMPOUNDS.map((c) => ({ label: c, color: compoundColor(c) }))} />
                  <div className="chart" style={{ height: 340 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 16, bottom: 26, left: 6 }}>
                        <CartesianGrid {...GRID} />
                        <XAxis type="number" dataKey="x" {...AXIS} label={axisLabel('STINT LENGTH (LAPS)')} />
                        <YAxis
                          type="number"
                          dataKey="y"
                          {...AXIS}
                          width={56}
                          tickFormatter={(v) => `${v.toFixed(2)}`}
                        />
                        <ZAxis range={[60, 60]} />
                        <ReferenceLine y={0} stroke="#45454f" />
                        <Tooltip
                          cursor={CURSOR}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="tooltip">
                                <div className="tooltip__title">
                                  {d.driver} · stint {d.stint} · {d.compound ?? '—'}
                                </div>
                                <div className="tooltip__row">
                                  <span className="tooltip__label">Slope</span>
                                  <span className="tooltip__value">{signed(d.y, 4)} s/lap</span>
                                </div>
                                <div className="tooltip__row">
                                  <span className="tooltip__label">Laps</span>
                                  <span className="tooltip__value">{d.x}</span>
                                </div>
                                <div className="tooltip__row">
                                  <span className="tooltip__label">r²</span>
                                  <span className="tooltip__value">{num(d.r2, 3)}</span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Scatter data={scatter} isAnimationActive={false}>
                          {scatter.map((d, i) => (
                            <Cell
                              key={`${d.driver}-${d.stint}-${i}`}
                              fill={compoundColor(d.compound)}
                              fillOpacity={0.35 + Math.min(Math.max(d.r2, 0), 1) * 0.65}
                              stroke="#101014"
                              strokeWidth={2}
                            />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <Note>
                    Opacity carries r² — a faint dot is a slope the data does not support. Lap times
                    are fuel-corrected before fitting; without that, fuel burn almost exactly
                    cancels wear and the slopes come out near zero.
                  </Note>
                </Panel>

                <Panel flush title="Every fitted stint">
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Driver</th>
                          <th className="num">Stint</th>
                          <th>Compound</th>
                          <th className="num">Laps</th>
                          <th className="num">Age range</th>
                          <th className="num">Slope s/lap</th>
                          <th className="num">Intercept</th>
                          <th className="num">r²</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...stints]
                          .sort((a, b) => b.slope_s_per_lap - a.slope_s_per_lap)
                          .map((s, i) => (
                            <tr key={`${s.driver}-${s.stint_number}-${i}`}>
                              <td><DriverCell code={s.driver} /></td>
                              <td className="num muted">{s.stint_number}</td>
                              <td><Compound value={s.compound} /></td>
                              <td className="num">{s.laps}</td>
                              <td className="num muted">
                                {num(s.tyre_life_min)}–{num(s.tyre_life_max)}
                              </td>
                              <td className={`num ${s.slope_s_per_lap > 0 ? 'pos-bad' : 'pos-good'}`} style={{ fontWeight: 600 }}>
                                {signed(s.slope_s_per_lap, 4)}
                              </td>
                              <td className="num muted">{lapTime(s.intercept_s)}</td>
                              <td className={`num ${s.r2 < 0.2 ? 'muted' : ''}`}>{num(s.r2, 3)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </div>
            );
          }}
        </Async>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ModelCard() {
  const q = useTireModelInfo();
  return (
    <Async query={q} label="Loading model info">
      {(m) => (
        <div className="grid grid--tiles">
          <Tile label="Backend" value={m.backend} note={`v${m.version}`} small />
          <Tile
            label="Holdout MAE"
            value={m.holdout ? num(m.holdout.mae_s, 4) : '—'}
            unit="s"
            note={m.holdout ? `r² ${num(m.holdout.r2, 3)} · n=${m.holdout.n.toLocaleString()}` : null}
          />
          <Tile
            label="Baseline MAE"
            value={m.baseline_mae_s ? num(m.baseline_mae_s, 4) : '—'}
            unit="s"
            note="lap == its stint median"
          />
          <Tile
            label="Lift vs baseline"
            value={m.lift_vs_baseline != null ? `${num(m.lift_vs_baseline * 100, 1)}%` : '—'}
            tone={m.lift_vs_baseline > 0 ? 'pos-good' : 'pos-bad'}
          />
          <Tile
            label="Trained on"
            value={`${m.train_season_min}–${m.train_season_max}`}
            note={m.n_train_rows ? `${m.n_train_rows.toLocaleString()} rows` : null}
            small
          />
          <Tile
            label="Control (HistGBR)"
            value={m.control_histgbr_mae_s ? num(m.control_histgbr_mae_s, 4) : '—'}
            unit="s"
            note="beating the primary suggests over-tuning"
          />
        </div>
      )}
    </Async>
  );
}

export default function TireLab() {
  const [tab, setTab] = useState('model');

  return (
    <div className="stack stack--lg">
      <SectionHead
        title="Tire Lab"
        sub="What the model expects a tire to do, and what the stints in a real race actually did."
      />

      <ModelCard />

      <Panel flush>
        <div style={{ padding: '0 8px' }}>
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'model', label: 'Model curve' },
              { value: 'observed', label: 'Observed stints' },
            ]}
          />
        </div>
        <div className="panel__body">
          {tab === 'model' ? <CurveBuilder /> : <ObservedStints />}
        </div>
      </Panel>

      <Note warn>
        SOFT / MEDIUM / HARD are relative to each weekend&apos;s allocation — a Monza soft and a
        Monaco soft are different rubber, so compounds are not comparable across circuits.
      </Note>
    </div>
  );
}
