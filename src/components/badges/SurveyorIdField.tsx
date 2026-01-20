import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  IdCard, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Loader2, 
  ClipboardList,
  MapPin,
  FileText,
  Calendar
} from 'lucide-react';
import { SurveyorBadge, useSurveyorBadges } from '@/hooks/useSurveyorBadges';
import { BadgeCard } from './BadgeCard';
import { supabase } from '@/integrations/supabase/client';

interface SurveyorIdFieldProps {
  value: string;
  onChange: (value: string, badge?: SurveyorBadge) => void;
  onBadgeValidated?: (badge: SurveyorBadge) => void;
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

export function SurveyorIdField({ value, onChange, onBadgeValidated }: SurveyorIdFieldProps) {
  const { validateBadge } = useSurveyorBadges();
  const [searchValue, setSearchValue] = useState(value);
  const [validatedBadge, setValidatedBadge] = useState<SurveyorBadge | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showBadgeDetails, setShowBadgeDetails] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionBadge[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [surveyorStats, setSurveyorStats] = useState<{ 
    formsCount: number; 
    lastSubmission: string | null;
    todayCount: number;
    lastLocation: { lat: number; lng: number } | null;
  }>({
    formsCount: 0,
    lastSubmission: null,
    todayCount: 0,
    lastLocation: null
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (validatedBadge) {
      fetchSurveyorStats(validatedBadge.id);
      subscribeToRealtimeUpdates(validatedBadge.id);
    }
    
    return () => {
      // Cleanup subscriptions
    };
  }, [validatedBadge]);

  // Auto-search as user types
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (searchValue.length >= 2 && !validatedBadge) {
        searchSuggestions(searchValue);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchValue, validatedBadge]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
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

  const subscribeToRealtimeUpdates = (badgeId: string) => {
    const channel = supabase
      .channel(`surveyor-stats-${badgeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'survey_responses',
          filter: `badge_id=eq.${badgeId}`,
        },
        () => {
          // Refresh stats when new response is submitted
          fetchSurveyorStats(badgeId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchSurveyorStats = async (badgeId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: responses, error } = await supabase
        .from('survey_responses')
        .select('created_at, location')
        .eq('badge_id', badgeId)
        .order('created_at', { ascending: false });

      if (!error && responses) {
        const todayResponses = responses.filter(r => new Date(r.created_at) >= today);
        const lastWithLocation = responses.find(r => r.location);
        
        setSurveyorStats({
          formsCount: responses.length,
          lastSubmission: responses.length > 0 ? responses[0].created_at : null,
          todayCount: todayResponses.length,
          lastLocation: lastWithLocation?.location as { lat: number; lng: number } | null
        });
      }
    } catch (error) {
      console.error('Error fetching surveyor stats:', error);
    }
  };

  const handleSelectSuggestion = async (suggestion: SuggestionBadge) => {
    setShowSuggestions(false);
    setSearchValue(suggestion.surveyor_id);
    setIsSearching(true);

    // Fetch full badge data
    const badge = await validateBadge(suggestion.surveyor_id);
    
    if (badge) {
      setValidatedBadge(badge);
      onChange(badge.surveyor_id, badge);
      onBadgeValidated?.(badge);
    }
    
    setIsSearching(false);
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setSearchError('Veuillez entrer un ID ou un nom');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setValidatedBadge(null);
    setShowSuggestions(false);

    try {
      let badge = await validateBadge(searchValue.trim());
      
      if (!badge) {
        const { data } = await supabase
          .from('surveyor_badges')
          .select('*')
          .or(`first_name.ilike.%${searchValue}%,last_name.ilike.%${searchValue}%`)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

        if (data) {
          badge = data as unknown as SurveyorBadge;
        }
      }

      if (badge) {
        setValidatedBadge(badge);
        onChange(badge.surveyor_id, badge);
        onBadgeValidated?.(badge);
      } else {
        setSearchError('Aucun badge actif trouvé avec cet ID ou nom');
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
    setSurveyorStats({ formsCount: 0, lastSubmission: null, todayCount: 0, lastLocation: null });
    onChange('');
  };

  if (validatedBadge) {
    return (
      <>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-green-200 flex-shrink-0">
                <AvatarImage src={validatedBadge.photo_url || undefined} />
                <AvatarFallback className="bg-green-100 text-green-700 text-sm">
                  {validatedBadge.first_name[0]}{validatedBadge.last_name[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="font-semibold text-green-700 dark:text-green-400 text-sm">
                    Badge validé
                  </span>
                </div>
                <p className="font-medium truncate text-sm sm:text-base">
                  {validatedBadge.first_name} {validatedBadge.last_name}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  ID: {validatedBadge.surveyor_id}
                </p>
                {validatedBadge.role && (
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {validatedBadge.role}
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBadgeDetails(true)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleClear}
                  className="text-destructive h-8 w-8 p-0"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Stats with realtime sync */}
            <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-800 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-green-100/50 dark:bg-green-900/20 rounded-lg">
                <FileText className="w-4 h-4 mx-auto mb-1 text-green-600" />
                <p className="text-lg sm:text-xl font-bold text-green-700 dark:text-green-400">
                  {surveyorStats.formsCount}
                </p>
                <p className="text-[10px] text-muted-foreground">Total fiches</p>
              </div>
              <div className="p-2 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg">
                <Calendar className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <p className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-400">
                  {surveyorStats.todayCount}
                </p>
                <p className="text-[10px] text-muted-foreground">Aujourd'hui</p>
              </div>
              <div className="p-2 bg-violet-100/50 dark:bg-violet-900/20 rounded-lg">
                <MapPin className="w-4 h-4 mx-auto mb-1 text-violet-600" />
                <p className="text-xs font-medium text-violet-700 dark:text-violet-400 truncate">
                  {surveyorStats.lastSubmission 
                    ? new Date(surveyorStats.lastSubmission).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                    : '-'
                  }
                </p>
                <p className="text-[10px] text-muted-foreground">Dernière</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showBadgeDetails} onOpenChange={setShowBadgeDetails}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IdCard className="w-5 h-5" />
                Détails du badge
              </DialogTitle>
            </DialogHeader>
            <BadgeCard badge={validatedBadge} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="space-y-3 relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setSearchError(null);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="Entrez votre ID ou nom..."
            className="pl-10"
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
              className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              {suggestions.map((sug) => (
                <button
                  key={sug.id}
                  type="button"
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                  onClick={() => handleSelectSuggestion(sug)}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={sug.photo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {sug.first_name[0]}{sug.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {sug.first_name} {sug.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      ID: {sug.surveyor_id}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                    {sug.role}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={isSearching}
          className="px-4"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </div>

      {searchError && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs">{searchError}</span>
        </div>
      )}

      <p className="text-[10px] sm:text-xs text-muted-foreground">
        <ClipboardList className="inline w-3 h-3 mr-1" />
        Tapez votre ID ou nom pour voir les suggestions
      </p>
    </div>
  );
}
