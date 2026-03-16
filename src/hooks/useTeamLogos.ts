import { useState, useEffect, useSyncExternalStore, useCallback } from 'react';
import { getTeamLogo, subscribeToLogoUpdates } from '@/services/teamLogos';

/**
 * Hook that re-renders when team logos finish loading from API.
 * Use getTeamLogoLive() instead of getTeamLogo() in components.
 */
export function useTeamLogos() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    return subscribeToLogoUpdates(() => setVersion(v => v + 1));
  }, []);

  const getTeamLogoLive = useCallback((teamName: string, currentLogo?: string) => {
    // version is captured to force re-evaluation
    void version;
    return getTeamLogo(teamName, currentLogo);
  }, [version]);

  return { getTeamLogoLive };
}
