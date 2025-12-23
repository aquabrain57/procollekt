import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileEdit, Eye, Trash2, Send, MoreVertical, Users } from 'lucide-react';
import { DbSurvey } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
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
  onEdit: (survey: DbSurvey) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onViewResponses: (survey: DbSurvey) => void;
}

export const MySurveysList = ({
  surveys,
  onEdit,
  onDelete,
  onPublish,
  onUnpublish,
  onViewResponses,
}: MySurveysListProps) => {
  if (surveys.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileEdit className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Aucune enquête créée</p>
        <p className="text-sm">Créez votre première enquête pour commencer</p>
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
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {survey.title}
                </h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  survey.status === 'active'
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {survey.status === 'active' ? 'Publié' : 'Brouillon'}
                </span>
              </div>
              {survey.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {survey.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Créé le {format(new Date(survey.created_at), 'dd MMM yyyy', { locale: fr })}
              </p>
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
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewResponses(survey)}>
                  <Users className="h-4 w-4 mr-2" />
                  Voir les réponses
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {survey.status === 'active' ? (
                  <DropdownMenuItem onClick={() => onUnpublish(survey.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Dépublier
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onPublish(survey.id)}>
                    <Send className="h-4 w-4 mr-2" />
                    Publier
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
                      Supprimer
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer l'enquête ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. L'enquête et toutes ses réponses seront supprimées définitivement.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => onDelete(survey.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Supprimer
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
