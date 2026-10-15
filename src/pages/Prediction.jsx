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

import { useCircuits, useDrivers, usePredictFromGrid, useBacktest, useLatestSeason, useSeasonDashboard } from '../api/hooks';
import {
  Panel,
  SectionHead,
  Tile,
  Note,
  Field,
  Tabs,
  Loading,
  ErrorState,
  Async,
  Position,
  DriverCell,
} from '../components/Primitives';
import { AXIS, GRID, axisLabel, Legend, tick1 } from '../components/ChartKit';
import { teamColor, categorical } from '../lib/teams';
import { num, pct } from '../lib/format';

/* ------------------------------------------------------------------ */
/* Grid builder                                                        */
/* ------------------------------------------------------------------ */

function GridBuilder() {
  const { circuits, isLoading: circuitsLoading } = useCircuits();
  const driversQ = useDrivers();
  const { year } = useLatestSeason();
  const seasonQ = useSeasonDashboard(year);

  const [circuit, setCircuit] = useState('');
  const [grid, setGrid] = useState([]);
  const predict = usePredictFromGrid();

  useEffect(() => {
    if (!circuit && circuits.length) {
      setCircuit(circuits.find((c) => c.name === 'Sakhir')?.name ?? circuits[0].name);
    }
  }, [circuits, circuit]);

  // Seed the grid from the latest season's championship order, which is a
  // sensible starting point the user can then edit.
  useEffect(() => {
    if (grid.length || !seasonQ.data?.drivers?.length) return;
    setGrid(
      seasonQ.data.drivers.slice(0, 20).map((d, i) => ({ driver: d.driver, grid_position: i + 1 })),
    );
  }, [seasonQ.data, grid.length]);

  const teamOf = new Map((seasonQ.data?.drivers ?? []).map((d) => [d.driver, d.team]));
  const allDrivers = (driversQ.data ?? []).map((d) => d.abbreviation).sort();

  const setDriver = (i, v) =>
    setGrid((g) => g.map((row, j) => (j === i ? { ...row, driver: v } : row)));

  const move = (i, dir) =>
    setGrid((g) => {
      const j = i + dir;
      if (j < 0 || j >= g.length) return g;
      const copy = [...g];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy.map((row, k) => ({ ...row, grid_position: k + 1 }));
    });

  const removeRow = (i) =>
    setGrid((g) => g.filter((_, j) => j !== i).map((row, k) => ({ ...row, grid_position: k + 1 })));

  const addRow = () =>
    setGrid((g) =>
      g.length >= 24
        ? g
        : [...g, { driver: allDrivers.find((d) => !g.some((r) => r.driver === d)) ?? allDrivers[0], grid_position: g.length + 1 }],
    );

  const run = () => predict.mutate({ circuit, grid });

  const dupes = grid.map((r) => r.driver).filter((d, i, a) => a.indexOf(d) !== i);
  const valid = circuit && grid.length >= 2 && !dupes.length;
  const res = predict.data;

  return (
    <div className="stack">
      <div className="grid grid--split">
        <Panel title="Starting grid" aside={`${grid.length} cars`}>
          <div className="stack" style={{ gap: 10 }}>
            <Field label="Circuit">
              <select className="select" value={circuit} onChange={(e) => setCircuit(e.target.value)} disabled={circuitsLoading}>
                {circuits.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}{c.country ? ` — ${c.country}` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <div className="stack" style={{ gap: 4, maxHeight: 460, overflowY: 'auto' }}>
              {grid.map((row, i) => (
                <div className="row" key={i} style={{ gap: 8, flexWrap: 'nowrap' }}>
                  <Position value={i + 1} />
                  <span className="team-bar" style={{ background: teamColor(teamOf.get(row.driver)) }} />
                  <select
                    className="select"
                    style={{ flex: 1, minWidth: 0 }}
                    value={row.driver}
                    onChange={(e) => setDriver(i, e.target.value)}
                    aria-label={`Driver in P${i + 1}`}
                  >
                    {allDrivers.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <button className="btn btn--sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                  <button className="btn btn--sm" onClick={() => move(i, 1)} disabled={i === grid.length - 1} aria-label="Move down">↓</button>
                  <button className="btn btn--sm" onClick={() => removeRow(i)} aria-label="Remove">×</button>
                </div>
              ))}
            </div>

            {dupes.length > 0 && (
              <Note warn>Duplicate entries: {[...new Set(dupes)].join(', ')}. Each driver may appear once.</Note>
            )}

            <div className="row">
              <button className="btn btn--sm" onClick={addRow} disabled={grid.length >= 24}>+ Car</button>
              <button className="btn btn--primary" style={{ marginLeft: 'auto' }} onClick={run} disabled={!valid || predict.isPending}>
                {predict.isPending ? 'Predicting…' : 'Predict race'}
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Predicted order" aside={res ? `${res.model_algorithm} · ${res.model_version}` : 'awaiting input'}>
          {predict.isPending && <Loading label="Running the model" />}
          {predict.isError && <ErrorState error={predict.error} onRetry={run} />}
          {!res && !predict.isPending && !predict.isError && (
            <div className="state">Set a grid and run the model to see a predicted finishing order.</div>
          )}
          {res && (
            <div className="stack" style={{ gap: 12 }}>
              {res.warnings?.map((w) => <Note warn key={w}>{w}</Note>)}
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 54 }}>Pred</th>
                      <th>Driver</th>
                      <th className="num">Grid</th>
                      <th className="num">Raw</th>
                      <th className="num">P(podium)</th>
                      <th>Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {res.drivers.map((d) => (
                      <tr key={d.driver}>
                        <td><Position value={d.predicted_rank} /></td>
                        <td><DriverCell code={d.driver} team={d.team ?? teamOf.get(d.driver)} /></td>
                        <td className="num muted">{num(d.grid_position)}</td>
                        <td className="num muted">{num(d.predicted_position, 2)}</td>
                        <td className="num">
                          <div className="row" style={{ gap: 7, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                            <div style={{ width: 48, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${d.podium_probability * 100}%`, height: '100%', background: 'var(--accent)' }} />
                            </div>
                            <span className="mono" style={{ minWidth: 44 }}>{pct(d.podium_probability)}</span>
                          </div>
                        </td>
                        <td>
                          {d.missing_features?.length ? (
                            <span className="chip chip--accent" title={d.missing_features.join(', ')}>
                              {d.missing_features.length} missing
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Note>
                Raw is the regression output; the rank column is the order to read. P(podium) comes
                from a separately calibrated classifier — a raw output of 3.4 is not &ldquo;34%&rdquo;.
              </Note>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Backtest                                                            */
/* ------------------------------------------------------------------ */

const METRICS = [
  { key: 'mae_positions', label: 'MAE (positions)', lowerBetter: true, digits: 3 },
  { key: 'spearman', label: 'Spearman ρ', lowerBetter: false, digits: 3 },
  { key: 'top3_hit_rate', label: 'Top-3 hit rate', lowerBetter: false, digits: 3, isPct: true },
  { key: 'top1_hit_rate', label: 'Winner hit rate', lowerBetter: false, digits: 3, isPct: true },
];

function Backtest() {
  const q = useBacktest();

  return (
    <Async query={q} label="Loading backtest">
      {(bt) => {
        const rows = [
          { name: 'Model (walk-forward)', m: bt.walk_forward, highlight: true },
          { name: 'Baseline: grid order', m: bt.baseline_grid },
          { name: 'Baseline: driver form', m: bt.baseline_driver_form },
        ];

        const maeData = [
          { label: 'Model', value: bt.walk_forward.mae_positions },
          { label: 'Grid order', value: bt.baseline_grid.mae_positions },
          { label: 'Driver form', value: bt.baseline_driver_form.mae_positions },
        ];

        const candidates = Object.entries(bt.all_models ?? {}).map(([name, m]) => ({
          label: name,
          value: m.mae_positions,
          active: name === bt.algorithm,
        }));

        return (
          <div className="stack">
            <div className="grid grid--tiles">
              <Tile label="Algorithm" value={bt.algorithm} note={`v${bt.model_version}`} small />
              <Tile
                label="MAE"
                value={num(bt.walk_forward.mae_positions, 3)}
                unit="pos"
                note={`over ${bt.walk_forward.n_races} races`}
              />
              <Tile
                label="vs grid order"
                value={pct(bt.improvement_over_grid_mae, 1)}
                tone="pos-good"
                note="fractional MAE reduction"
              />
              <Tile label="Spearman ρ" value={num(bt.walk_forward.spearman, 3)} note="mean per-race rank corr." />
              <Tile
                label="Podium Brier"
                value={bt.podium_brier != null ? num(bt.podium_brier, 4) : '—'}
                note={bt.podium_brier_base_rate != null ? `base rate ${num(bt.podium_brier_base_rate, 4)}` : null}
              />
              <Tile
                label="Podium skill"
                value={bt.podium_skill != null ? num(bt.podium_skill, 3) : '—'}
                tone={bt.podium_skill > 0 ? 'pos-good' : 'pos-bad'}
                note="positive beats the base rate"
              />
            </div>

            <div className="grid grid--split-even">
              <Panel title="Model vs baselines" aside="MAE in positions · lower is better">
                <Legend
                  items={[
                    { label: 'Model', color: categorical(1) },
                    { label: 'Baseline', color: '#45454f' },
                  ]}
                />
                <div className="chart" style={{ height: 230 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={maeData} margin={{ top: 6, right: 12, bottom: 24, left: 2 }}>
                      <CartesianGrid {...GRID} vertical={false} />
                      <XAxis dataKey="label" {...AXIS} />
                      <YAxis {...AXIS} domain={[0, 'dataMax + 0.5']} width={40} tickFormatter={tick1} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="tooltip">
                              <div className="tooltip__title">{label}</div>
                              <div className="tooltip__row">
                                <span className="tooltip__label">MAE</span>
                                <span className="tooltip__value">{num(payload[0].value, 3)} pos</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="value" name="MAE" barSize={46} radius={[4, 4, 0, 0]}>
                        {maeData.map((d, i) => (
                          <Cell key={d.label} fill={i === 0 ? categorical(1) : '#45454f'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Note>
                  3.14 positions means nothing alone. Predicting the grid order scores{' '}
                  {num(bt.baseline_grid.mae_positions, 2)} — so the model is{' '}
                  {pct(bt.improvement_over_grid_mae, 0)} better. A real but modest gain, which is the
                  honest characterisation of this problem.
                </Note>
              </Panel>

              <Panel title="Candidate algorithms" aside="walk-forward MAE">
                <Legend
                  items={[
                    { label: 'Registered', color: categorical(1) },
                    { label: 'Candidate', color: categorical(3) },
                  ]}
                />
                <div className="chart" style={{ height: 230 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={candidates} layout="vertical" margin={{ top: 6, right: 44, bottom: 22, left: 4 }}>
                      <CartesianGrid {...GRID} horizontal={false} />
                      <XAxis type="number" domain={[0, 'dataMax + 0.3']} {...AXIS} tickFormatter={tick1} label={axisLabel('MAE (POSITIONS)')} />
                      <YAxis type="category" dataKey="label" width={104} {...AXIS} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="tooltip">
                              <div className="tooltip__title">{label}</div>
                              <div className="tooltip__row">
                                <span className="tooltip__label">MAE</span>
                                <span className="tooltip__value">{num(payload[0].value, 3)} pos</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="value" name="MAE" barSize={20} radius={[0, 4, 4, 0]}>
                        {candidates.map((d) => (
                          <Cell key={d.label} fill={d.active ? categorical(1) : categorical(3)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            <Panel flush title="Every metric, beside the baselines">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Predictor</th>
                      {METRICS.map((m) => (
                        <th key={m.key} className="num">{m.label}</th>
                      ))}
                      <th className="num">Races</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.name}>
                        <td style={{ fontWeight: r.highlight ? 700 : 400 }}>
                          {r.highlight && (
                            <span className="chart__swatch" style={{ background: categorical(1), display: 'inline-block', marginRight: 8 }} />
                          )}
                          {r.name}
                        </td>
                        {METRICS.map((m) => {
                          const v = r.m[m.key];
                          const best = rows.reduce(
                            (acc, x) => (m.lowerBetter ? Math.min(acc, x.m[m.key]) : Math.max(acc, x.m[m.key])),
                            m.lowerBetter ? Infinity : -Infinity,
                          );
                          return (
                            <td key={m.key} className={`num ${v === best ? 'pos-good' : ''}`}>
                              {m.isPct ? pct(v, 1) : num(v, m.digits)}
                            </td>
                          );
                        })}
                        <td className="num muted">{r.m.n_races}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {bt.notes?.length > 0 && (
              <div className="stack" style={{ gap: 8 }}>
                {bt.notes.map((n) => <Note key={n}>{n}</Note>)}
              </div>
            )}

            <Note>
              Trained on {bt.train_season_min}–{bt.train_season_max} over{' '}
              {bt.n_train_rows?.toLocaleString()} rows. These walk-forward numbers are the honest
              ones — the per-race prediction pages are in-sample and say so.
            </Note>
          </div>
        );
      }}
    </Async>
  );
}

/* ------------------------------------------------------------------ */

export default function Prediction() {
  const [tab, setTab] = useState('grid');

  return (
    <div className="stack stack--lg">
      <SectionHead
        title="Race Prediction"
        sub="Finishing order from a grid you supply, with a separately calibrated podium probability."
      />

      <Panel flush>
        <div style={{ padding: '0 8px' }}>
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'grid', label: 'Predict a grid' },
              { value: 'backtest', label: 'Backtest' },
            ]}
          />
        </div>
        <div className="panel__body">{tab === 'grid' ? <GridBuilder /> : <Backtest />}</div>
      </Panel>
    </div>
  );
}
