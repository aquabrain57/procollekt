import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { 
  ClipboardList, CheckCircle, Clock, TrendingUp, Users, 
  MapPin, BarChart3, Activity, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DbSurvey, DbSurveyResponse } from '@/hooks/useSurveys';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

interface EnhancedDashboardProps {
  surveys: DbSurvey[];
  responses: DbSurveyResponse[];
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export const EnhancedDashboard = ({ surveys, responses }: EnhancedDashboardProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'fr' ? fr : enUS;

  const stats = useMemo(() => {
    const activeSurveys = surveys.filter(s => s.status === 'active').length;
    const draftSurveys = surveys.filter(s => s.status === 'draft').length;
    const totalResponses = responses.length;
    const geolocated = responses.filter(r => r.location).length;
    const synced = responses.filter(r => r.sync_status === 'synced').length;
    const pending = responses.filter(r => r.sync_status === 'pending').length;

    // Responses by day (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return format(date, 'dd/MM', { locale: dateLocale });
    });

    const responsesByDay = responses.reduce((acc, r) => {
      const date = format(new Date(r.created_at), 'dd/MM', { locale: dateLocale });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const chartData = last7Days.map(date => ({
      date,
      responses: responsesByDay[date] || 0,
    }));

    // Responses by survey
    const bySurvey = surveys.map(survey => {
      const count = responses.filter(r => r.survey_id === survey.id).length;
      return {
        name: survey.title.length > 15 ? survey.title.slice(0, 15) + '...' : survey.title,
        fullName: survey.title,
        responses: count,
      };
    }).filter(s => s.responses > 0).sort((a, b) => b.responses - a.responses).slice(0, 5);

    // Survey status distribution
    const statusData = [
      { name: t('dashboard.active'), value: activeSurveys, color: '#22c55e' },
      { name: t('dashboard.draft'), value: draftSurveys, color: '#f59e0b' },
    ].filter(s => s.value > 0);

    // Today's activity
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayResponses = responses.filter(r => 
      format(new Date(r.created_at), 'yyyy-MM-dd') === today
    ).length;

    return {
      activeSurveys,
      draftSurveys,
      totalSurveys: surveys.length,
      totalResponses,
      geolocated,
      geolocatedRate: totalResponses > 0 ? Math.round((geolocated / totalResponses) * 100) : 0,
      synced,
      pending,
      chartData,
      bySurvey,
      statusData,
      todayResponses,
      avgPerSurvey: activeSurveys > 0 ? Math.round(totalResponses / activeSurveys) : 0,
    };
  }, [surveys, responses, t, dateLocale]);

  return (
    <div className="w-full space-y-4 max-w-none">
      {/* Primary Stats - Full Width */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 w-full">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl lg:text-4xl font-bold text-foreground">{stats.totalResponses}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.totalResponses')}</p>
              </div>
              <div className="p-3 lg:p-4 bg-primary/20 rounded-xl">
                <Users className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-primary">
              <TrendingUp className="h-3 w-3" />
              <span>+{stats.todayResponses} {t('dashboard.today')}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl lg:text-4xl font-bold text-foreground">{stats.activeSurveys}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.activeSurveys')}</p>
              </div>
              <div className="p-3 lg:p-4 bg-green-500/20 rounded-xl">
                <ClipboardList className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
              <Activity className="h-3 w-3" />
              <span>{stats.draftSurveys} {t('dashboard.drafts')}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl lg:text-4xl font-bold text-foreground">{stats.geolocatedRate}%</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.geolocated')}</p>
              </div>
              <div className="p-3 lg:p-4 bg-orange-500/20 rounded-xl">
                <MapPin className="h-6 w-6 lg:h-8 lg:w-8 text-orange-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-orange-600">
              <Zap className="h-3 w-3" />
              <span>{stats.geolocated} {t('dashboard.responsesCount')}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl lg:text-4xl font-bold text-foreground">{stats.synced}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.synced')}</p>
              </div>
              <div className="p-3 lg:p-4 bg-purple-500/20 rounded-xl">
                <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600" />
              </div>
            </div>
            {stats.pending > 0 && (
              <div className="mt-3 flex items-center gap-1 text-xs text-purple-600">
                <Clock className="h-3 w-3" />
                <span>{stats.pending} {t('dashboard.pending')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row - Full Width */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 w-full">
        {/* Activity Chart */}
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base lg:text-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5" />
              {t('dashboard.activity7days')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] lg:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="responses" 
                    stroke="#6366f1" 
                    fill="#6366f1" 
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name={t('dashboard.responsesCount')}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Surveys */}
        {stats.bySurvey.length > 0 && (
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base lg:text-lg flex items-center gap-2">
                <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />
                {t('dashboard.topSurveys')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] lg:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.bySurvey} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" fontSize={11} />
                    <YAxis dataKey="name" type="category" fontSize={10} width={100} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string, props: any) => [value, props.payload.fullName]}
                    />
                    <Bar dataKey="responses" fill="#22c55e" radius={[0, 4, 4, 0]} name={t('dashboard.responsesCount')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Secondary Stats Row - Full Width */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 w-full">
        <Card>
          <CardContent className="p-4 lg:p-6 text-center">
            <p className="text-2xl lg:text-3xl font-bold text-foreground">{stats.avgPerSurvey}</p>
            <p className="text-xs lg:text-sm text-muted-foreground">{t('dashboard.avgPerSurvey')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 lg:p-6 text-center">
            <p className="text-2xl lg:text-3xl font-bold text-foreground">{stats.totalSurveys}</p>
            <p className="text-xs lg:text-sm text-muted-foreground">{t('dashboard.surveysCreated')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 lg:p-6 text-center">
            <p className="text-2xl lg:text-3xl font-bold text-foreground">{stats.todayResponses}</p>
            <p className="text-xs lg:text-sm text-muted-foreground">{t('dashboard.todayResponses')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 lg:p-6 text-center">
            <p className="text-2xl lg:text-3xl font-bold text-foreground">{stats.geolocated}</p>
            <p className="text-xs lg:text-sm text-muted-foreground">{t('dashboard.withLocation')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      {stats.statusData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              {t('dashboard.surveyDistribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-8">
              <div className="h-[120px] w-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={stats.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      dataKey="value"
                    >
                      {stats.statusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {stats.statusData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-foreground">{item.name}</span>
                    <span className="text-sm font-bold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
