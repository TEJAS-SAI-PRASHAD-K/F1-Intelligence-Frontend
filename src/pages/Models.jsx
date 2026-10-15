import { useModels } from '../api/hooks';
import { Panel, SectionHead, Async, Note, Chip } from '../components/Primitives';
import { date } from '../lib/format';

export default function Models() {
  const q = useModels();

  return (
    <div className="stack stack--lg">
      <SectionHead
        title="Model Registry"
        sub="What is deployed, what it was trained on, and how good it was — each metric in its own units."
      />

      <Async query={q} label="Loading registry">
        {(d) => {
          const grouped = d.models.reduce((acc, m) => {
            const family = m.name.split('__')[0];
            (acc[family] ??= []).push(m);
            return acc;
          }, {});

          return (
            <div className="stack stack--lg">
              {Object.entries(grouped).map(([family, models]) => (
                <Panel key={family} title={family.replace(/_/g, ' ')} aside={d.phases?.[family] ?? ''} flush>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Model</th>
                          <th>Backend</th>
                          <th>Version</th>
                          <th>Trained</th>
                          <th className="num">Seasons</th>
                          <th className="num">Rows</th>
                          <th>Headline metric</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {models.map((m) => (
                          <tr key={`${m.name}-${m.version}`}>
                            <td>
                              <div className="driver-cell">
                                <span
                                  className="team-bar"
                                  style={{ background: m.is_active ? 'var(--good)' : 'var(--ink-faint)' }}
                                />
                                <div>
                                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                                  {m.is_active && (
                                    <div className="driver-cell__name" style={{ color: 'var(--good)' }}>
                                      active
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td><Chip>{m.backend}</Chip></td>
                            <td className="mono muted">{m.version}</td>
                            <td className="muted">{date(m.trained_at)}</td>
                            <td className="num muted">
                              {m.train_season_min ?? '—'}–{m.train_season_max ?? '—'}
                            </td>
                            <td className="num muted">{m.n_train_rows?.toLocaleString() ?? '—'}</td>
                            <td className="mono" style={{ fontWeight: 600 }}>
                              {m.headline_metric ?? '—'}
                            </td>
                            <td className="muted" style={{ whiteSpace: 'normal', maxWidth: 280 }}>
                              {m.notes ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              ))}

              <Note>
                Headline metrics are not comparable across families — an MAE in seconds of lap time
                and an MAE in finishing positions are different quantities, so each is rendered in
                its own units rather than normalised onto one scale.
              </Note>
            </div>
          );
        }}
      </Async>
    </div>
  );
}
