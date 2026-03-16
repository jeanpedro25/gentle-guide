/**
 * Team logo resolver - generates team badge URLs from multiple free sources
 * Falls back to initials avatar when no logo is found
 */

// Map of known team names to their logo URLs (curated list for EstrelaBet leagues)
const TEAM_LOGO_OVERRIDES: Record<string, string> = {};

/**
 * Generate a team initials avatar as a data URI SVG
 */
function generateInitialsAvatar(teamName: string): string {
  const words = teamName.replace(/FC|SC|CF|AC|RC|CD|SD|SE|EC|CR|CA|CE|AA|AD/gi, '').trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : teamName.slice(0, 2).toUpperCase();

  // Generate a consistent color from team name
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
    <rect width="80" height="80" rx="16" fill="hsl(${hue}, 60%, 25%)"/>
    <text x="40" y="44" text-anchor="middle" dominant-baseline="central" font-family="system-ui, sans-serif" font-weight="700" font-size="28" fill="hsl(${hue}, 70%, 75%)">${initials}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Get the best available logo URL for a team
 * Priority: override > initials avatar
 */
export function getTeamLogo(teamName: string, currentLogo?: string): string {
  // If we already have a real logo URL (not placeholder), use it
  if (currentLogo && currentLogo !== '/placeholder.svg' && !currentLogo.includes('placeholder')) {
    return currentLogo;
  }

  // Check overrides
  const override = TEAM_LOGO_OVERRIDES[teamName.toLowerCase()];
  if (override) return override;

  // Generate initials avatar
  return generateInitialsAvatar(teamName);
}
