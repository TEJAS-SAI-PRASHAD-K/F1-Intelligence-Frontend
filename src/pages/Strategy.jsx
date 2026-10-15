import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

import { useCircuits, useCircuitInputs, useSimulate, useCompare } from '../api/hooks';
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
} from '../components/Primitives';
import { AXIS, GRID, axisLabel, Legend, tickSec } from '../components/ChartKit';
import { compoundColor, COMPOUNDS } from '../lib/teams';
import { num, pct, raceTime, lapTime } from '../lib/format';

/** The stint layout of a strategy, drawn to scale across the race distance. */
function StintTrack({ stints, raceLaps, height = 14 }) {
  const total = raceLaps || stints.reduce((s, x) => s + x.laps, 0);
  return (
    <div className="strat__track" style={{ height }}>
      {stints.map((s, i) => (
        <div
          key={i}
          className="stint-bar"
          style={{ flex: `0 0 ${(s.laps / total) * 100}%`, background: compoundColor(s.compound) }}
          title={`${s.compound} · ${s.laps} laps`}
        >
          {(s.laps / total) * 100 > 9 ? s.laps : ''}
        </div>
      ))}
    </div>
  );
}

function InputsPanel({ inputs }) {
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="grid grid--tiles">
        <Tile label="Race distance" value={inputs.race_laps} unit="laps" />
        <Tile label="Base pace" value={lapTime(inputs.base_pace_s)} small />
        <Tile
          label="Pit loss"
          value={num(inputs.pit_loss_s, 2)}
          unit="s"
          note={`± ${num(inputs.pit_loss_sd_s, 2)}s`}
        />
        <Tile
          label="Safety car"
          value={pct(inputs.sc_probability, 0)}
          note={`median ${inputs.median_sc_laps} laps`}
        />
        <Tile
          label="Evidence"
          value={inputs.n_stops_observed}
          note={`stops across ${inputs.n_races_observed} races`}
        />
      </div>

      <div className="grid grid--split-even">
        <div>
          <div className="field__label" style={{ marginBottom: 8 }}>Degradation (s/lap)</div>
          <div className="stack" style={{ gap: 6 }}>
            {Object.entries(inputs.degradation_s_per_lap).map(([c, v]) => (
              <div className="row" key={c} style={{ gap: 10 }}>
                <Compound value={c} />
                <div style={{ flex: 1, height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min((v / 0.25) * 100, 100)}%`,
                      height: '100%',
                      background: compoundColor(c),
                      borderRadius: 4,
                    }}
                  />
                </div>
                <span className="mono" style={{ minWidth: 62, textAlign: 'right' }}>{num(v, 4)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="field__label" style={{ marginBottom: 8 }}>Max stint (laps)</div>
          <div className="stack" style={{ gap: 6 }}>
            {Object.entries(inputs.max_stint_laps).map(([c, v]) => (
              <div className="row" key={c} style={{ gap: 10 }}>
                <Compound value={c} />
                <div style={{ flex: 1, height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(v / inputs.race_laps) * 100}%`,
                      height: '100%',
                      background: compoundColor(c),
                      borderRadius: 4,
                    }}
                  />
                </div>
                <span className="mono" style={{ minWidth: 62, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Note>
        Every recommendation follows from these numbers. Source:{' '}
        <strong>{inputs.degradation_source}</strong>.
      </Note>

      {inputs.notes?.length > 0 && inputs.notes.map((n) => <Note warn key={n}>{n}</Note>)}
    </div>
  );
}

function StrategyCard({ s, raceLaps, best }) {
  return (
    <div className={`strat ${best ? 'strat--best' : ''}`}>
      <div className="strat__head">
        <span className="strat__label">{s.label}</span>
        <span className="chip">{s.n_stops} stop{s.n_stops === 1 ? '' : 's'}</span>
        {best && <span className="chip chip--good">Best</span>}
        <span className="mono" style={{ marginLeft: 'auto', color: s.deterministic_delta_s === 0 ? 'var(--good)' : 'var(--ink-secondary)' }}>
          {s.deterministic_delta_s === 0 ? 'reference' : `+${num(s.deterministic_delta_s, 2)}s`}
        </span>
      </div>

      <StintTrack stints={s.stints} raceLaps={raceLaps} />

      <div className="muted mono" style={{ fontSize: 11 }}>
        Stops on lap {s.stop_laps.join(', ') || '—'}
      </div>

      <div className="strat__metrics">
        <div>
          <div className="strat__metric-label">Race time</div>
          <div className="strat__metric-value">{raceTime(s.deterministic_total_s)}</div>
        </div>
        <div>
          <div className="strat__metric-label">Deg cost</div>
          <div className="strat__metric-value">{num(s.degradation_cost_s, 1)}s</div>
        </div>
        <div>
          <div className="strat__metric-label">Pit cost</div>
          <div className="strat__metric-value">{num(s.pit_cost_s, 1)}s</div>
        </div>
        {s.mc_median_s != null && (
          <div>
            <div className="strat__metric-label">MC Δ</div>
            <div className="strat__metric-value">
              {s.mc_delta_s === 0 ? '0.0s' : `+${num(s.mc_delta_s, 1)}s`}
            </div>
          </div>
        )}
        {s.win_rate_vs_best != null && (
          <div>
            <div className="strat__metric-label">Win vs best</div>
            <div
              className="strat__metric-value"
              style={{ color: s.win_rate_vs_best >= 0.5 ? 'var(--good)' : 'var(--ink)' }}
            >
              {pct(s.win_rate_vs_best, 0)}
            </div>
          </div>
        )}
        {s.margin_sd_s != null && (
          <div>
            <div className="strat__metric-label">Margin SD</div>
            <div className="strat__metric-value">{num(s.margin_sd_s, 2)}s</div>
          </div>
        )}
        {s.sc_luck_rate != null && (
          <div>
            <div className="strat__metric-label">SC luck</div>
            <div className="strat__metric-value">{pct(s.sc_luck_rate, 0)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DeltaChart({ strategies }) {
  const data = strategies.map((s) => ({
    label: s.label,
    delta: s.deterministic_delta_s,
    stops: s.n_stops,
  }));

  return (
    <>
      <Legend
        items={[...new Set(data.map((d) => d.stops))]
          .sort()
          .map((n, i) => ({ label: `${n} stop${n === 1 ? '' : 's'}`, color: ['#4b93e6', '#bc8a1e', '#9b70de', '#36a86d'][i] }))}
      />
      <div className="chart" style={{ height: Math.max(180, data.length * 42) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 22, left: 4 }}>
            <CartesianGrid {...GRID} horizontal={false} />
            <XAxis type="number" {...AXIS} label={axisLabel('SECONDS BEHIND BEST')} tickFormatter={tickSec} />
            <YAxis type="category" dataKey="label" width={118} {...AXIS} tick={{ ...AXIS.tick, fontSize: 10.5 }} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="tooltip">
                    <div className="tooltip__title">{d.label}</div>
                    <div className="tooltip__row">
                      <span className="tooltip__label">Behind best</span>
                      <span className="tooltip__value">{num(d.delta, 2)}s</span>
                    </div>
                    <div className="tooltip__row">
                      <span className="tooltip__label">Stops</span>
                      <span className="tooltip__value">{d.stops}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="delta" name="Behind best" barSize={18} radius={[0, 4, 4, 0]}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={['#4b93e6', '#bc8a1e', '#9b70de', '#36a86d'][[...new Set(data.map((x) => x.stops))].sort().indexOf(d.stops)]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Simulator({ circuit, raceLaps }) {
  const [opts, setOpts] = useState({
    max_stops: 3,
    top_k: 8,
    n_scenarios: 2000,
    per_stop_count: true,
    degradation_source: 'stage_a',
    seed: 42,
  });
  const sim = useSimulate();

  const run = () =>
    sim.mutate({ circuit, ...(raceLaps ? { race_laps: raceLaps } : {}), ...opts });

  useEffect(() => {
    if (circuit) sim.mutate({ circuit, ...(raceLaps ? { race_laps: raceLaps } : {}), ...opts });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuit, raceLaps]);

  const res = sim.data;

  return (
    <div className="stack">
      <Panel title="Simulation settings" aside="POST /strategy/simulate">
        <div className="form-grid">
          <Field label="Max stops" hint="1–4">
            <input className="input" type="number" min={1} max={4} value={opts.max_stops}
              onChange={(e) => setOpts({ ...opts, max_stops: Number(e.target.value) })} />
          </Field>
          <Field label="Top K" hint="1–30">
            <input className="input" type="number" min={1} max={30} value={opts.top_k}
              onChange={(e) => setOpts({ ...opts, top_k: Number(e.target.value) })} />
          </Field>
          <Field label="MC scenarios" hint="0 for deterministic only">
            <input className="input" type="number" min={0} max={20000} step={500} value={opts.n_scenarios}
              onChange={(e) => setOpts({ ...opts, n_scenarios: Number(e.target.value) })} />
          </Field>
          <Field label="Degradation source" hint="model under-predicts by ~32%">
            <select className="select" value={opts.degradation_source}
              onChange={(e) => setOpts({ ...opts, degradation_source: e.target.value })}>
              <option value="stage_a">stage_a — measured slopes</option>
              <option value="model">model — Phase 2 pooled</option>
            </select>
          </Field>
          <Field label="Seed" hint="reproducible scenarios">
            <input className="input" type="number" value={opts.seed}
              onChange={(e) => setOpts({ ...opts, seed: Number(e.target.value) })} />
          </Field>
          <Field label="Grouping">
            <select className="select" value={String(opts.per_stop_count)}
              onChange={(e) => setOpts({ ...opts, per_stop_count: e.target.value === 'true' })}>
              <option value="true">Best per stop count</option>
              <option value="false">Flat top-K</option>
            </select>
          </Field>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn btn--primary" onClick={run} disabled={sim.isPending || !circuit}>
            {sim.isPending ? 'Simulating…' : 'Run simulation'}
          </button>
          {res && (
            <span className="muted mono" style={{ fontSize: 11.5 }}>
              {res.n_candidates_evaluated.toLocaleString()} candidates · {res.n_scenarios.toLocaleString()} scenarios
            </span>
          )}
        </div>
      </Panel>

      {sim.isPending && <Loading label="Searching strategies" />}
      {sim.isError && <ErrorState error={sim.error} onRetry={run} />}

      {res && (
        <>
          <Panel title="Ranked strategies" aside={`${res.inputs.circuit} · ${res.inputs.race_laps} laps`}>
            <div className="stack">
              <Legend items={COMPOUNDS.map((c) => ({ label: c, color: compoundColor(c) }))} />
              <div className="grid grid--halves">
                {res.strategies.map((s, i) => (
                  <StrategyCard key={s.label + i} s={s} raceLaps={res.inputs.race_laps} best={i === 0} />
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Deterministic gap" aside="seconds behind the best plan">
            <DeltaChart strategies={res.strategies} />
            <Note>
              Read <strong>win rate vs best</strong> and <strong>margin SD</strong> over the raw MC
              spread: a single strategy&apos;s SD is dominated by the safety-car penalty every
              strategy pays equally.
            </Note>
          </Panel>

          <Panel title="Limitations" aside="stated by the model">
            <div className="stack" style={{ gap: 8 }}>
              {res.limitations.map((l) => (
                <Note warn key={l}>{l}</Note>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Legal defaults built from the circuit's own measured inputs: the stints sum
 * to the race distance, use at least two compounds, and respect each
 * compound's observed maximum. Guessing fixed lap counts gets rejected.
 */
function defaultStrategies(inputs) {
  if (!inputs) return null;
  const laps = inputs.race_laps;
  const cap = (c, n) => Math.min(n, inputs.max_stint_laps?.[c] ?? n);

  const oneStopFirst = cap('MEDIUM', Math.ceil(laps / 2));
  const oneStop = [
    { compound: 'MEDIUM', laps: oneStopFirst },
    { compound: 'HARD', laps: laps - oneStopFirst },
  ];

  const a = cap('SOFT', Math.round(laps / 3));
  const b = cap('MEDIUM', Math.round((laps - a) / 2));
  const twoStop = [
    { compound: 'SOFT', laps: a },
    { compound: 'MEDIUM', laps: b },
    { compound: 'HARD', laps: laps - a - b },
  ];

  return [oneStop, twoStop];
}

/** The same rules the API enforces, checked before a request is sent. */
function validateStrategy(stints, inputs) {
  const reasons = [];
  const total = stints.reduce((a, x) => a + x.laps, 0);
  if (inputs && total !== inputs.race_laps) {
    reasons.push(`${total} laps, but the race is ${inputs.race_laps}`);
  }
  if (new Set(stints.map((s) => s.compound)).size < 2) {
    reasons.push('only one compound — a dry race requires two');
  }
  stints.forEach((s, i) => {
    const max = inputs?.max_stint_laps?.[s.compound];
    if (max && s.laps > max) {
      reasons.push(`stint ${i + 1}: ${s.laps} laps on ${s.compound} exceeds the ${max}-lap maximum observed here`);
    }
  });
  return reasons;
}

function Comparator({ circuit, raceLaps, inputs }) {
  const [strategies, setStrategies] = useState(null);
  const [scenarios, setScenarios] = useState(2000);
  const cmp = useCompare();

  // Seed from the circuit once its inputs land, and re-seed when the circuit changes.
  useEffect(() => {
    const seeded = defaultStrategies(inputs);
    if (seeded) setStrategies(seeded);
  }, [inputs]);

  const list = strategies ?? [];

  const update = (si, sti, patch) =>
    setStrategies((all) =>
      all.map((s, i) => (i === si ? s.map((st, j) => (j === sti ? { ...st, ...patch } : st)) : s)),
    );

  const addStint = (si) =>
    setStrategies((all) => all.map((s, i) => (i === si ? [...s, { compound: 'HARD', laps: 10 }] : s)));

  const removeStint = (si, sti) =>
    setStrategies((all) => all.map((s, i) => (i === si ? s.filter((_, j) => j !== sti) : s)));

  const addStrategy = () =>
    setStrategies((all) =>
      all.length < 6 ? [...all, all[0].map((s) => ({ ...s }))] : all,
    );

  const removeStrategy = (si) =>
    setStrategies((all) => (all.length > 2 ? all.filter((_, i) => i !== si) : all));

  const problems = list.map((s) => validateStrategy(s, inputs));
  const legal = problems.filter((p) => !p.length).length;
  const canRun = !!circuit && list.length >= 2 && legal >= 2;

  const run = () =>
    cmp.mutate({
      circuit,
      ...(raceLaps ? { race_laps: raceLaps } : {}),
      strategies: list,
      n_scenarios: scenarios,
    });

  const res = cmp.data;
  const target = raceLaps ?? inputs?.race_laps ?? res?.inputs?.race_laps;
  const rejected = cmp.error?.detail?.invalid ?? res?.invalid ?? null;

  if (!list.length) return <Loading label="Loading circuit inputs" />;

  return (
    <div className="stack">
      <Panel title="Strategies to compare" aside="POST /strategy/compare">
        <div className="stack">
          {list.map((s, si) => {
            const total = s.reduce((a, x) => a + x.laps, 0);
            const issues = problems[si];
            return (
              <div className={`strat ${issues.length ? '' : 'strat--best'}`} key={si}>
                <div className="strat__head">
                  <span className="strat__label">Strategy {si + 1}</span>
                  <span className={`chip ${issues.length ? 'chip--accent' : 'chip--good'}`}>
                    {total} laps{target ? ` / ${target}` : ''}
                  </span>
                  <span className="chip">{s.length - 1} stop{s.length === 2 ? '' : 's'}</span>
                  <button
                    className="btn btn--sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => removeStrategy(si)}
                    disabled={list.length <= 2}
                  >
                    Remove
                  </button>
                </div>

                <StintTrack stints={s} raceLaps={target} />

                <div className="stack" style={{ gap: 8, marginTop: 10 }}>
                  {s.map((st, sti) => (
                    <div className="row" key={sti} style={{ gap: 8 }}>
                      <select
                        className="select"
                        value={st.compound}
                        onChange={(e) => update(si, sti, { compound: e.target.value })}
                        style={{ width: 120 }}
                        aria-label={`Stint ${sti + 1} compound`}
                      >
                        {COMPOUNDS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={100}
                        value={st.laps}
                        onChange={(e) => update(si, sti, { laps: Number(e.target.value) })}
                        style={{ width: 90 }}
                        aria-label={`Stint ${sti + 1} laps`}
                      />
                      <span className="muted" style={{ fontSize: 11.5 }}>
                        laps{inputs?.max_stint_laps?.[st.compound] ? ` · max ${inputs.max_stint_laps[st.compound]}` : ''}
                      </span>
                      <button
                        className="btn btn--sm"
                        onClick={() => removeStint(si, sti)}
                        disabled={s.length <= 2}
                        aria-label="Remove stint"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button className="btn btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => addStint(si)}>
                    + Stint
                  </button>
                </div>

                {issues.length > 0 && (
                  <div className="stack" style={{ gap: 6, marginTop: 10 }}>
                    {issues.map((r) => (
                      <Note warn key={r}>{r}</Note>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="row">
            <button className="btn btn--sm" onClick={addStrategy} disabled={list.length >= 6}>
              + Strategy
            </button>
            <button
              className="btn btn--sm"
              onClick={() => setStrategies(defaultStrategies(inputs))}
              disabled={!inputs}
            >
              Reset
            </button>
            <label className="row" style={{ gap: 8, marginLeft: 'auto' }}>
              <span className="field__label">Scenarios</span>
              <input
                className="input"
                type="number"
                min={1}
                max={20000}
                step={500}
                value={scenarios}
                onChange={(e) => setScenarios(Number(e.target.value))}
                style={{ width: 110 }}
              />
            </label>
            <button className="btn btn--primary" onClick={run} disabled={cmp.isPending || !canRun}>
              {cmp.isPending ? 'Comparing…' : 'Compare'}
            </button>
          </div>

          {!canRun && (
            <Note warn>
              Two legal strategies are needed. Illegal ones are rejected with a reason rather than
              quietly adjusted — the stints must sum to the race distance, use at least two
              compounds, and stay inside each compound&apos;s observed maximum.
            </Note>
          )}
        </div>
      </Panel>

      {cmp.isPending && <Loading label="Running paired scenarios" />}
      {cmp.isError && !rejected && <ErrorState error={cmp.error} onRetry={run} />}

      {rejected && Object.keys(rejected).length > 0 && (
        <Panel title="Rejected by the API" accent>
          <div className="stack" style={{ gap: 8 }}>
            {Object.entries(rejected).map(([idx, reasons]) => (
              <Note warn key={idx}>
                <strong>Strategy {Number(idx) + 1}:</strong> {reasons.join(' · ')}
              </Note>
            ))}
          </div>
        </Panel>
      )}

      {res && (
        <>
          <Panel title="Head to head" aside={`${res.n_scenarios.toLocaleString()} shared scenarios`}>
            <Legend items={COMPOUNDS.map((c) => ({ label: c, color: compoundColor(c) }))} />
            <div className="grid grid--halves" style={{ marginTop: 10 }}>
              {res.strategies.map((s, i) => (
                <StrategyCard key={i} s={s} raceLaps={res.inputs.race_laps} best={i === 0} />
              ))}
            </div>
          </Panel>

          <Panel flush title="Win matrix" aside="P(row beats column), paired">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th />
                    {res.strategies.map((s, i) => (
                      <th key={i} className="num">{s.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {res.win_matrix.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {res.strategies[i]?.label}
                      </td>
                      {row.map((v, j) => (
                        <td
                          key={j}
                          className="num"
                          style={{
                            background:
                              i === j
                                ? 'transparent'
                                : `rgba(54, 168, 109, ${Math.max(0, (v - 0.5) * 1.3).toFixed(2)})`,
                            color: i === j ? 'var(--ink-faint)' : 'var(--ink)',
                            fontWeight: v > 0.5 ? 700 : 400,
                          }}
                        >
                          {i === j ? '—' : pct(v, 0)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel__body">
              <Note>
                Every strategy ran on the same random scenarios, so each cell is a paired
                comparison rather than two independent averages.
              </Note>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function Strategy() {
  const { circuits, isLoading } = useCircuits();
  const [circuit, setCircuit] = useState('');
  const [raceLaps, setRaceLaps] = useState('');
  const [tab, setTab] = useState('simulate');

  useEffect(() => {
    if (!circuit && circuits.length) {
      setCircuit(circuits.find((c) => c.name === 'Sakhir')?.name ?? circuits[0].name);
    }
  }, [circuits, circuit]);

  const inputsQ = useCircuitInputs(circuit, raceLaps ? Number(raceLaps) : undefined);

  return (
    <div className="stack stack--lg">
      <SectionHead
        title="Pit Strategy"
        sub="An exhaustive search over legal strategies, then thousands of races with random safety cars and pit fumbles."
      >
        <label className="row" style={{ gap: 8 }}>
          <span className="field__label">Circuit</span>
          <select className="select" value={circuit} onChange={(e) => setCircuit(e.target.value)} disabled={isLoading}>
            {circuits.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}{c.country ? ` — ${c.country}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="row" style={{ gap: 8 }}>
          <span className="field__label">Laps</span>
          <input
            className="input"
            type="number"
            min={20}
            max={100}
            placeholder="auto"
            value={raceLaps}
            onChange={(e) => setRaceLaps(e.target.value)}
            style={{ width: 86 }}
          />
        </label>
      </SectionHead>

      <Panel title="Measured inputs" aside={`GET /strategy/inputs/${circuit || '…'}`}>
        {inputsQ.isLoading ? (
          <Loading label="Measuring circuit" />
        ) : inputsQ.isError ? (
          <ErrorState error={inputsQ.error} onRetry={inputsQ.refetch} />
        ) : inputsQ.data ? (
          <InputsPanel inputs={inputsQ.data} />
        ) : null}
      </Panel>

      <Panel flush>
        <div style={{ padding: '0 8px' }}>
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'simulate', label: 'Rank strategies' },
              { value: 'compare', label: 'Compare mine' },
            ]}
          />
        </div>
        <div className="panel__body">
          {tab === 'simulate' ? (
            <Simulator circuit={circuit} raceLaps={raceLaps ? Number(raceLaps) : undefined} />
          ) : (
            <Comparator
              circuit={circuit}
              raceLaps={raceLaps ? Number(raceLaps) : undefined}
              inputs={inputsQ.data}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}
