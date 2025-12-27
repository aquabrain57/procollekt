import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Download, User, Clock, ChevronDown, ChevronUp, FileText, Filter } from 'lucide-react';
import { DbSurvey, DbSurveyResponse, useSurveyFields } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface SurveyResponsesViewProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
}

export const SurveyResponsesView = ({ survey, responses }: SurveyResponsesViewProps) => {
  const { fields } = useSurveyFields(survey.id);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredResponses = useMemo(() => {
    let result = [...responses];
    
    // Filter by search term
    if (searchTerm) {
      result = result.filter(response => {
        const searchLower = searchTerm.toLowerCase();
        // Search in all field values
        return Object.values(response.data).some(value => 
          String(value).toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    return result;
  }, [responses, searchTerm, sortOrder]);

  const exportToCSV = () => {
    if (responses.length === 0 || fields.length === 0) return;

    // Exclude user_id from exports to protect respondent privacy
    const headers = ['Date', 'Heure', 'Réponse #', 'Localisation (Lat)', 'Localisation (Lng)', ...fields.map(f => f.label)];
    const rows = responses.map((response, index) => {
      const date = format(new Date(response.created_at), 'dd/MM/yyyy');
      const time = format(new Date(response.created_at), 'HH:mm:ss');
      const lat = response.location?.latitude?.toFixed(6) || '';
      const lng = response.location?.longitude?.toFixed(6) || '';
      
      const fieldValues = fields.map(field => {
        const value = response.data[field.id];
        if (Array.isArray(value)) return value.join('; ');
        if (typeof value === 'object' && value !== null) return JSON.stringify(value);
        return value?.toString() || '';
      });

      // Use anonymous response number instead of user_id
      return [date, time, `#${responses.length - index}`, lat, lng, ...fieldValues];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${survey.title.replace(/\s+/g, '_')}_reponses.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLocationString = (location: { latitude: number; longitude: number } | null) => {
    if (!location) return null;
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{survey.title}</h2>
          <p className="text-sm text-muted-foreground">
            {responses.length} réponse{responses.length !== 1 ? 's' : ''} collectée{responses.length !== 1 ? 's' : ''}
          </p>
        </div>
        {responses.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      {responses.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans les réponses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortOrder} onValueChange={(v: 'newest' | 'oldest') => setSortOrder(v)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Plus récentes</SelectItem>
              <SelectItem value="oldest">Plus anciennes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Empty state */}
      {responses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Aucune réponse</p>
          <p className="text-sm">Les réponses des enquêteurs apparaîtront ici</p>
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-border rounded-xl">
          <p className="font-medium">Aucun résultat</p>
          <p className="text-sm">Essayez avec d'autres termes de recherche</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="space-y-3 pr-2">
            {filteredResponses.map((response, index) => {
              const isExpanded = expandedIds.has(response.id);
              const locationStr = getLocationString(response.location);
              
              return (
                <Card key={response.id} className="overflow-hidden">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(response.id)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            {/* Response number and date */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge variant="secondary" className="font-mono">
                                #{responses.length - index}
                              </Badge>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                {format(new Date(response.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                              </div>
                            </div>
                            
                            {/* Response indicator and location - user_id hidden for privacy */}
                            <div className="flex items-center gap-4 flex-wrap text-sm">
                              <div className="flex items-center gap-1.5 text-foreground">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium">Répondant #{responses.length - index}</span>
                              </div>
                              {locationStr && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5 text-green-600" />
                                  <span>{locationStr}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Preview of first field */}
                            {!isExpanded && fields.length > 0 && (
                              <div className="text-sm text-muted-foreground truncate">
                                <span className="font-medium">{fields[0].label}:</span>{' '}
                                {(() => {
                                  const value = response.data[fields[0].id];
                                  if (Array.isArray(value)) return value.join(', ');
                                  if (typeof value === 'object' && value !== null) return '(données)';
                                  return value?.toString() || '—';
                                })()}
                              </div>
                            )}
                          </div>
                          
                          <div className="ml-2">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4 px-4 border-t border-border">
                        <div className="grid gap-3 mt-4">
                          {fields.map((field) => {
                            const value = response.data[field.id];
                            if (value === undefined || value === null || value === '') {
                              return (
                                <div key={field.id} className="flex flex-col sm:flex-row sm:items-start gap-1">
                                  <span className="font-medium text-muted-foreground text-sm min-w-[150px]">
                                    {field.label}:
                                  </span>
                                  <span className="text-sm text-muted-foreground/50 italic">Non renseigné</span>
                                </div>
                              );
                            }

                            let displayValue: React.ReactNode;
                            if (Array.isArray(value)) {
                              displayValue = (
                                <div className="flex flex-wrap gap-1">
                                  {value.map((v, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {v}
                                    </Badge>
                                  ))}
                                </div>
                              );
                            } else if (typeof value === 'object' && value !== null) {
                              if ('latitude' in value && 'longitude' in value) {
                                displayValue = (
                                  <span className="text-sm text-foreground flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 text-green-600" />
                                    {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
                                  </span>
                                );
                              } else {
                                displayValue = <span className="text-sm text-foreground">{JSON.stringify(value)}</span>;
                              }
                            } else if (field.field_type === 'rating') {
                              displayValue = (
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: Number(value) }).map((_, i) => (
                                    <span key={i} className="text-yellow-500">★</span>
                                  ))}
                                  <span className="text-sm text-muted-foreground ml-1">({value}/{field.max_value || 5})</span>
                                </div>
                              );
                            } else if (field.field_type === 'photo' && typeof value === 'string' && value.startsWith('data:image')) {
                              displayValue = (
                                <img src={value} alt="Photo" className="max-w-[200px] h-auto rounded-lg border" />
                              );
                            } else {
                              displayValue = <span className="text-sm text-foreground">{value.toString()}</span>;
                            }

                            return (
                              <div key={field.id} className="flex flex-col sm:flex-row sm:items-start gap-1">
                                <span className="font-medium text-muted-foreground text-sm min-w-[150px] flex-shrink-0">
                                  {field.label}:
                                </span>
                                {displayValue}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
