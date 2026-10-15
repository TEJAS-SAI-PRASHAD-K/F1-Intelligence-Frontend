// Team colors are *entity* colors: each constructor's own livery hue, so the
// mapping never shifts when a filter changes the set of series on screen.
// Every use is paired with a code or a label — identity is never color-alone.
const TEAM_COLORS = {
  'red bull racing': '#3671C6',
  ferrari: '#E8002D',
  mclaren: '#FF8000',
  mercedes: '#27F4D2',
  'aston martin': '#229971',
  alpine: '#FF87BC',
  'rb': '#6692FF',
  'racing bulls': '#6692FF',
  'visa cash app rb': '#6692FF',
  'alphatauri': '#5E8FAA',
  'scuderia alphatauri': '#5E8FAA',
  williams: '#64C4FF',
  'kick sauber': '#52E252',
  sauber: '#52E252',
  'alfa romeo': '#C92D4B',
  'alfa romeo racing': '#C92D4B',
  haas: '#B6BABD',
  'haas f1 team': '#B6BABD',
  'racing point': '#F596C8',
  renault: '#FFF500',
  'toro rosso': '#469BFF',
};

export function teamColor(team) {
  if (!team) return 'var(--ink-faint)';
  return TEAM_COLORS[team.toLowerCase().trim()] ?? '#8A8A99';
}

const COMPOUND_COLORS = {
  SOFT: '#EE4155',
  MEDIUM: '#D8BA3A',
  HARD: '#D8D8E0',
  INTERMEDIATE: '#36A86D',
  WET: '#4B93E6',
};

export function compoundColor(compound) {
  return COMPOUND_COLORS[(compound ?? '').toUpperCase()] ?? '#6E6E7C';
}

export const COMPOUNDS = ['SOFT', 'MEDIUM', 'HARD'];

/** Fixed categorical ramp — assigned in order, never cycled past slot 5. */
export const CATEGORICAL = ['#EE4155', '#4B93E6', '#BC8A1E', '#9B70DE', '#36A86D'];

export function categorical(i) {
  return CATEGORICAL[i] ?? '#8A8A99';
}
