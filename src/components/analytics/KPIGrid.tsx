import { Users, CheckCircle, MapPin, Calendar, Clock, Target, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface KPIGridProps {
  stats: {
    total: number;
    completionRate: number;
    locationRate: number;
    avgPerDay: number;
    daysActive: number;
    questionsCount: number;
    peakHour: string;
  };
}

export const KPIGrid = ({ stats }: KPIGridProps) => {
  const kpis = [
    {
      icon: Users,
      label: 'Total réponses',
      value: stats.total.toString(),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      description: stats.total >= 100 ? 'Échantillon représentatif' : stats.total >= 30 ? 'Échantillon acceptable' : 'Continuer la collecte',
    },
    {
      icon: CheckCircle,
      label: 'Taux complétion',
      value: `${stats.completionRate}%`,
      color: stats.completionRate >= 80 ? 'text-green-600' : stats.completionRate >= 60 ? 'text-amber-600' : 'text-red-600',
      bgColor: stats.completionRate >= 80 ? 'bg-green-100' : stats.completionRate >= 60 ? 'bg-amber-100' : 'bg-red-100',
      progress: stats.completionRate,
    },
    {
      icon: MapPin,
      label: 'Géolocalisation',
      value: `${stats.locationRate}%`,
      color: stats.locationRate >= 70 ? 'text-blue-600' : 'text-amber-600',
      bgColor: stats.locationRate >= 70 ? 'bg-blue-100' : 'bg-amber-100',
      progress: stats.locationRate,
    },
    {
      icon: TrendingUp,
      label: 'Moyenne/jour',
      value: stats.avgPerDay.toString(),
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: `Sur ${stats.daysActive} jour${stats.daysActive > 1 ? 's' : ''} de collecte`,
    },
    {
      icon: Target,
      label: 'Questions',
      value: stats.questionsCount.toString(),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      description: 'Dans le questionnaire',
    },
    {
      icon: Clock,
      label: 'Pic d\'activité',
      value: stats.peakHour,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
      description: 'Heure la plus active',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 rounded-lg ${kpi.bgColor} shrink-0`}>
                <kpi.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${kpi.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-2xl font-bold text-foreground truncate">{kpi.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{kpi.label}</p>
                {kpi.progress !== undefined && (
                  <Progress value={kpi.progress} className="h-1 mt-1.5" />
                )}
                {kpi.description && (
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-1 truncate">{kpi.description}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
