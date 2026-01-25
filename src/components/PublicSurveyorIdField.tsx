import { useState, useEffect, useRef } from 'react';
import { IdCard, Search, CheckCircle, XCircle, Loader2, FileText, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SurveyorBadgeInfo {
  id: string;
  surveyor_id: string;
  first_name: string;
  last_name: string;
  role: string;
  photo_url: string | null;
  status: string;
  organization: string | null;
  project: string | null;
  covered_zone: string | null;
}

interface SuggestionBadge {
  id: string;
  surveyor_id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  role: string;
  status: string;
}

interface PublicSurveyorIdFieldProps {
  value: any;
  onChange: (value: any) => void;
  fieldMode?: boolean;
}

export function PublicSurveyorIdField({ value, onChange, fieldMode = false }: PublicSurveyorIdFieldProps) {
  const [searchValue, setSearchValue] = useState<string>(
    typeof value === 'object' ? value?.surveyor_id || '' : value || ''
  );
  const [validatedBadge, setValidatedBadge] = useState<SurveyorBadgeInfo | null>(
    typeof value === 'object' && value?.badge_id ? value : null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionBadge[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [surveyorStats, setSurveyorStats] = useState<{
    formsCount: number;
    todayCount: number;
    lastSubmission: string | null;
  }>({ formsCount: 0, todayCount: 0, lastSubmission: null });

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Restore validated badge from value on mount
  useEffect(() => {
    if (typeof value === 'object' && value?.badge_id && !validatedBadge) {
      // Try to fetch badge info
      fetchBadgeById(value.badge_id);
    }
  }, []);

  const fetchBadgeById = async (badgeId: string) => {
    try {
      const { data } = await supabase
        .from('surveyor_badges')
        .select('id, surveyor_id, first_name, last_name, role, photo_url, status, organization, project, covered_zone')
        .eq('id', badgeId)
        .eq('status', 'active')
        .maybeSingle();

      if (data) {
        setValidatedBadge(data as SurveyorBadgeInfo);
        fetchSurveyorStats(data.id);
      }
    } catch (error) {
      console.error('Error fetching badge:', error);
    }
  };

  // Auto-search as user types
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (searchValue.length >= 2 && !validatedBadge) {
        searchSuggestions(searchValue);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchValue, validatedBadge]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchSuggestions = async (query: string) => {
    try {
      const { data } = await supabase
        .from('surveyor_badges')
        .select('id, surveyor_id, first_name, last_name, photo_url, role, status')
        .eq('status', 'active')
        .or(`surveyor_id.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(5);

      if (data && data.length > 0) {
        setSuggestions(data as SuggestionBadge[]);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error searching suggestions:', error);
    }
  };

  const fetchSurveyorStats = async (badgeId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: responses } = await supabase
        .from('survey_responses')
        .select('created_at')
        .eq('badge_id', badgeId)
        .order('created_at', { ascending: false });

      if (responses) {
        const todayResponses = responses.filter(r => new Date(r.created_at) >= today);
        setSurveyorStats({
          formsCount: responses.length,
          todayCount: todayResponses.length,
          lastSubmission: responses.length > 0 ? responses[0].created_at : null,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSelectSuggestion = async (suggestion: SuggestionBadge) => {
    setShowSuggestions(false);
    setSearchValue(suggestion.surveyor_id);
    setIsSearching(true);
    setSearchError(null);

    try {
      const { data } = await supabase
        .from('surveyor_badges')
        .select('id, surveyor_id, first_name, last_name, role, photo_url, status, organization, project, covered_zone')
        .eq('id', suggestion.id)
        .eq('status', 'active')
        .maybeSingle();

      if (data) {
        const badge = data as SurveyorBadgeInfo;
        setValidatedBadge(badge);
        // Pass complete surveyor data to parent
        onChange({
          surveyor_id: badge.surveyor_id,
          badge_id: badge.id,
          surveyor_name: `${badge.first_name} ${badge.last_name}`,
          surveyor_validated: true,
        });
        fetchSurveyorStats(badge.id);
      }
    } catch (error) {
      console.error('Error validating badge:', error);
      setSearchError('Erreur lors de la validation');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setSearchError('Veuillez entrer un ID ou un nom');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setShowSuggestions(false);

    try {
      // Search by ID first
      let { data } = await supabase
        .from('surveyor_badges')
        .select('id, surveyor_id, first_name, last_name, role, photo_url, status, organization, project, covered_zone')
        .eq('surveyor_id', searchValue.trim())
        .eq('status', 'active')
        .maybeSingle();

      // If not found, search by name
      if (!data) {
        const { data: nameData } = await supabase
          .from('surveyor_badges')
          .select('id, surveyor_id, first_name, last_name, role, photo_url, status, organization, project, covered_zone')
          .or(`first_name.ilike.%${searchValue}%,last_name.ilike.%${searchValue}%`)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();
        data = nameData;
      }

      if (data) {
        const badge = data as SurveyorBadgeInfo;
        setValidatedBadge(badge);
        onChange({
          surveyor_id: badge.surveyor_id,
          badge_id: badge.id,
          surveyor_name: `${badge.first_name} ${badge.last_name}`,
          surveyor_validated: true,
        });
        fetchSurveyorStats(badge.id);
      } else {
        setSearchError('Aucun badge actif trouvé');
      }
    } catch (error) {
      console.error('Error searching badge:', error);
      setSearchError('Erreur lors de la recherche');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchValue('');
    setValidatedBadge(null);
    setSearchError(null);
    setSuggestions([]);
    setSurveyorStats({ formsCount: 0, todayCount: 0, lastSubmission: null });
    onChange('');
  };

  // Validated state - show profile card
  if (validatedBadge) {
    return (
      <div className="space-y-3">
        <div className={cn(
          "rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-900/20 overflow-hidden",
          fieldMode ? "p-4" : "p-3"
        )}>
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={cn(
              "rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-green-300",
              fieldMode ? "w-14 h-14" : "w-12 h-12"
            )}>
              {validatedBadge.photo_url ? (
                <img 
                  src={validatedBadge.photo_url} 
                  alt="Photo" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className={cn(
                  "font-bold text-green-700 dark:text-green-300",
                  fieldMode ? "text-lg" : "text-base"
                )}>
                  {validatedBadge.first_name[0]}{validatedBadge.last_name[0]}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className={cn(
                  "font-semibold text-green-700 dark:text-green-400",
                  fieldMode ? "text-sm" : "text-xs"
                )}>
                  Validé ✓
                </span>
              </div>
              <p className={cn(
                "font-bold text-foreground truncate",
                fieldMode ? "text-lg" : "text-base"
              )}>
                {validatedBadge.first_name} {validatedBadge.last_name}
              </p>
              <p className={cn(
                "text-muted-foreground truncate",
                fieldMode ? "text-sm" : "text-xs"
              )}>
                ID: {validatedBadge.surveyor_id} • {validatedBadge.role}
              </p>
            </div>

            {/* Clear button */}
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0"
            >
              <XCircle className={fieldMode ? "w-5 h-5" : "w-4 h-4"} />
            </button>
          </div>

          {/* Stats */}
          <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-green-100/50 dark:bg-green-800/30 rounded-lg">
              <FileText className="w-3 h-3 mx-auto mb-0.5 text-green-600" />
              <p className={cn("font-bold text-green-700 dark:text-green-400", fieldMode ? "text-lg" : "text-base")}>
                {surveyorStats.formsCount}
              </p>
              <p className="text-[9px] text-muted-foreground">Total</p>
            </div>
            <div className="p-2 bg-blue-100/50 dark:bg-blue-800/30 rounded-lg">
              <Calendar className="w-3 h-3 mx-auto mb-0.5 text-blue-600" />
              <p className={cn("font-bold text-blue-700 dark:text-blue-400", fieldMode ? "text-lg" : "text-base")}>
                {surveyorStats.todayCount}
              </p>
              <p className="text-[9px] text-muted-foreground">Aujourd'hui</p>
            </div>
            <div className="p-2 bg-violet-100/50 dark:bg-violet-800/30 rounded-lg">
              <MapPin className="w-3 h-3 mx-auto mb-0.5 text-violet-600" />
              <p className={cn("font-medium text-violet-700 dark:text-violet-400 truncate", fieldMode ? "text-xs" : "text-[10px]")}>
                {surveyorStats.lastSubmission
                  ? new Date(surveyorStats.lastSubmission).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                  : '-'
                }
              </p>
              <p className="text-[9px] text-muted-foreground">Dernière</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Search state
  return (
    <div className="space-y-3 relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <IdCard className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
            fieldMode ? "w-5 h-5" : "w-4 h-4"
          )} />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setSearchError(null);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="Entrez votre ID ou nom..."
            className={cn(
              "w-full rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors",
              fieldMode ? "pl-12 pr-4 py-4 text-lg" : "pl-10 pr-4 py-3 text-base"
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              {suggestions.map((sug) => (
                <button
                  key={sug.id}
                  type="button"
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0"
                  onClick={() => handleSelectSuggestion(sug)}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {sug.photo_url ? (
                      <img src={sug.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-primary">
                        {sug.first_name[0]}{sug.last_name[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {sug.first_name} {sug.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      ID: {sug.surveyor_id}
                    </p>
                  </div>
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded flex-shrink-0">
                    {sug.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className={cn(
            "rounded-lg bg-primary text-primary-foreground flex items-center justify-center transition-colors hover:bg-primary/90 disabled:opacity-50",
            fieldMode ? "px-5 py-4" : "px-4 py-3"
          )}
        >
          {isSearching ? (
            <Loader2 className={cn("animate-spin", fieldMode ? "w-5 h-5" : "w-4 h-4")} />
          ) : (
            <Search className={fieldMode ? "w-5 h-5" : "w-4 h-4"} />
          )}
        </button>
      </div>

      {searchError && (
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span className={fieldMode ? "text-sm" : "text-xs"}>{searchError}</span>
        </div>
      )}

      <p className={cn("text-muted-foreground", fieldMode ? "text-sm" : "text-xs")}>
        <IdCard className="inline w-3 h-3 mr-1" />
        Tapez votre ID ou nom pour voir les suggestions et sélectionner votre profil
      </p>
    </div>
  );
}
