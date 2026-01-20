import { useMemo, useState, useRef } from 'react';
import { Share2, Copy, Check, Link2, ExternalLink, Download, Maximize2, X } from 'lucide-react';
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
import { useTranslation } from 'react-i18next';
import { getSurveyUrl, APP_CONFIG } from '@/config/app';

interface ShareSurveyDialogProps {
  surveyId: string;
  surveyTitle: string;
  surveyDescription?: string | null;
  coverImageUrl?: string | null;
}

export const ShareSurveyDialog = ({ surveyId, surveyTitle, surveyDescription, coverImageUrl }: ShareSurveyDialogProps) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showFullScreenQR, setShowFullScreenQR] = useState(false);
  const [mainDialogOpen, setMainDialogOpen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const fullScreenQrRef = useRef<HTMLDivElement>(null);

  // Always use production URL for sharing
  const surveyUrl = useMemo(() => getSurveyUrl(surveyId), [surveyId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(surveyUrl);
      setCopied(true);
      toast.success(t('share.linkCopied', 'Lien copié dans le presse-papiers'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(t('share.copyError', 'Erreur lors de la copie'));
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: surveyTitle,
          text: surveyDescription || `${t('share.respondTo', "Répondez à l'enquête")}: ${surveyTitle}`,
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

  const handleDownloadQR = (ref: React.RefObject<HTMLDivElement>) => {
    const canvas = ref.current?.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `qr-${surveyTitle.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success(t('share.qrDownloaded', 'QR code téléchargé'));
    }
  };

  const handleShareQR = async (ref: React.RefObject<HTMLDivElement>) => {
    const canvas = ref.current?.querySelector('canvas');
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
            handleDownloadQR(ref);
          }
        }, 'image/png');
      } catch (err) {
        handleDownloadQR(ref);
      }
    }
  };

  // Full screen QR code dialog
  if (showFullScreenQR) {
    return (
      <Dialog open={showFullScreenQR} onOpenChange={setShowFullScreenQR}>
        <DialogContent className="w-[95vw] max-w-sm mx-auto p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-center text-base sm:text-lg font-bold">
              {t('share.scanToAccess', 'Scanner pour accéder')}
            </DialogTitle>
            <DialogDescription className="text-center text-xs sm:text-sm line-clamp-2">
              {surveyTitle}
            </DialogDescription>
          </DialogHeader>
          
           <div className="flex flex-col items-center py-4" ref={fullScreenQrRef}>
             <div className="bg-background p-4 rounded-xl shadow-xl border border-border">
               <QRCodeCanvas
                 value={surveyUrl}
                 size={240}
                 includeMargin
                 level="H"
                 fgColor="hsl(var(--primary))"
                 bgColor="hsl(var(--background))"
               />
             </div>
            
            {/* URL display */}
            <div className="mt-3 text-center">
              <p className="text-[10px] text-muted-foreground break-all max-w-[200px] mx-auto">
                {surveyUrl}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => handleDownloadQR(fullScreenQrRef)} variant="outline" size="sm" className="text-xs h-9">
              <Download className="h-3 w-3 mr-1" />
              {t('share.download', 'Télécharger')}
            </Button>
            <Button onClick={() => handleShareQR(fullScreenQrRef)} size="sm" className="text-xs h-9">
              <Share2 className="h-3 w-3 mr-1" />
              {t('share.share', 'Partager')}
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setShowFullScreenQR(false);
              setMainDialogOpen(true);
            }}
            className="w-full mt-1 text-xs h-8"
          >
            ← {t('share.backToOptions', 'Retour aux options')}
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={mainDialogOpen} onOpenChange={setMainDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
          <Share2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
          <span className="hidden xs:inline">{t('share.share', 'Partager')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md mx-auto p-3 sm:p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Link2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="truncate">{t('share.shareSurvey', "Partager l'enquête")}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {surveyDescription && (
              <span className="block mb-1 line-clamp-2">{surveyDescription}</span>
            )}
            {t('share.shareWithEnumerators', 'Partagez ce lien avec vos enquêteurs.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Cover Image Thumbnail */}
          {coverImageUrl && (
            <div className="rounded-lg overflow-hidden border border-border bg-muted">
              <div className="flex items-center gap-2 p-2">
                <img 
                  src={coverImageUrl} 
                  alt="Aperçu" 
                  className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate text-foreground">{surveyTitle}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    {t('share.illustrativeImage', 'Image illustrative incluse')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* URL Copy */}
          <div className="flex items-center gap-2">
            <Input 
              value={surveyUrl} 
              readOnly 
              className="font-mono text-[9px] sm:text-xs flex-1 min-w-0 h-8 sm:h-9" 
            />
            <Button size="icon" variant="outline" onClick={handleCopy} className="flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9">
              {copied ? (
                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleShare} size="sm" className="text-xs h-8 sm:h-9">
              <Share2 className="h-3 w-3 mr-1" />
              {t('share.share', 'Partager')}
            </Button>
            <Button variant="outline" onClick={() => window.open(surveyUrl, '_blank')} size="sm" className="text-xs h-8 sm:h-9">
              <ExternalLink className="h-3 w-3 mr-1" />
              {t('share.open', 'Ouvrir')}
            </Button>
          </div>

          {/* QR Code Section - More compact on mobile */}
          <div className="rounded-lg border border-border bg-muted/30 p-2 sm:p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-foreground">QR Code</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setMainDialogOpen(false);
                  setTimeout(() => setShowFullScreenQR(true), 100);
                }}
                className="text-[10px] h-6 px-2"
              >
                <Maximize2 className="h-3 w-3 mr-1" />
                {t('share.fullscreen', 'Agrandir')}
              </Button>
            </div>
            <div className="flex items-center gap-2 sm:gap-3" ref={qrRef}>
               <div className="bg-background p-1.5 sm:p-2 rounded-lg shadow-sm border border-border flex-shrink-0">
                 <QRCodeCanvas
                   value={surveyUrl}
                   size={88}
                   includeMargin
                   level="H"
                   fgColor="hsl(var(--primary))"
                   bgColor="hsl(var(--background))"
                 />
               </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <Button 
                  onClick={() => handleDownloadQR(qrRef)} 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-[10px] sm:text-xs h-7 sm:h-8"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {t('share.download', 'Télécharger')}
                </Button>
                <Button 
                  onClick={() => handleShareQR(qrRef)} 
                  variant="outline"
                  size="sm" 
                  className="w-full text-[10px] sm:text-xs h-7 sm:h-8"
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  {t('share.shareQR', 'Partager QR')}
                </Button>
              </div>
            </div>
             
          </div>

          {/* Production URL note */}
          <div className="bg-primary/5 rounded-lg p-2 border border-primary/10">
            <p className="text-primary text-[10px] flex items-center gap-1">
              <Check className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{t('share.productionUrl', 'Lien: youcollect.netlify.app')}</span>
            </p>
          </div>

          {/* Tip */}
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-muted-foreground text-[10px]">
              💡 {t('share.offlineTip', "Fonctionne hors-ligne !")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};