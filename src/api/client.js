// Everything goes through the Vite dev proxy, so paths stay relative.
const BASE = import.meta.env.VITE_API_BASE || '';

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new ApiError('Cannot reach the API. Is the backend running on :8000?', 0);
  }

  if (!res.ok) {
    let detail;
    try {
      detail = (await res.json()).detail;
    } catch {
      detail = undefined;
    }
    // The strategy endpoints return a structured detail object carrying the
    // per-strategy reasons; flattening it to "422" would throw away the answer.
    const msg =
      typeof detail === 'string'
        ? detail
        : typeof detail?.detail === 'string'
          ? detail.detail
          : res.status === 404
            ? 'Not found — this may not have been ingested yet.'
            : `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, detail);
  }

  return res.json();
}

const get = (path) => request(path);
const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });

export const api = {
  health: () => get('/health'),

  // catalog
  seasons: () => get('/api/v1/seasons'),
  events: (year) => get(`/api/v1/seasons/${year}/events`),
  sessions: (eventId) => get(`/api/v1/events/${eventId}/sessions`),
  drivers: () => get('/api/v1/drivers'),

  // sessions
  laps: (sessionId, params = {}) =>
    get(`/api/v1/sessions/${sessionId}/laps?${new URLSearchParams(params)}`),
  results: (sessionId) => get(`/api/v1/sessions/${sessionId}/results`),
  stints: (sessionId) => get(`/api/v1/sessions/${sessionId}/stints`),
  pitStops: (sessionId) => get(`/api/v1/sessions/${sessionId}/pit-stops`),

  // tire
  degradation: (body) => post('/api/v1/tire/degradation', body),
  observedStints: (sessionId, minLaps = 5) =>
    get(`/api/v1/tire/stints/${sessionId}?min_laps=${minLaps}`),
  tireModelInfo: () => get('/api/v1/tire/model-info'),

  // strategy
  simulate: (body) => post('/api/v1/strategy/simulate', body),
  compare: (body) => post('/api/v1/strategy/compare', body),
  circuitInputs: (circuit, raceLaps) =>
    get(
      `/api/v1/strategy/inputs/${encodeURIComponent(circuit)}` +
        (raceLaps ? `?race_laps=${raceLaps}` : ''),
    ),

  // prediction
  predictRace: (eventId) => get(`/api/v1/prediction/race/${eventId}`),
  predictFromGrid: (body) => post('/api/v1/prediction/race', body),
  backtest: () => get('/api/v1/prediction/backtest'),

  // dashboard
  seasonDashboard: (year) => get(`/api/v1/dashboard/season/${year}`),
  driverDashboard: (abbr) => get(`/api/v1/dashboard/driver/${abbr}`),
  raceDashboard: (eventId) => get(`/api/v1/dashboard/race/${eventId}`),
  models: () => get('/api/v1/dashboard/models'),
};
