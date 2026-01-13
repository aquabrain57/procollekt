import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { FileEdit, Eye, Trash2, Send, MoreVertical, Users, MessageSquare, Copy } from 'lucide-react';
import { DbSurvey } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface MySurveysListProps {
  surveys: DbSurvey[];
  responseCounts: Record<string, number>;
  onEdit: (survey: DbSurvey) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onViewResponses: (survey: DbSurvey) => void;
  onDuplicate?: (survey: DbSurvey) => void;
}

export const MySurveysList = ({
  surveys,
  responseCounts,
  onEdit,
  onDelete,
  onPublish,
  onUnpublish,
  onViewResponses,
  onDuplicate,
}: MySurveysListProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'fr' ? fr : enUS;

  if (surveys.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileEdit className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">{t('mySurveys.noSurveys', 'Aucune enquête créée')}</p>
        <p className="text-sm">{t('mySurveys.createFirst', 'Créez votre première enquête pour commencer')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {surveys.map((survey) => (
        <div
          key={survey.id}
          className="bg-card border border-border rounded-xl p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                {survey.cover_image_url && (
                  <img
                    src={survey.cover_image_url}
                    alt={t('mySurveys.coverAlt', "Image de l'enquête")}
                    loading="lazy"
                    className="w-12 h-12 rounded-lg object-cover border border-border flex-shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">
                      {survey.title}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      survey.status === 'active'
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {survey.status === 'active' 
                        ? t('mySurveys.published', 'Publié') 
                        : t('mySurveys.draft', 'Brouillon')}
                    </span>
                  </div>
                  {survey.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2 break-words">
                      {survey.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>
                      {t('mySurveys.createdOn', 'Créé le')} {format(new Date(survey.created_at), 'dd MMM yyyy', { locale: dateLocale })}
                    </span>
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <MessageSquare className="h-3 w-3" />
                      {responseCounts[survey.id] || 0} {(responseCounts[survey.id] || 0) !== 1 
                        ? t('mySurveys.responses', 'réponses') 
                        : t('mySurveys.response', 'réponse')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(survey)}>
                  <FileEdit className="h-4 w-4 mr-2" />
                  {t('common.edit', 'Modifier')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewResponses(survey)}>
                  <Users className="h-4 w-4 mr-2" />
                  {t('mySurveys.viewResponses', 'Voir les réponses')}
                </DropdownMenuItem>
                {onDuplicate && (
                  <DropdownMenuItem onClick={() => onDuplicate(survey)}>
                    <Copy className="h-4 w-4 mr-2" />
                    {t('mySurveys.duplicate', 'Dupliquer')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {survey.status === 'active' ? (
                  <DropdownMenuItem onClick={() => onUnpublish(survey.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    {t('mySurveys.unpublish', 'Dépublier')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onPublish(survey.id)}>
                    <Send className="h-4 w-4 mr-2" />
                    {t('mySurveys.publish', 'Publier')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common.delete', 'Supprimer')}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('mySurveys.deleteTitle', "Supprimer l'enquête ?")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('mySurveys.deleteDescription', "Cette action est irréversible. L'enquête et toutes ses réponses seront supprimées définitivement.")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel', 'Annuler')}</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => onDelete(survey.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t('common.delete', 'Supprimer')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
};
