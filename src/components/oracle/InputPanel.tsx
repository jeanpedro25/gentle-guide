import { useState, useMemo } from 'react';
import { Search, Calendar, Trophy, Zap } from 'lucide-react';
import { Sport, sportLabels, getLeaguesBySport, getTeamsByLeague, getTeamsBySport, Team } from '@/data/teams';
import { motion } from 'framer-motion';

interface InputPanelProps {
  onAnalyze: (data: { homeTeam: Team; awayTeam: Team; sport: Sport; league: string; date: string }) => void;
  isLoading: boolean;
}

export function InputPanel({ onAnalyze, isLoading }: InputPanelProps) {
  const [sport, setSport] = useState<Sport>('football');
  const [league, setLeague] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [homeSearch, setHomeSearch] = useState('');
  const [awaySearch, setAwaySearch] = useState('');

  const availableLeagues = useMemo(() => getLeaguesBySport(sport), [sport]);
  const availableTeams = useMemo(() => {
    if (league) return getTeamsByLeague(league);
    return getTeamsBySport(sport);
  }, [sport, league]);

  const filteredHomeTeams = useMemo(() =>
    availableTeams.filter(t =>
      t.name.toLowerCase().includes(homeSearch.toLowerCase()) && t.id !== awayTeam
    ), [availableTeams, homeSearch, awayTeam]);

  const filteredAwayTeams = useMemo(() =>
    availableTeams.filter(t =>
      t.name.toLowerCase().includes(awaySearch.toLowerCase()) && t.id !== homeTeam
    ), [availableTeams, awaySearch, homeTeam]);

  const selectedHome = availableTeams.find(t => t.id === homeTeam);
  const selectedAway = availableTeams.find(t => t.id === awayTeam);

  const canAnalyze = homeTeam && awayTeam && homeTeam !== awayTeam;

  const handleAnalyze = () => {
    if (!selectedHome || !selectedAway) return;
    onAnalyze({
      homeTeam: selectedHome,
      awayTeam: selectedAway,
      sport,
      league: league || selectedHome.league,
      date: matchDate || new Date().toISOString(),
    });
  };

  const handleSportChange = (newSport: Sport) => {
    setSport(newSport);
    setLeague('');
    setHomeTeam('');
    setAwayTeam('');
    setHomeSearch('');
    setAwaySearch('');
  };

  return (
    <div className="glass-card p-4 md:p-6 space-y-5">
      <h2 className="font-display text-xl tracking-wider text-foreground flex items-center gap-2">
        <Trophy className="w-5 h-5 text-oracle-draw" />
        CONFIGURAR PARTIDA
      </h2>

      {/* Sport Selector */}
      <div className="space-y-2">
        <label className="text-xs text-oracle-muted font-body uppercase tracking-wider">Esporte</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(sportLabels) as [Sport, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleSportChange(key)}
              className={`px-3 py-2 rounded-lg text-sm font-body transition-all ${
                sport === key
                  ? 'bg-oracle-win text-primary-foreground neon-glow-green'
                  : 'bg-secondary/50 text-oracle-muted hover:text-foreground hover:bg-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* League */}
      <div className="space-y-2">
        <label className="text-xs text-oracle-muted font-body uppercase tracking-wider">🏆 Liga / Campeonato</label>
        <select
          value={league}
          onChange={e => { setLeague(e.target.value); setHomeTeam(''); setAwayTeam(''); }}
          className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Todas as ligas</option>
          {availableLeagues.map(l => (
            <option key={l.id} value={l.id}>{l.country} {l.name}</option>
          ))}
        </select>
      </div>

      {/* Home Team */}
      <TeamSelector
        label="🏟️ TIME DA CASA"
        searchValue={homeSearch}
        onSearchChange={setHomeSearch}
        selectedTeam={selectedHome}
        teams={filteredHomeTeams}
        onSelect={id => { setHomeTeam(id); setHomeSearch(''); }}
        onClear={() => { setHomeTeam(''); setHomeSearch(''); }}
      />

      {/* VS Divider */}
      {selectedHome && selectedAway && (
        <div className="flex items-center justify-center py-1">
          <span className="font-display text-2xl text-oracle-muted">VS</span>
        </div>
      )}

      {/* Away Team */}
      <TeamSelector
        label="🏟️ TIME VISITANTE"
        searchValue={awaySearch}
        onSearchChange={setAwaySearch}
        selectedTeam={selectedAway}
        teams={filteredAwayTeams}
        onSelect={id => { setAwayTeam(id); setAwaySearch(''); }}
        onClear={() => { setAwayTeam(''); setAwaySearch(''); }}
      />

      {/* Date */}
      <div className="space-y-2">
        <label className="text-xs text-oracle-muted font-body uppercase tracking-wider flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Data da Partida
        </label>
        <input
          type="datetime-local"
          value={matchDate}
          onChange={e => setMatchDate(e.target.value)}
          className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Analyze Button */}
      <motion.button
        onClick={handleAnalyze}
        disabled={!canAnalyze || isLoading}
        whileHover={canAnalyze && !isLoading ? { scale: 1.02 } : {}}
        whileTap={canAnalyze && !isLoading ? { scale: 0.98 } : {}}
        className={`w-full py-4 rounded-lg font-display text-xl tracking-widest transition-all ${
          canAnalyze && !isLoading
            ? 'bg-oracle-win text-primary-foreground animate-pulse-neon cursor-pointer'
            : 'bg-secondary text-oracle-muted cursor-not-allowed'
        }`}
      >
        <span className="flex items-center justify-center gap-2">
          <Zap className="w-5 h-5" />
          {isLoading ? 'ORACLE PENSANDO...' : 'ANALISAR PARTIDA'}
        </span>
      </motion.button>
    </div>
  );
}

function TeamSelector({
  label,
  searchValue,
  onSearchChange,
  selectedTeam,
  teams,
  onSelect,
  onClear,
}: {
  label: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  selectedTeam?: Team;
  teams: Team[];
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const [isFocused, setIsFocused] = useState(false);

  if (selectedTeam) {
    return (
      <div className="space-y-2">
        <label className="text-xs text-oracle-muted font-body uppercase tracking-wider">{label}</label>
        <div className="flex items-center justify-between bg-secondary/50 border border-primary/30 rounded-lg px-3 py-2.5">
          <span className="text-sm font-body text-foreground">
            {selectedTeam.emoji} {selectedTeam.name}
          </span>
          <button onClick={onClear} className="text-oracle-muted hover:text-foreground text-xs">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 relative">
      <label className="text-xs text-oracle-muted font-body uppercase tracking-wider">{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-oracle-muted" />
        <input
          type="text"
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Buscar time..."
          className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm font-body text-foreground placeholder:text-oracle-muted focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      {isFocused && teams.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {teams.slice(0, 10).map(t => (
            <button
              key={t.id}
              onMouseDown={() => onSelect(t.id)}
              className="w-full text-left px-3 py-2 text-sm font-body text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-2"
            >
              <span>{t.emoji}</span>
              <span>{t.name}</span>
              <span className="text-oracle-muted text-xs ml-auto">{t.shortName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
