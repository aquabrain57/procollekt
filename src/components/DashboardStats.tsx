import { ClipboardList, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Survey, SurveyResponse } from '@/types/survey';

interface DashboardStatsProps {
  surveys: Survey[];
  responses: SurveyResponse[];
}

export const DashboardStats = ({ surveys, responses }: DashboardStatsProps) => {
  const activeSurveys = surveys.filter(s => s.status === 'active').length;
  const totalResponses = responses.length;
  const pendingSync = responses.filter(r => r.syncStatus === 'pending').length;
  const syncedResponses = responses.filter(r => r.syncStatus === 'synced').length;

  const stats = [
    {
      label: 'Enquêtes actives',
      value: activeSurveys,
      icon: ClipboardList,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Réponses collectées',
      value: totalResponses,
      icon: CheckCircle,
      color: 'text-success bg-success/10',
    },
    {
      label: 'En attente de sync',
      value: pendingSync,
      icon: Clock,
      color: 'text-warning bg-warning/10',
    },
    {
      label: 'Synchronisées',
      value: syncedResponses,
      icon: AlertCircle,
      color: 'text-accent-foreground bg-accent',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-card rounded-xl border border-border p-4 slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={`inline-flex p-2 rounded-lg ${stat.color} mb-3`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
};
