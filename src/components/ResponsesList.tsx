import { Calendar, MapPin, Cloud, CloudOff, AlertCircle } from 'lucide-react';
import { SurveyResponse, Survey } from '@/types/survey';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ResponsesListProps {
  responses: SurveyResponse[];
  surveys: Survey[];
}

export const ResponsesList = ({ responses, surveys }: ResponsesListProps) => {
  const getSurveyTitle = (surveyId: string) => {
    return surveys.find(s => s.id === surveyId)?.title || 'Enquête inconnue';
  };

  const statusConfig = {
    synced: {
      icon: Cloud,
      label: 'Synchronisé',
      className: 'status-synced',
    },
    pending: {
      icon: CloudOff,
      label: 'En attente',
      className: 'status-pending',
    },
    error: {
      icon: AlertCircle,
      label: 'Erreur',
      className: 'bg-destructive/15 text-destructive',
    },
  };

  if (responses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Cloud className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Aucune donnée collectée
        </h3>
        <p className="text-muted-foreground">
          Les réponses aux enquêtes apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {responses.map((response, index) => {
        const status = statusConfig[response.syncStatus];
        const StatusIcon = status.icon;

        return (
          <div
            key={response.id}
            className="bg-card rounded-xl border border-border p-4 slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h4 className="font-medium text-foreground truncate">
                {getSurveyTitle(response.surveyId)}
              </h4>
              <div className={cn('status-badge', status.className)}>
                <StatusIcon className="h-3 w-3" />
                <span>{status.label}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {format(new Date(response.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr })}
                </span>
              </div>
              {response.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>GPS</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
