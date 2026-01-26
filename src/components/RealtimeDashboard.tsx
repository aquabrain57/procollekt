import { useState, useMemo, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  RefreshCw, Bell, BellOff, Wifi, WifiOff, 
  Clock, Users, TrendingUp, Activity, CheckCircle,
  MapPin, Zap, ClipboardList, BarChart3, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { DbSurvey } from '@/hooks/useSurveys';
import { cn } from '@/lib/utils';
import { LocationBadge } from '@/components/LocationDisplay';

interface RealtimeDashboardProps {
  surveys: DbSurvey[];
  surveyId?: string;
  onSurveySelect?: (survey: DbSurvey) => void;
}

export const RealtimeDashboard = ({ surveys: initialSurveys, surveyId, onSurveySelect }: RealtimeDashboardProps) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const { 
    responses, 
    surveys, 
    isLoading, 
    lastUpdate, 
    newResponsesCount, 
    isRealtime,
    refresh,
    clearNewCount
  } = useRealtimeDashboard({
    surveyId,
    enableNotifications: notificationsEnabled,
    autoRefreshInterval: 30000,
  });

  // Use initial surveys if realtime hasn't loaded yet
  const displaySurveys = surveys.length > 0 ? surveys : initialSurveys;

  // Stats calculations
  const stats = useMemo(() => {
    const total = responses.length;
    const withLocation = responses.filter(r => r.location).length;
    const synced = responses.filter(r => r.sync_status === 'synced').length;
    
    // Today's responses
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayResponses = responses.filter(r => 
      format(new Date(r.created_at), 'yyyy-MM-dd') === today
    ).length;

    // Last 7 days trend
    const last7Days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days[format(date, 'dd/MM')] = 0;
    }

    responses.forEach(r => {
      const date = format(new Date(r.created_at), 'dd/MM');
      if (last7Days[date] !== undefined) {
        last7Days[date]++;
      }
    });

    const chartData = Object.entries(last7Days).map(([date, count]) => ({
      date,
      responses: count,
    }));

    // Responses by survey
    const bySurvey = displaySurveys.map(survey => ({
      id: survey.id,
      name: survey.title.length > 20 ? survey.title.slice(0, 20) + '...' : survey.title,
      fullName: survey.title,
      responses: responses.filter(r => r.survey_id === survey.id).length,
      status: survey.status,
    })).filter(s => s.responses > 0).sort((a, b) => b.responses - a.responses).slice(0, 5);

    // Latest responses
    const latest = responses.slice(0, 10).map(r => {
      const survey = displaySurveys.find(s => s.id === r.survey_id);
      return {
        id: r.id,
        surveyTitle: survey?.title || 'Enquête',
        createdAt: r.created_at,
        hasLocation: !!r.location,
        location: r.location,
      };
    });

    return {
      total,
      todayResponses,
      withLocation,
      locationRate: total > 0 ? Math.round((withLocation / total) * 100) : 0,
      synced,
      activeSurveys: displaySurveys.filter(s => s.status === 'active').length,
      chartData,
      bySurvey,
      latest,
    };
  }, [responses, displaySurveys]);

  return (
    <div className="space-y-4">
      {/* Header with realtime status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground">Tableau de bord en temps réel</h2>
          <Badge 
            variant={isRealtime ? 'default' : 'secondary'}
            className={cn(
              "gap-1.5 text-xs",
              isRealtime && "bg-green-600 hover:bg-green-700"
            )}
          >
            {isRealtime ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                En direct
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Hors ligne
              </>
            )}
          </Badge>
          {newResponsesCount > 0 && (
            <Badge 
              variant="destructive" 
              className="animate-pulse cursor-pointer"
              onClick={clearNewCount}
            >
              +{newResponsesCount} nouvelle{newResponsesCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Last update */}
          {lastUpdate && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Màj {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: fr })}
            </span>
          )}

          {/* Notifications toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
            <Label htmlFor="notifications" className="text-xs cursor-pointer">
              {notificationsEnabled ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
            </Label>
          </div>

          {/* Refresh button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refresh}
            disabled={isLoading}
            className="text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isLoading && "animate-spin")} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Réponses totales</p>
              </div>
              <div className="p-3 bg-primary/20 rounded-xl">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="h-3 w-3" />
              <span>+{stats.todayResponses} aujourd'hui</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.activeSurveys}</p>
                <p className="text-xs text-muted-foreground">Enquêtes actives</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-xl">
                <ClipboardList className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.locationRate}%</p>
                <p className="text-xs text-muted-foreground">Taux GPS</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <MapPin className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
              <Zap className="h-3 w-3" />
              <span>{stats.withLocation} positions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.synced}</p>
                <p className="text-xs text-muted-foreground">Synchronisées</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Activity trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Activité des 7 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="colorResp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} />
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
                    fill="url(#colorResp)" 
                    name="Réponses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top surveys */}
        {stats.bySurvey.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                Réponses par enquête
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.bySurvey} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" fontSize={10} />
                    <YAxis dataKey="name" type="category" fontSize={10} width={100} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number, name: string, props: any) => [value, props.payload.fullName]}
                    />
                    <Bar dataKey="responses" fill="#22c55e" radius={[0, 4, 4, 0]} name="Réponses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Latest responses */}
      {stats.latest.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Dernières réponses en temps réel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.latest.map((item, idx) => (
                <div 
                  key={item.id} 
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg transition-colors",
                    idx === 0 && newResponsesCount > 0 
                      ? "bg-green-500/10 border border-green-500/20 animate-pulse" 
                      : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium">#{responses.length - idx}</span>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{item.surveyTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.hasLocation && item.location ? (
                      <LocationBadge 
                        latitude={item.location.latitude} 
                        longitude={item.location.longitude}
                        showCountry={true}
                      />
                    ) : item.hasLocation ? (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <MapPin className="h-2.5 w-2.5" />
                        GPS
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};