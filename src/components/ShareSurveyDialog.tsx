import { useMemo, useState, useRef } from 'react';
import { Share2, Copy, Check, Link2, ExternalLink, Download, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
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
  surveyDescription?: string | null;
}

export const ShareSurveyDialog = ({ surveyId, surveyTitle, surveyDescription }: ShareSurveyDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [showQROnly, setShowQROnly] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const surveyUrl = useMemo(() => `${window.location.origin}/survey/${surveyId}`, [surveyId]);

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
          text: surveyDescription || `Répondez à l'enquête: ${surveyTitle}`,
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

  const handleDownloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `qr-${surveyTitle.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR code téléchargé');
    }
  };

  const handleShareQR = async () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      try {
        canvas.toBlob(async (blob) => {
          if (blob && navigator.share) {
            const file = new File([blob], `qr-${surveyTitle}.png`, { type: 'image/png' });
            await navigator.share({
              title: `QR Code - ${surveyTitle}`,
              files: [file],
            });
          } else {
            handleDownloadQR();
          }
        }, 'image/png');
      } catch (err) {
        handleDownloadQR();
      }
    }
  };

  if (showQROnly) {
    return (
      <Dialog open={showQROnly} onOpenChange={setShowQROnly}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <Share2 className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Partager</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xs sm:max-w-sm mx-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-center text-base sm:text-lg">Scanner pour accéder</DialogTitle>
            <DialogDescription className="text-center text-xs sm:text-sm line-clamp-2">
              {surveyTitle}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-4" ref={qrRef}>
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-lg">
              <QRCodeCanvas 
                value={surveyUrl} 
                size={200}
                includeMargin 
                level="H"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleDownloadQR} variant="outline" size="sm" className="text-xs sm:text-sm">
              <Download className="h-4 w-4 mr-1" />
              Télécharger
            </Button>
            <Button onClick={handleShareQR} size="sm" className="text-xs sm:text-sm">
              <Share2 className="h-4 w-4 mr-1" />
              Partager
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowQROnly(false)}
            className="w-full mt-2 text-xs"
          >
            ← Retour aux options
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs sm:text-sm">
          <Share2 className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden xs:inline">Partager</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[92vw] sm:max-w-md mx-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Link2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span className="truncate">Partager l'enquête</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {surveyDescription ? (
              <span className="block mb-1 line-clamp-2">{surveyDescription}</span>
            ) : null}
            Partagez ce lien avec vos enquêteurs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* URL Copy */}
          <div className="flex items-center gap-2">
            <Input 
              value={surveyUrl} 
              readOnly 
              className="font-mono text-[10px] sm:text-xs flex-1 min-w-0 h-9" 
            />
            <Button size="icon" variant="outline" onClick={handleCopy} className="flex-shrink-0 h-9 w-9">
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleShare} size="sm" className="text-xs sm:text-sm h-9">
              <Share2 className="h-4 w-4 mr-1" />
              Partager
            </Button>
            <Button variant="outline" onClick={() => window.open(surveyUrl, '_blank')} size="sm" className="text-xs sm:text-sm h-9">
              <ExternalLink className="h-4 w-4 mr-1" />
              Ouvrir
            </Button>
          </div>

          {/* QR Code Section */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-foreground">QR Code</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowQROnly(true)}
                className="text-xs h-7 px-2"
              >
                <QrCode className="h-3 w-3 mr-1" />
                Plein écran
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3" ref={qrRef}>
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <QRCodeCanvas 
                  value={surveyUrl} 
                  size={100}
                  includeMargin 
                  level="H"
                />
              </div>
              <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                <Button 
                  onClick={handleDownloadQR} 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 sm:flex-none text-xs h-8"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Télécharger
                </Button>
                <Button 
                  onClick={handleShareQR} 
                  variant="outline"
                  size="sm" 
                  className="flex-1 sm:flex-none text-xs h-8"
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  Partager QR
                </Button>
              </div>
            </div>
          </div>

          {/* Tip */}
          <div className="bg-muted/50 rounded-lg p-2 sm:p-3">
            <p className="text-muted-foreground text-[10px] sm:text-xs">
              💡 Cette application fonctionne hors-ligne ! Les enquêteurs peuvent collecter des données sans connexion.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
