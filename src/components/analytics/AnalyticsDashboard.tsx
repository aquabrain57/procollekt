import { useState, useMemo, useEffect, useCallback } from 'react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  BarChart3, PieChart, TrendingUp, Users, MapPin, Calendar, 
  CheckCircle, AlertTriangle, Filter, RefreshCw, Download,
  Target, Zap, Clock, Activity, FileSpreadsheet, FileText, 
  Presentation, Crown, Brain, Map, Shield, Search, X
} from 'lucide-react';
import { DbSurvey, DbSurveyResponse, useSurveyFields } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { KPIGrid } from './KPIGrid';
import { FieldAnalysisCard } from './FieldAnalysisCard';
import { GeoAnalysisPanel } from './GeoAnalysisPanel';
import { DataQualityPanel } from './DataQualityPanel';
import { AIInsightsPanel } from './AIInsightsPanel';
import { CrossAnalysisPanel } from './CrossAnalysisPanel';
import { TemporalAnalysisPanel } from './TemporalAnalysisPanel';
import { ExportPanel } from './ExportPanel';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

interface AnalyticsDashboardProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
}

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  zone: string;
  enumerator: string;
  period: 'all' | '7d' | '30d' | '90d' | 'custom';
}

export const AnalyticsDashboard = ({ survey, responses }: AnalyticsDashboardProps) => {
  const { fields } = useSurveyFields(survey.id);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    zone: '',
    enumerator: '',
    period: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Auto-detect enumerator and zone fields
  const enumeratorFieldId = useMemo(() => 
    fields.find(f => /enqu[êe]teur|agent|interview|collecteur/i.test(f.label))?.id,
    [fields]
  );
  
  const zoneFieldId = useMemo(() => 
    fields.find(f => /zone|quartier|village|localit|région|district/i.test(f.label))?.id,
    [fields]
  );

  // Get unique values for filters
  const uniqueEnumerators = useMemo(() => {
    if (!enumeratorFieldId) return [];
    const values = new Set<string>();
    responses.forEach(r => {
      const v = r.data[enumeratorFieldId];
      if (v && typeof v === 'string') values.add(v);
    });
    return Array.from(values).sort();
  }, [responses, enumeratorFieldId]);

  const uniqueZones = useMemo(() => {
    if (!zoneFieldId) return [];
    const values = new Set<string>();
    responses.forEach(r => {
      const v = r.data[zoneFieldId];
      if (v && typeof v === 'string') values.add(v);
    });
    return Array.from(values).sort();
  }, [responses, zoneFieldId]);

  // Apply filters
  const filteredResponses = useMemo(() => {
    let result = [...responses];

    // Period filter
    if (filters.period !== 'all' && filters.period !== 'custom') {
      const days = filters.period === '7d' ? 7 : filters.period === '30d' ? 30 : 90;
      const cutoff = subDays(new Date(), days);
      result = result.filter(r => new Date(r.created_at) >= cutoff);
    }

    // Custom date range
    if (filters.period === 'custom' || (filters.dateFrom || filters.dateTo)) {
      if (filters.dateFrom) {
        const from = startOfDay(new Date(filters.dateFrom));
        result = result.filter(r => new Date(r.created_at) >= from);
      }
      if (filters.dateTo) {
        const to = endOfDay(new Date(filters.dateTo));
        result = result.filter(r => new Date(r.created_at) <= to);
      }
    }

    // Enumerator filter
    if (filters.enumerator && enumeratorFieldId) {
      result = result.filter(r => r.data[enumeratorFieldId] === filters.enumerator);
    }

    // Zone filter
    if (filters.zone && zoneFieldId) {
      result = result.filter(r => r.data[zoneFieldId] === filters.zone);
    }

    return result;
  }, [responses, filters, enumeratorFieldId, zoneFieldId]);

  // Global statistics
  const globalStats = useMemo(() => {
    const total = filteredResponses.length;
    const withLocation = filteredResponses.filter(r => r.location).length;
    
    // Completion rate
    const requiredFields = fields.filter(f => f.required);
    const complete = filteredResponses.filter(r => {
      return requiredFields.every(field => {
        const value = r.data[field.id];
        return value !== undefined && value !== null && value !== '';
      });
    }).length;

    // Timeline
    const byDate = filteredResponses.reduce((acc, r) => {
      const date = format(new Date(r.created_at), 'dd/MM', { locale: fr });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timelineData = Object.entries(byDate)
      .slice(-14)
      .map(([date, count]) => ({ date, responses: count }));

    // By hour
    const byHour = filteredResponses.reduce((acc, r) => {
      const hour = new Date(r.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];

    // Days active
    const uniqueDays = new Set(filteredResponses.map(r => 
      format(new Date(r.created_at), 'yyyy-MM-dd')
    )).size;

    return {
      total,
      withLocation,
      locationRate: total > 0 ? Math.round((withLocation / total) * 100) : 0,
      completionRate: total > 0 ? Math.round((complete / total) * 100) : 0,
      avgPerDay: uniqueDays > 0 ? Math.round(total / uniqueDays) : 0,
      timelineData,
      peakHour: peakHour ? `${peakHour[0]}h` : 'N/A',
      daysActive: uniqueDays,
      questionsCount: fields.length,
    };
  }, [filteredResponses, fields]);

  const resetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      zone: '',
      enumerator: '',
      period: 'all',
    });
  };

  const hasActiveFilters = filters.period !== 'all' || filters.dateFrom || filters.dateTo || filters.zone || filters.enumerator;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">{survey.title}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Module Analyse & Rapports • {filteredResponses.length} réponse{filteredResponses.length !== 1 ? 's' : ''}
              {hasActiveFilters && ` (filtré de ${responses.length})`}
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant={showFilters ? "default" : "outline"} 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs sm:text-sm"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filtres
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  Actif
                </Badge>
              )}
            </Button>
            
            <ExportPanel 
              survey={survey} 
              responses={filteredResponses} 
              fields={fields}
              globalStats={globalStats}
            />
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <Card className="border-primary/20">
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Period quick select */}
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs mb-1.5 block">Période</Label>
                  <Select 
                    value={filters.period} 
                    onValueChange={(v: FilterState['period']) => setFilters(f => ({ ...f, period: v }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tout</SelectItem>
                      <SelectItem value="7d">7 derniers jours</SelectItem>
                      <SelectItem value="30d">30 derniers jours</SelectItem>
                      <SelectItem value="90d">90 derniers jours</SelectItem>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date range */}
                <div>
                  <Label className="text-xs mb-1.5 block">Du</Label>
                  <Input 
                    type="date" 
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value, period: 'custom' }))}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Au</Label>
                  <Input 
                    type="date" 
                    value={filters.dateTo}
                    onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value, period: 'custom' }))}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Zone filter */}
                {uniqueZones.length > 0 && (
                  <div>
                    <Label className="text-xs mb-1.5 block">Zone</Label>
                    <Select 
                      value={filters.zone} 
                      onValueChange={(v) => setFilters(f => ({ ...f, zone: v === 'all' ? '' : v }))}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Toutes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les zones</SelectItem>
                        {uniqueZones.map(z => (
                          <SelectItem key={z} value={z}>{z}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Enumerator filter */}
                {uniqueEnumerators.length > 0 && (
                  <div>
                    <Label className="text-xs mb-1.5 block">Enquêteur</Label>
                    <Select 
                      value={filters.enumerator} 
                      onValueChange={(v) => setFilters(f => ({ ...f, enumerator: v === 'all' ? '' : v }))}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Tous" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les enquêteurs</SelectItem>
                        {uniqueEnumerators.map(e => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Reset button */}
                <div className="flex items-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetFilters}
                    disabled={!hasActiveFilters}
                    className="h-9 text-xs"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Réinitialiser
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1 h-auto p-1">
          <TabsTrigger value="overview" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5">
            <BarChart3 className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">Vue d'ensemble</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="questions" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5">
            <Target className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">Par question</span>
            <span className="sm:hidden">Questions</span>
          </TabsTrigger>
          <TabsTrigger value="geo" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5">
            <Map className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">Géographique</span>
            <span className="sm:hidden">Carte</span>
          </TabsTrigger>
          <TabsTrigger value="temporal" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5">
            <Calendar className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">Temporelle</span>
            <span className="sm:hidden">Temps</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5">
            <Brain className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">IA & Insights</span>
            <span className="sm:hidden">IA</span>
          </TabsTrigger>
          <TabsTrigger value="quality" className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5">
            <Shield className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">Qualité</span>
            <span className="sm:hidden">Qualité</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {filteredResponses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Aucune donnée à analyser</p>
              <p className="text-sm">Les analyses apparaîtront une fois les réponses collectées</p>
            </div>
          ) : (
            <>
              <KPIGrid stats={globalStats} />
              
              {/* Timeline chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Évolution des réponses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] sm:h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={globalStats.timelineData}>
                        <defs>
                          <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="responses" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorResponses)" 
                          name="Réponses"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Quick field analysis preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {fields.slice(0, 4).map(field => (
                  <FieldAnalysisCard 
                    key={field.id} 
                    field={field} 
                    responses={filteredResponses}
                    compact
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="mt-4">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-4 pr-4">
              {fields.map((field, index) => (
                <FieldAnalysisCard 
                  key={field.id} 
                  field={field} 
                  responses={filteredResponses}
                  index={index}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Geographic Tab */}
        <TabsContent value="geo" className="mt-4">
          <GeoAnalysisPanel 
            responses={filteredResponses} 
            fields={fields}
            zoneFieldId={zoneFieldId}
          />
        </TabsContent>

        {/* Temporal Tab */}
        <TabsContent value="temporal" className="mt-4">
          <TemporalAnalysisPanel responses={filteredResponses} />
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="mt-4">
          <AIInsightsPanel 
            survey={survey}
            responses={filteredResponses} 
            fields={fields}
            globalStats={globalStats}
          />
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality" className="mt-4">
          <DataQualityPanel 
            responses={filteredResponses} 
            fields={fields}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
