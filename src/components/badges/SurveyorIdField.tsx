import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IdCard, Search, CheckCircle, XCircle, Eye, Loader2, ClipboardList } from 'lucide-react';
import { SurveyorBadge, useSurveyorBadges } from '@/hooks/useSurveyorBadges';
import { BadgeCard } from './BadgeCard';
import { supabase } from '@/integrations/supabase/client';

interface SurveyorIdFieldProps {
  value: string;
  onChange: (value: string, badge?: SurveyorBadge) => void;
  onBadgeValidated?: (badge: SurveyorBadge) => void;
}

export function SurveyorIdField({ value, onChange, onBadgeValidated }: SurveyorIdFieldProps) {
  const { validateBadge } = useSurveyorBadges();
  const [searchValue, setSearchValue] = useState(value);
  const [validatedBadge, setValidatedBadge] = useState<SurveyorBadge | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showBadgeDetails, setShowBadgeDetails] = useState(false);
  const [surveyorStats, setSurveyorStats] = useState<{ formsCount: number; lastSubmission: string | null }>({
    formsCount: 0,
    lastSubmission: null
  });

  useEffect(() => {
    if (validatedBadge) {
      fetchSurveyorStats(validatedBadge.id);
    }
  }, [validatedBadge]);

  const fetchSurveyorStats = async (badgeId: string) => {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('created_at')
        .eq('badge_id', badgeId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSurveyorStats({
          formsCount: data.length,
          lastSubmission: data.length > 0 ? data[0].created_at : null
        });
      }
    } catch (error) {
      console.error('Error fetching surveyor stats:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setSearchError('Veuillez entrer un ID ou un nom');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setValidatedBadge(null);

    try {
      // Try to find by surveyor_id first
      let badge = await validateBadge(searchValue.trim());
      
      // If not found, try to search by name
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
    setSurveyorStats({ formsCount: 0, lastSubmission: null });
    onChange('');
  };

  if (validatedBadge) {
    return (
      <>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-green-200">
                <AvatarImage src={validatedBadge.photo_url || undefined} />
                <AvatarFallback className="bg-green-100 text-green-700">
                  {validatedBadge.first_name[0]}{validatedBadge.last_name[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-700 dark:text-green-400">
                    Badge validé
                  </span>
                </div>
                <p className="font-medium truncate">
                  {validatedBadge.first_name} {validatedBadge.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  ID: {validatedBadge.surveyor_id}
                </p>
                {validatedBadge.role && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {validatedBadge.role}
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBadgeDetails(true)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleClear}
                  className="text-destructive"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-800 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {surveyorStats.formsCount}
                </p>
                <p className="text-xs text-muted-foreground">Formulaires soumis</p>
              </div>
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  {surveyorStats.lastSubmission 
                    ? new Date(surveyorStats.lastSubmission).toLocaleDateString('fr-FR')
                    : 'Jamais'
                  }
                </p>
                <p className="text-xs text-muted-foreground">Dernière soumission</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badge Details Dialog */}
        <Dialog open={showBadgeDetails} onOpenChange={setShowBadgeDetails}>
          <DialogContent className="max-w-md">
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
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setSearchError(null);
            }}
            placeholder="Entrez votre ID enquêteur ou nom..."
            className="pl-10"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
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
          <XCircle className="w-4 h-4" />
          <span>{searchError}</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        <ClipboardList className="inline w-3 h-3 mr-1" />
        Entrez votre ID badge ou votre nom pour vous identifier
      </p>
    </div>
  );
}
