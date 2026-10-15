import { Link, useSearchParams } from 'react-router-dom';
import { useSeasons, useEvents } from '../api/hooks';
import { SectionHead, Async, Note } from '../components/Primitives';
import { date } from '../lib/format';

export default function Races() {
  const [params, setParams] = useSearchParams();
  const { data: seasons } = useSeasons();
  const yearParam = params.get('year');
  const year = yearParam ? Number(yearParam) : (seasons?.[0]?.year ?? null);
  const q = useEvents(year);

  return (
    <div className="stack stack--lg">
      <SectionHead
        title={`${year ?? ''} Calendar`}
        sub="Every round with ingested data. Open one for the result, stint chart and prediction check."
      >
        <label className="row" style={{ gap: 8 }}>
          <span className="field__label">Season</span>
          <select
            className="select"
            value={year ?? ''}
            onChange={(e) => setParams({ year: e.target.value }, { replace: true })}
          >
            {(seasons ?? []).map((s) => (
              <option key={s.year} value={s.year}>
                {s.year}
              </option>
            ))}
          </select>
        </label>
      </SectionHead>

      <Async query={q} label="Loading calendar" empty="No events ingested for this season.">
        {(events) => (
          <div className="stack">
            <div className="grid grid--cards">
              {events.map((e) => (
                <Link key={e.id} to={`/race/${e.id}`} className="race-card">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="race-card__round">Round {String(e.round).padStart(2, '0')}</span>
                    <span className="race-card__round">{e.circuit?.country}</span>
                  </div>
                  <div className="race-card__name">{e.event_name}</div>
                  <div className="race-card__meta">
                    {e.circuit?.name} · {date(e.event_date)}
                  </div>
                  {e.event_format && e.event_format !== 'conventional' && (
                    <div style={{ marginTop: 8 }}>
                      <span className="chip chip--accent">{e.event_format.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
            <Note>
              A missing session type on a race page means it was not ingested, not that it was not
              held — practice is often skipped at ingest time.
            </Note>
          </div>
        )}
      </Async>
    </div>
  );
}
