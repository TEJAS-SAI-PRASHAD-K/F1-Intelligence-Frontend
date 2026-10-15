import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from './client';

const STATIC = { staleTime: 1000 * 60 * 30 };

export const useHealth = () =>
  useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 30000, retry: false });

export const useSeasons = () => useQuery({ queryKey: ['seasons'], queryFn: api.seasons, ...STATIC });

export const useEvents = (year) =>
  useQuery({ queryKey: ['events', year], queryFn: () => api.events(year), enabled: !!year, ...STATIC });

export const useSessions = (eventId) =>
  useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => api.sessions(eventId),
    enabled: !!eventId,
    ...STATIC,
  });

export const useDrivers = () => useQuery({ queryKey: ['drivers'], queryFn: api.drivers, ...STATIC });

export const useSeasonDashboard = (year) =>
  useQuery({
    queryKey: ['season-dashboard', year],
    queryFn: () => api.seasonDashboard(year),
    enabled: !!year,
    ...STATIC,
  });

export const useDriverDashboard = (abbr) =>
  useQuery({
    queryKey: ['driver-dashboard', abbr],
    queryFn: () => api.driverDashboard(abbr),
    enabled: !!abbr,
    ...STATIC,
  });

export const useRaceDashboard = (eventId) =>
  useQuery({
    queryKey: ['race-dashboard', eventId],
    queryFn: () => api.raceDashboard(eventId),
    enabled: !!eventId,
    ...STATIC,
  });

export const useModels = () => useQuery({ queryKey: ['models'], queryFn: api.models, ...STATIC });

export const useBacktest = () =>
  useQuery({ queryKey: ['backtest'], queryFn: api.backtest, ...STATIC });

export const useTireModelInfo = () =>
  useQuery({ queryKey: ['tire-model-info'], queryFn: api.tireModelInfo, ...STATIC });

export const useCircuitInputs = (circuit, raceLaps) =>
  useQuery({
    queryKey: ['circuit-inputs', circuit, raceLaps ?? null],
    queryFn: () => api.circuitInputs(circuit, raceLaps),
    enabled: !!circuit,
    ...STATIC,
  });

export const useObservedStints = (sessionId, minLaps) =>
  useQuery({
    queryKey: ['observed-stints', sessionId, minLaps],
    queryFn: () => api.observedStints(sessionId, minLaps),
    enabled: !!sessionId,
    ...STATIC,
  });

export const useSessionResults = (sessionId) =>
  useQuery({
    queryKey: ['results', sessionId],
    queryFn: () => api.results(sessionId),
    enabled: !!sessionId,
    ...STATIC,
  });

export const useLaps = (sessionId, params) =>
  useQuery({
    queryKey: ['laps', sessionId, params],
    queryFn: () => api.laps(sessionId, params),
    enabled: !!sessionId,
    ...STATIC,
  });

export const usePitStops = (sessionId) =>
  useQuery({
    queryKey: ['pit-stops', sessionId],
    queryFn: () => api.pitStops(sessionId),
    enabled: !!sessionId,
    ...STATIC,
  });

export const useDegradation = () => useMutation({ mutationFn: api.degradation });
export const useSimulate = () => useMutation({ mutationFn: api.simulate });
export const useCompare = () => useMutation({ mutationFn: api.compare });
export const usePredictFromGrid = () => useMutation({ mutationFn: api.predictFromGrid });

/** The newest season that has ingested data. */
export function useLatestSeason() {
  const { data, ...rest } = useSeasons();
  return { year: data?.[0]?.year ?? null, seasons: data ?? [], ...rest };
}

/**
 * Circuit names across every ingested season, deduped. The strategy and tire
 * endpoints key on circuit NAME, so this is the list they accept.
 */
export function useCircuits() {
  const seasonsQ = useSeasons();
  const years = (seasonsQ.data ?? []).map((s) => s.year);

  const q = useQuery({
    queryKey: ['circuits', years],
    enabled: years.length > 0,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const all = await Promise.all(years.map((y) => api.events(y)));
      const seen = new Map();
      for (const events of all) {
        for (const e of events) {
          const c = e.circuit;
          if (!c?.name || seen.has(c.name)) continue;
          seen.set(c.name, {
            name: c.name,
            country: c.country,
            locality: c.locality,
            typicalLaps: c.typical_race_laps,
          });
        }
      }
      return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  return { ...q, circuits: q.data ?? [] };
}

/** Every race session, newest first — the picker for session-scoped endpoints. */
export function useRaceSessions(year) {
  const eventsQ = useEvents(year);
  const events = eventsQ.data ?? [];

  const q = useQuery({
    queryKey: ['race-sessions', year, events.length],
    enabled: events.length > 0,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const lists = await Promise.all(events.map((e) => api.sessions(e.id)));
      return events
        .map((e, i) => {
          const race = lists[i].find((s) => s.session_type === 'R');
          return race ? { sessionId: race.id, event: e, totalLaps: race.total_laps } : null;
        })
        .filter(Boolean);
    },
  });

  return { ...q, sessions: q.data ?? [], isLoading: eventsQ.isLoading || q.isLoading };
}
