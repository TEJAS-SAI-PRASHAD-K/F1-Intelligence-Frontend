import { Link } from 'react-router-dom';
import { useMemo } from 'react';
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

import {
  useLatestSeason,
  useSeasonDashboard,
  useEvents,
  useRaceDashboard,
  useBacktest,
} from '../api/hooks';
import { Panel, Tile, SectionHead, Async, Loading, ErrorState, Position, DriverCell, Chip, Note } from '../components/Primitives';
import { AXIS, GRID, ChartTooltip } from '../components/ChartKit';
import { teamColor } from '../lib/teams';
import { num, date, dateShort, pct } from '../lib/format';

// Read once at load: "upcoming" is relative to when the app opened, which keeps
// the render pure and is accurate enough for a calendar measured in weeks.
const LOADED_AT = Date.now();

function Hero({ year, season }) {
  const leader = season?.drivers?.[0];
  const topTeam = season?.teams?.[0];

  return (
    <div className="hero">
      <div className="hero__grid" aria-hidden />
      <div className="hero__inner">
        <div style={{ minWidth: 0 }}>
          <div className="hero__eyebrow">
            <span className="dot dot--live" aria-hidden />
            {year} season · {season?.races ?? '—'} races ingested
          </div>
          <h1 className="hero__title">
            {leader ? leader.full_name ?? leader.driver : 'F1 Intelligence'}
          </h1>
          <p className="hero__sub">
            {leader ? (
              <>
                Leads the {year} drivers&apos; championship on{' '}
                <strong style={{ color: 'var(--ink)' }}>{num(leader.points)} points</strong> from{' '}
                {leader.wins} wins and {leader.podiums} podiums for {leader.team}.
              </>
            ) : (
              'Race prediction, tire degradation modelling and pit strategy simulation, built on FastF1 timing data.'
            )}
          </p>
        </div>

        <div className="hero__stats">
          <div>
            <div className="hero__stat-label">Leader pts</div>
            <div className="hero__stat-value">{num(leader?.points)}</div>
          </div>
          <div>
            <div className="hero__stat-label">Margin</div>
            <div className="hero__stat-value">
              {season?.drivers?.[1] ? `+${num(leader.points - season.drivers[1].points)}` : '—'}
            </div>
          </div>
          <div>
            <div className="hero__stat-label">Constructor</div>
            <div className="hero__stat-value" style={{ color: teamColor(topTeam?.team) }}>
              {num(topTeam?.points)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChampionshipRail({ drivers }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      {drivers.slice(0, 5).map((d, i) => (
        <Link
          key={d.driver}
          to={`/driver/${d.driver}`}
          className="leader"
          style={{ '--team': teamColor(d.team) }}
        >
          <span className="leader__rank">{i + 1}</span>
          <div style={{ minWidth: 0 }}>
            <div className="leader__code">{d.driver}</div>
            <div className="leader__meta">
              {d.full_name} · {d.team}
            </div>
          </div>
          <div className="leader__pts">
            <div className="leader__pts-value">{num(d.points)}</div>
            <div className="leader__meta">
              {d.wins}W · {d.podiums}P
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ConstructorChart({ teams }) {
  const data = useMemo(
    () => teams.map((t) => ({ team: t.team, points: t.points, wins: t.wins })).slice(0, 10),
    [teams],
  );

  return (
    <>
      <div className="chart" style={{ height: Math.max(220, data.length * 32) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 4 }}>
            <CartesianGrid {...GRID} horizontal={false} />
            <XAxis type="number" {...AXIS} />
            <YAxis
              type="category"
              dataKey="team"
              width={108}
              {...AXIS}
              tick={{ ...AXIS.tick, fontSize: 10.5 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={(p) => (
                <ChartTooltip
                  {...p}
                  sort={false}
                  format={(v) => `${num(v)} pts`}
                  title={(l) => l}
                />
              )}
            />
            <Bar dataKey="points" name="Points" radius={[0, 4, 4, 0]} barSize={16}>
              {data.map((d) => (
                <Cell key={d.team} fill={teamColor(d.team)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="muted" style={{ fontSize: 11.5, margin: '4px 0 0' }}>
        Bars are coloured by constructor livery; the team name is on the axis, so identity never
        rests on colour alone.
      </p>
    </>
  );
}

function LatestRace({ event }) {
  const q = useRaceDashboard(event?.id);

  if (!event) return null;
  if (q.isLoading) return <Loading label="Loading result" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;

  const race = q.data;
  const top10 = (race.results ?? []).slice(0, 10);

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 8 }}>
        <Chip tone="accent">Round {race.round}</Chip>
        <Chip>{race.circuit}</Chip>
        <Chip>{date(race.event_date)}</Chip>
        {race.total_laps && <Chip>{race.total_laps} laps</Chip>}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 54 }}>Pos</th>
              <th>Driver</th>
              <th>Team</th>
              <th className="num">Grid</th>
              <th className="num">+/−</th>
              <th className="num">Pts</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((r) => (
              <tr key={r.driver}>
                <td><Position value={r.position} /></td>
                <td><DriverCell code={r.driver} team={r.team} /></td>
                <td className="secondary">{r.team}</td>
                <td className="num muted">{num(r.grid_position)}</td>
                <td
                  className={`num ${r.places_gained > 0 ? 'pos-good' : r.places_gained < 0 ? 'pos-bad' : 'muted'}`}
                >
                  {r.places_gained === 0 || r.places_gained == null
                    ? '—'
                    : `${r.places_gained > 0 ? '+' : ''}${num(r.places_gained)}`}
                </td>
                <td className="num">{r.points ? num(r.points) : <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link to={`/race/${race.event_id}`} className="btn btn--sm" style={{ alignSelf: 'flex-start' }}>
        Full race analysis →
      </Link>
    </div>
  );
}

function UpcomingPanel({ events, year }) {
  const next = useMemo(
    () => events.find((e) => e.event_date && new Date(e.event_date).getTime() > LOADED_AT),
    [events],
  );

  if (next) {
    return (
      <div className="stack" style={{ gap: 10 }}>
        <div className="race-card__round">Round {next.round}</div>
        <h3 style={{ fontSize: 20 }}>{next.event_name}</h3>
        <div className="race-card__meta">
          {next.circuit?.name} · {next.circuit?.country} · {date(next.event_date)}
        </div>
        <Link to="/prediction" className="btn btn--primary btn--sm" style={{ alignSelf: 'flex-start' }}>
          Predict this grid →
        </Link>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <Note>
        The {year} calendar is complete in the ingested data — there is no upcoming round to show.
        The prediction model still runs against any grid you supply.
      </Note>
      <div className="stack" style={{ gap: 8 }}>
        {events.slice(-3).map((e) => (
          <Link key={e.id} to={`/race/${e.id}`} className="race-card">
            <div className="race-card__round">Round {e.round}</div>
            <div className="race-card__name">{e.event_name}</div>
            <div className="race-card__meta">
              {e.circuit?.name} · {dateShort(e.event_date)}
            </div>
          </Link>
        ))}
      </div>
      <Link to="/prediction" className="btn btn--primary btn--sm" style={{ alignSelf: 'flex-start' }}>
        Build a grid and predict →
      </Link>
    </div>
  );
}

function Capability({ to, eyebrow, title, body, stat }) {
  return (
    <Link to={to} className="panel" style={{ textDecoration: 'none' }}>
      <div className="panel__head">
        <span className="panel__eyebrow">{eyebrow}</span>
        <span className="panel__aside">→</span>
      </div>
      <div className="panel__body stack" style={{ gap: 8 }}>
        <h3 style={{ fontSize: 16 }}>{title}</h3>
        <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>{body}</p>
        {stat && (
          <div className="mono" style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 2 }}>
            {stat}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function Home() {
  const { year, isLoading: seasonsLoading, isError: seasonsError, error, refetch } = useLatestSeason();
  const seasonQ = useSeasonDashboard(year);
  const eventsQ = useEvents(year);
  const backtestQ = useBacktest();

  if (seasonsLoading) return <Loading label="Connecting to the API" />;
  if (seasonsError) return <ErrorState error={error} onRetry={refetch} />;

  const season = seasonQ.data;
  const events = eventsQ.data ?? [];
  const latestEvent = events.length ? events[events.length - 1] : null;
  const bt = backtestQ.data;

  return (
    <div className="stack stack--lg">
      {seasonQ.isLoading ? <Loading label="Loading season" /> : <Hero year={year} season={season} />}

      <div className="grid grid--tiles">
        <Tile label="Season" value={year ?? '—'} note={`${season?.races ?? '—'} races ingested`} />
        <Tile
          label="Drivers classified"
          value={season?.drivers?.length ?? '—'}
          note={`${season?.teams?.length ?? '—'} constructors`}
        />
        <Tile
          label="Prediction MAE"
          value={bt ? num(bt.walk_forward.mae_positions, 2) : '—'}
          unit="pos"
          note={bt ? `${pct(bt.improvement_over_grid_mae)} better than grid order` : 'walk-forward'}
        />
        <Tile
          label="Top-3 hit rate"
          value={bt ? pct(bt.walk_forward.top3_hit_rate, 0) : '—'}
          note={bt ? `over ${bt.walk_forward.n_races} races` : null}
        />
        <Tile
          label="Podium skill"
          value={bt?.podium_skill != null ? num(bt.podium_skill, 3) : '—'}
          note="1 − brier / base rate"
        />
      </div>

      <div className="grid grid--split">
        <Panel eyebrow="Result" title="Latest race" aside={latestEvent?.event_name}>
          {eventsQ.isLoading ? <Loading /> : <LatestRace event={latestEvent} />}
        </Panel>

        <div className="stack">
          <Panel eyebrow="Calendar" title="Next race">
            {eventsQ.isLoading ? (
              <Loading />
            ) : (
              <UpcomingPanel events={events} year={year} />
            )}
          </Panel>

          <Panel
            title="Championship"
            aside={<Link to="/standings" className="secondary">Full table →</Link>}
          >
            <Async query={seasonQ}>{(d) => <ChampionshipRail drivers={d.drivers} />}</Async>
          </Panel>
        </div>
      </div>

      <Panel title="Constructors' championship" aside={`${year} · race points only`}>
        <Async query={seasonQ}>{(d) => <ConstructorChart teams={d.teams} />}</Async>
      </Panel>

      <div>
        <SectionHead
          title="Intelligence"
          sub="Three models, each with its honest numbers on the page."
        />
        <div className="grid grid--cards">
          <Capability
            to="/tire"
            eyebrow="Phase 2"
            title="Tire degradation"
            body="Project lap-time loss as a set ages, and compare it against what the stints in a real race actually did."
            stat="XGBoost · 0.49s MAE on holdout"
          />
          <Capability
            to="/strategy"
            eyebrow="Phase 3"
            title="Pit strategy"
            body="Exhaustive search over legal strategies, then thousands of Monte Carlo races with random safety cars and pit fumbles."
            stat="Paired win rates · per stop count"
          />
          <Capability
            to="/prediction"
            eyebrow="Phase 4"
            title="Race prediction"
            body="Finishing order from a grid you supply, with a separately calibrated podium probability."
            stat={bt ? `${num(bt.walk_forward.mae_positions, 2)} pos MAE walk-forward` : null}
          />
          <Capability
            to="/models"
            eyebrow="Registry"
            title="Model provenance"
            body="What is deployed, what it was trained on, and how it scored — in each model's own units."
            stat="Every active version"
          />
        </div>
      </div>

      {season?.notes?.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          {season.notes.map((n) => (
            <Note key={n}>{n}</Note>
          ))}
        </div>
      )}
    </div>
  );
}
