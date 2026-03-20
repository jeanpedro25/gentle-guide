// League filter utilities

export function createLeagueMatcher() {
  return (_name: string) => true;
}

export function readSelectedLeagueIdsFromStorage(): string[] {
  return [];
}

export function resolveLeagueOptions(leagues: string[]) {
  return leagues.map(l => ({ value: l, label: l }));
}
