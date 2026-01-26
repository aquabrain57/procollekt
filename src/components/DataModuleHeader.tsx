import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, AlertTriangle, Loader2, ScanLine, CheckCircle2 } from 'lucide-react';
import { DbSurvey } from '@/hooks/useSurveys';
import { toast } from 'sonner';
import { BadgeQRScanner } from '@/components/badges/BadgeQRScanner';
import { SurveyorBadge } from '@/hooks/useSurveyorBadges';

interface DataModuleHeaderProps {
  survey: DbSurvey;
  responsesCount: number;
  onDeleteAllResponses: () => Promise<boolean>;
}

export function DataModuleHeader({ survey, responsesCount, onDeleteAllResponses }: DataModuleHeaderProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const confirmPhrase = 'SUPPRIMER TOUT';

  const handleDeleteAll = async () => {
    if (confirmText !== confirmPhrase) {
      toast.error(`Veuillez taper "${confirmPhrase}" pour confirmer`);
      return;
    }

    setIsDeleting(true);
    try {
      const success = await onDeleteAllResponses();
      if (success) {
        toast.success('Toutes les réponses ont été supprimées');
        setDialogOpen(false);
        setConfirmText('');
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const [lastValidatedBadge, setLastValidatedBadge] = useState<SurveyorBadge | null>(null);

  const handleBadgeValidated = (badge: SurveyorBadge) => {
    setLastValidatedBadge(badge);
    toast.success(`Badge validé: ${badge.first_name} ${badge.last_name} (${badge.surveyor_id})`);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 p-4 bg-card rounded-lg border">
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold truncate">{survey.title}</h2>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>
            {survey.status === 'active' ? 'Actif' : survey.status === 'draft' ? 'Brouillon' : 'Archivé'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {responsesCount} réponse{responsesCount !== 1 ? 's' : ''}
          </span>
          {lastValidatedBadge && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {lastValidatedBadge.first_name} {lastValidatedBadge.last_name}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* QR Badge Scanner Button */}
        <BadgeQRScanner 
          onValidated={handleBadgeValidated}
          buttonVariant="outline"
          buttonSize="sm"
          buttonText="Scanner badge"
        />

        {responsesCount > 0 && (
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Effacer toutes les données</span>
                <span className="sm:hidden">Effacer tout</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Supprimer toutes les réponses
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    Cette action va <strong>supprimer définitivement</strong> toutes les {responsesCount} réponses 
                    collectées pour l'enquête "{survey.title}".
                  </p>
                  <div className="p-3 bg-destructive/10 rounded-lg text-sm">
                    <p className="font-medium text-destructive">⚠️ Données supprimées :</p>
                    <ul className="list-disc list-inside mt-1 text-muted-foreground">
                      <li>Toutes les réponses aux questions</li>
                      <li>Les coordonnées GPS associées</li>
                      <li>Les informations des enquêteurs</li>
                      <li>Les signatures de formulaires</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-delete" className="text-sm">
                      Tapez <strong className="text-destructive">{confirmPhrase}</strong> pour confirmer :
                    </Label>
                    <Input
                      id="confirm-delete"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                      placeholder={confirmPhrase}
                      className="font-mono"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText('')}>
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAll}
                  disabled={confirmText !== confirmPhrase || isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer tout
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
