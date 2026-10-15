const EMPTY = '—';

export function num(v, digits = 0) {
  if (v === null || v === undefined || Number.isNaN(v)) return EMPTY;
  return Number(v).toFixed(digits);
}

export function signed(v, digits = 2, unit = '') {
  if (v === null || v === undefined || Number.isNaN(v)) return EMPTY;
  const n = Number(v);
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}${unit}`;
}

export function pct(v, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return EMPTY;
  return `${(Number(v) * 100).toFixed(digits)}%`;
}

/** Seconds to m:ss.mmm — the way a lap time is read. */
export function lapTime(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return EMPTY;
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return m > 0 ? `${m}:${s.toFixed(3).padStart(6, '0')}` : s.toFixed(3);
}

/** Seconds to h:mm:ss — a race total. */
export function raceTime(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return EMPTY;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function date(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return EMPTY;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? EMPTY : d.toLocaleDateString('en-GB', opts);
}

export function dateShort(iso) {
  return date(iso, { day: 'numeric', month: 'short' });
}

export function ordinal(n) {
  if (n === null || n === undefined) return EMPTY;
  const i = Math.round(n);
  const s = ['th', 'st', 'nd', 'rd'];
  const v = i % 100;
  return i + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const SESSION_NAMES = {
  FP1: 'Practice 1',
  FP2: 'Practice 2',
  FP3: 'Practice 3',
  Q: 'Qualifying',
  S: 'Sprint',
  SQ: 'Sprint Qualifying',
  R: 'Race',
};

export function statusTone(status) {
  if (!status) return 'muted';
  if (status === 'Finished' || status === 'Lapped' || status.startsWith('+')) return 'muted';
  return 'pos-bad';
}
