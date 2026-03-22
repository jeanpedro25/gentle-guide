export interface StoredLeagueOption {
  id: string;
  nome: string;
  apiId?: number;
  aliases?: string[];
}

export interface LeagueFilterStorage {
  selectedLeagueIds: string[];
  leagues: StoredLeagueOption[];
}

export const LEAGUE_FILTER_STORAGE_KEY = "profetabet:league-filter:v2";
const LEGACY_SELECTED_LEAGUES_KEY = "selectedLeagues";

function isBrowser() {
  return typeof window !== "undefined";
}

export function normalizeLeagueName(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function readRawStorage(): LeagueFilterStorage {
  if (!isBrowser()) return { selectedLeagueIds: [], leagues: [] };

  try {
    const raw = localStorage.getItem(LEAGUE_FILTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LeagueFilterStorage>;
      const selectedLeagueIds = Array.isArray(parsed.selectedLeagueIds)
        ? parsed.selectedLeagueIds.filter((id): id is string => typeof id === "string")
        : [];
      const leagues = Array.isArray(parsed.leagues)
        ? parsed.leagues
            .filter((l): l is StoredLeagueOption => !!l && typeof l.id === "string" && typeof l.nome === "string")
            .map((l) => ({
              id: l.id,
              nome: l.nome,
              apiId: typeof l.apiId === "number" ? l.apiId : undefined,
              aliases: Array.isArray(l.aliases) ? l.aliases.filter((a): a is string => typeof a === "string") : undefined,
            }))
        : [];
      return { selectedLeagueIds, leagues };
    }

    const legacyRaw = localStorage.getItem(LEGACY_SELECTED_LEAGUES_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (Array.isArray(legacy)) {
        const selectedLeagueIds = legacy.filter((id): id is string => typeof id === "string");
        return { selectedLeagueIds, leagues: [] };
      }
    }
  } catch {
    return { selectedLeagueIds: [], leagues: [] };
  }

  return { selectedLeagueIds: [], leagues: [] };
}

export function readSelectedLeagueIdsFromStorage(): string[] {
  return readRawStorage().selectedLeagueIds;
}

export function readStoredLeagueOptions(): StoredLeagueOption[] {
  return readRawStorage().leagues;
}

export function persistLeagueFilterStorage(next: LeagueFilterStorage) {
  if (!isBrowser()) return;
  // Only persist leagues that are actually selected to avoid quota issues
  const selectedSet = new Set(next.selectedLeagueIds);
  const trimmed: LeagueFilterStorage = {
    selectedLeagueIds: next.selectedLeagueIds,
    leagues: next.leagues.filter((l) => selectedSet.has(l.id)),
  };
  try {
    localStorage.setItem(LEAGUE_FILTER_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // QuotaExceededError — clear old data and retry with minimal payload
    try {
      localStorage.removeItem(LEAGUE_FILTER_STORAGE_KEY);
      localStorage.removeItem("selectedLeagues");
      localStorage.setItem(LEAGUE_FILTER_STORAGE_KEY, JSON.stringify({ selectedLeagueIds: next.selectedLeagueIds, leagues: [] }));
    } catch {
      // Storage completely full — silently ignore
    }
  }
}

function leagueMatchesOption(option: StoredLeagueOption, leagueName: string, leagueApiId?: number): boolean {
  if (!leagueName && leagueApiId == null) return false;

  if (typeof option.apiId === "number" && typeof leagueApiId === "number" && option.apiId === leagueApiId) {
    return true;
  }

  const leagueNorm = normalizeLeagueName(leagueName);
  const optionNorm = normalizeLeagueName(option.nome);

  if (leagueNorm && optionNorm) {
    if (leagueNorm === optionNorm) return true;
    if (leagueNorm.includes(optionNorm) || optionNorm.includes(leagueNorm)) return true;
  }

  if (option.aliases?.length) {
    return option.aliases.some((alias) => {
      const aliasNorm = normalizeLeagueName(alias);
      return aliasNorm === leagueNorm || aliasNorm.includes(leagueNorm) || leagueNorm.includes(aliasNorm);
    });
  }

  return false;
}

export function createLeagueMatcher(
  selectedIdsArg?: string[],
  optionsArg?: StoredLeagueOption[],
) {
  const storage = readRawStorage();
  const selectedIds = selectedIdsArg ?? storage.selectedLeagueIds;
  const options = optionsArg ?? storage.leagues;

  const selectedSet = new Set(selectedIds);
  const selectedOptions = options.filter((opt) => selectedSet.has(opt.id));

  return (leagueName: string, leagueApiId?: number) => {
    if (selectedOptions.length === 0) return true;
    return selectedOptions.some((opt) => leagueMatchesOption(opt, leagueName, leagueApiId));
  };
}

export function resolveLeagueOptions(leagues: string[]) {
  return [...new Set(leagues)]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((league) => ({ value: league, label: league }));
}
