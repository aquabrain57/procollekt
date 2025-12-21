import { ClipboardList, ChevronRight, Users } from 'lucide-react';
import { Survey } from '@/types/survey';
import { cn } from '@/lib/utils';

interface SurveyCardProps {
  survey: Survey;
  onClick: () => void;
}

export const SurveyCard = ({ survey, onClick }: SurveyCardProps) => {
  const statusColors = {
    active: 'bg-success/15 text-success',
    draft: 'bg-muted text-muted-foreground',
    completed: 'bg-primary/15 text-primary',
  };

  const statusLabels = {
    active: 'Actif',
    draft: 'Brouillon',
    completed: 'Terminé',
  };

  return (
    <button
      onClick={onClick}
      className="card-interactive w-full text-left slide-up"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <span className={cn('status-badge text-[11px]', statusColors[survey.status])}>
              {statusLabels[survey.status]}
            </span>
          </div>
          
          <h3 className="font-semibold text-foreground mb-1 truncate">
            {survey.title}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {survey.description}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{survey.responseCount} réponses</span>
            </div>
            <span>{survey.fields.length} questions</span>
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </button>
  );
};
