import { useState, useEffect, useCallback } from 'react';
import { getTeamLogo, preloadTeamLogos } from '@/services/teamLogos';

/**
 * Hook that provides team logos with automatic refresh when real logos load.
 * Pass an array of team names and get back resolved logo URLs.
 */
export function useTeamLogos(teamNames: string[]) {
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Initial sync logos (may be fallback)
    const initial: Record<string, string> = {};
    teamNames.forEach(name => {
      initial[name] = getTeamLogo(name);
    });
    setLogos(initial);

    // Preload real logos in background
    preloadTeamLogos(teamNames).then(() => {
      const updated: Record<string, string> = {};
      teamNames.forEach(name => {
        updated[name] = getTeamLogo(name);
      });
      setLogos(updated);
      setLoaded(true);
    });
  }, [teamNames.join(',')]);

  const getLogo = useCallback((name: string) => {
    return logos[name] || getTeamLogo(name);
  }, [logos]);

  return { logos, getLogo, loaded };
}
