import { ClipboardList, ChevronRight, Users, MapPin, Briefcase, Globe, Star, Image } from 'lucide-react';
import { DbSurvey, DbSurveyResponse } from '@/hooks/useSurveys';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import defaultCover from '@/assets/auth-field-bg.jpg';

interface SurveyCardEnhancedProps {
  survey: DbSurvey;
  responses?: DbSurveyResponse[];
  onClick?: () => void;
  onSubscribe?: () => void;
  showSubscribe?: boolean;
}

// Parse sector and country from description
const parseSurveyMetadata = (description: string | null) => {
  if (!description) return { sector: null, country: null, cleanDescription: description };
  
  let sector: string | null = null;
  let country: string | null = null;
  let cleanDescription = description;

  // Extract sector
  const sectorMatch = description.match(/\[Secteur:\s*([^\]]+)\]/i);
  if (sectorMatch) {
    sector = sectorMatch[1].trim();
    cleanDescription = cleanDescription.replace(sectorMatch[0], '').trim();
  }

  // Extract country
  const countryMatch = description.match(/\[Pays:\s*([^\]]+)\]/i);
  if (countryMatch) {
    country = countryMatch[1].trim();
    cleanDescription = cleanDescription.replace(countryMatch[0], '').trim();
  }

  // Clean up any remaining markers
  cleanDescription = cleanDescription.replace(/^\s*[-–—]\s*/, '').trim();

  return { sector, country, cleanDescription: cleanDescription || null };
};

const statusColors = {
  active: 'bg-success/15 text-success border-success/30',
  draft: 'bg-muted text-muted-foreground border-muted-foreground/30',
  completed: 'bg-primary/15 text-primary border-primary/30',
};

const statusLabels = {
  active: 'Actif',
  draft: 'Brouillon',
  completed: 'Terminé',
};

export const SurveyCardEnhanced = ({ 
  survey, 
  responses = [], 
  onClick, 
  onSubscribe,
  showSubscribe = false 
}: SurveyCardEnhancedProps) => {
  const { sector, country, cleanDescription } = parseSurveyMetadata(survey.description);
  const responseCount = responses.filter(r => r.survey_id === survey.id).length;

  return (
    <div
      className="relative bg-card border border-border rounded-xl overflow-hidden hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer slide-up"
      onClick={onClick}
    >
      <div className="flex">
        {/* Cover Image Thumbnail - Left side */}
        <div className="w-16 sm:w-20 h-auto min-h-[80px] flex-shrink-0 bg-muted">
          <img 
            src={survey.cover_image_url || defaultCover} 
            alt={survey.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = defaultCover;
            }}
          />
        </div>
        
        <div className="flex-1 p-3 sm:p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Header with status */}
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn('text-[10px] h-5', statusColors[survey.status as keyof typeof statusColors])}
                >
                  {statusLabels[survey.status as keyof typeof statusLabels] || survey.status}
                </Badge>
              </div>
            
            {/* Title */}
            <h3 className="font-semibold text-foreground mb-1.5 truncate">
              {survey.title}
            </h3>
            
            {/* Description */}
            {cleanDescription && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {cleanDescription}
              </p>
            )}

            {/* Metadata badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {sector && (
                <Badge variant="secondary" className="text-xs gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                  <Briefcase className="h-3 w-3" />
                  {sector}
                </Badge>
              )}
              {country && (
                <Badge variant="secondary" className="text-xs gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <Globe className="h-3 w-3" />
                  {country}
                </Badge>
              )}
            </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>{responseCount} réponse{responseCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {showSubscribe && survey.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSubscribe?.();
                  }}
                >
                  <Star className="h-3 w-3 mr-1" />
                  Suivre
                </Button>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { parseSurveyMetadata };
