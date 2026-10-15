import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="state" style={{ padding: '96px 20px' }}>
      <span className="mono" style={{ fontSize: 48, fontWeight: 800, color: 'var(--ink-faint)' }}>
        404
      </span>
      <p style={{ margin: 0 }}>No route here.</p>
      <Link to="/" className="btn btn--primary btn--sm" style={{ marginTop: 10 }}>
        Back to overview
      </Link>
    </div>
  );
}
