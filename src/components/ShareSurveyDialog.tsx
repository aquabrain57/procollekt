import { useState } from 'react';
import { Share2, Copy, Check, Link2, QrCode, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ShareSurveyDialogProps {
  surveyId: string;
  surveyTitle: string;
}

export const ShareSurveyDialog = ({ surveyId, surveyTitle }: ShareSurveyDialogProps) => {
  const [copied, setCopied] = useState(false);
  
  const surveyUrl = `${window.location.origin}/survey/${surveyId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(surveyUrl);
      setCopied(true);
      toast.success('Lien copié dans le presse-papiers');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erreur lors de la copie');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: surveyTitle,
          text: `Répondez à l'enquête: ${surveyTitle}`,
          url: surveyUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Partager
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Partager l'enquête
          </DialogTitle>
          <DialogDescription>
            Partagez ce lien avec vos enquêteurs de terrain pour qu'ils puissent collecter des données.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Input
              value={surveyUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button size="icon" variant="outline" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleShare} className="w-full">
              <Share2 className="h-4 w-4 mr-2" />
              Partager
            </Button>
            <Button variant="outline" onClick={() => window.open(surveyUrl, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir
            </Button>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="font-medium text-foreground mb-1">💡 Astuce</p>
            <p className="text-muted-foreground">
              Cette application fonctionne hors-ligne ! Les enquêteurs peuvent collecter des données même sans connexion internet. Les réponses seront synchronisées automatiquement.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
