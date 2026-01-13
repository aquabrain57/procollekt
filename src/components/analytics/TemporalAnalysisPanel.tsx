import { useMemo } from 'react';
import { format, startOfWeek, startOfMonth, getDay, getHours, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { DbSurveyResponse } from '@/hooks/useSurveys';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';

interface TemporalAnalysisPanelProps {
  responses: DbSurveyResponse[];
}

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export const TemporalAnalysisPanel = ({ responses }: TemporalAnalysisPanelProps) => {
  const analysis = useMemo(() => {
    if (responses.length === 0) return null;

    // By day of week
    const byDayOfWeek = responses.reduce((acc, r) => {
      const day = getDay(new Date(r.created_at));
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const dayOfWeekData = DAYS_FR.map((name, idx) => ({
      name,
      value: byDayOfWeek[idx] || 0,
    }));

    // By hour
    const byHour = responses.reduce((acc, r) => {
      const hour = getHours(new Date(r.created_at));
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const hourData = Array.from({ length: 24 }, (_, i) => ({
      name: `${i}h`,
      value: byHour[i] || 0,
    }));

    // By date (daily timeline)
    const byDate = responses.reduce((acc, r) => {
      const date = format(new Date(r.created_at), 'yyyy-MM-dd');
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dailyData = Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, count]) => ({
        date: format(parseISO(date), 'dd/MM', { locale: fr }),
        fullDate: format(parseISO(date), 'dd MMMM yyyy', { locale: fr }),
        value: count,
      }));

    // By week
    const byWeek = responses.reduce((acc, r) => {
      const weekStart = format(startOfWeek(new Date(r.created_at), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      acc[weekStart] = (acc[weekStart] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const weeklyData = Object.entries(byWeek)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([date, count]) => ({
        week: format(parseISO(date), "'S'w", { locale: fr }),
        fullDate: `Semaine du ${format(parseISO(date), 'dd MMM', { locale: fr })}`,
        value: count,
      }));

    // By month
    const byMonth = responses.reduce((acc, r) => {
      const monthStart = format(startOfMonth(new Date(r.created_at)), 'yyyy-MM');
      acc[monthStart] = (acc[monthStart] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const monthlyData = Object.entries(byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([date, count]) => ({
        month: format(parseISO(`${date}-01`), 'MMM yy', { locale: fr }),
        fullDate: format(parseISO(`${date}-01`), 'MMMM yyyy', { locale: fr }),
        value: count,
      }));

    // Peak analysis
    const peakDay = dayOfWeekData.reduce((max, d) => d.value > max.value ? d : max, dayOfWeekData[0]);
    const peakHour = hourData.reduce((max, h) => h.value > max.value ? h : max, hourData[0]);
    
    // Calculate trend
    const recentDays = dailyData.slice(-7);
    const previousDays = dailyData.slice(-14, -7);
    const recentAvg = recentDays.reduce((sum, d) => sum + d.value, 0) / Math.max(recentDays.length, 1);
    const previousAvg = previousDays.reduce((sum, d) => sum + d.value, 0) / Math.max(previousDays.length, 1);
    const trend = previousAvg > 0 ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100) : 0;

    return {
      dayOfWeekData,
      hourData,
      dailyData,
      weeklyData,
      monthlyData,
      peakDay: peakDay.name,
      peakHour: peakHour.name,
      trend,
      avgPerDay: Math.round(responses.length / Math.max(Object.keys(byDate).length, 1)),
    };
  }, [responses]);

  if (!analysis || responses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Aucune donnée temporelle</p>
        <p className="text-sm">Les analyses apparaîtront une fois les réponses collectées</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{analysis.peakDay}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Jour le plus actif</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{analysis.peakHour}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Heure pic</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{analysis.avgPerDay}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Moy./jour</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${analysis.trend >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <TrendingUp className={`h-4 w-4 ${analysis.trend >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">
                  {analysis.trend >= 0 ? '+' : ''}{analysis.trend}%
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Tendance 7j</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily evolution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Évolution quotidienne (30 derniers jours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] sm:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analysis.dailyData}>
                <defs>
                  <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                  formatter={(value: number) => [value, 'Réponses']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorDaily)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By day of week */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Par jour de la semaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Réponses']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By hour */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Par heure de la journée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.hourData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} interval={2} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Réponses']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly and Monthly */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Par semaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                    formatter={(value: number) => [value, 'Réponses']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Par mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                    formatter={(value: number) => [value, 'Réponses']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
