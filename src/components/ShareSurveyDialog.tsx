import { useMemo, useState, useRef } from 'react';
import { Share2, Copy, Check, Link2, ExternalLink, Download, QrCode, Image, Maximize2 } from 'lucide-react';
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
import { getShareBaseUrl, APP_CONFIG } from '@/config/app';
import logoImage from '@/assets/youcollect-logo.png';

interface ShareSurveyDialogProps {
  surveyId: string;
  surveyTitle: string;
  surveyDescription?: string | null;
  coverImageUrl?: string | null;
}

export const ShareSurveyDialog = ({ surveyId, surveyTitle, surveyDescription, coverImageUrl }: ShareSurveyDialogProps) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showQROnly, setShowQROnly] = useState(false);
  const [showFullScreenQR, setShowFullScreenQR] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const fullScreenQrRef = useRef<HTMLDivElement>(null);

  // Use production URL for sharing
  const surveyUrl = useMemo(() => `${getShareBaseUrl()}/survey/${surveyId}`, [surveyId]);

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
        <DialogContent className="max-w-[95vw] sm:max-w-lg mx-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-center text-lg sm:text-xl font-bold">
              {t('share.scanToAccess', 'Scanner pour accéder')}
            </DialogTitle>
            <DialogDescription className="text-center text-sm line-clamp-2">
              {surveyTitle}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-4 sm:py-6" ref={fullScreenQrRef}>
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xl relative">
              <QRCodeCanvas 
                value={surveyUrl} 
                size={280}
                includeMargin 
                level="H"
                imageSettings={{
                  src: logoImage,
                  height: 50,
                  width: 50,
                  excavate: true,
                }}
              />
              {/* Brand name below QR */}
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="text-xs font-bold text-primary tracking-wider uppercase bg-white px-2">
                  {APP_CONFIG.appName}
                </span>
              </div>
            </div>
            
            {/* URL display */}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground break-all max-w-[250px] mx-auto">
                {surveyUrl}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => handleDownloadQR(fullScreenQrRef)} variant="outline" className="text-sm">
              <Download className="h-4 w-4 mr-2" />
              {t('share.download', 'Télécharger')}
            </Button>
            <Button onClick={() => handleShareQR(fullScreenQrRef)} className="text-sm">
              <Share2 className="h-4 w-4 mr-2" />
              {t('share.share', 'Partager')}
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowFullScreenQR(false)}
            className="w-full mt-2 text-xs"
          >
            ← {t('share.backToOptions', 'Retour aux options')}
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (showQROnly) {
    return (
      <Dialog open={showQROnly} onOpenChange={setShowQROnly}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <Share2 className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">{t('share.share', 'Partager')}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xs sm:max-w-sm mx-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-center text-base sm:text-lg">
              {t('share.scanToAccess', 'Scanner pour accéder')}
            </DialogTitle>
            <DialogDescription className="text-center text-xs sm:text-sm line-clamp-2">
              {surveyTitle}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-4" ref={qrRef}>
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-lg relative">
              <QRCodeCanvas 
                value={surveyUrl} 
                size={200}
                includeMargin 
                level="H"
                imageSettings={{
                  src: logoImage,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>
            <span className="mt-2 text-xs font-bold text-primary tracking-wider uppercase">
              {APP_CONFIG.appName}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => handleDownloadQR(qrRef)} variant="outline" size="sm" className="text-xs sm:text-sm">
              <Download className="h-4 w-4 mr-1" />
              {t('share.download', 'Télécharger')}
            </Button>
            <Button onClick={() => handleShareQR(qrRef)} size="sm" className="text-xs sm:text-sm">
              <Share2 className="h-4 w-4 mr-1" />
              {t('share.share', 'Partager')}
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowQROnly(false)}
            className="w-full mt-2 text-xs"
          >
            ← {t('share.backToOptions', 'Retour aux options')}
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
          <span className="hidden xs:inline">{t('share.share', 'Partager')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[92vw] sm:max-w-md mx-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Link2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span className="truncate">{t('share.shareSurvey', "Partager l'enquête")}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {surveyDescription ? (
              <span className="block mb-1 line-clamp-2">{surveyDescription}</span>
            ) : null}
            {t('share.shareWithEnumerators', 'Partagez ce lien avec vos enquêteurs.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Cover Image Thumbnail */}
          {coverImageUrl && (
            <div className="rounded-lg overflow-hidden border border-border bg-muted">
              <div className="flex items-center gap-3 p-2">
                <img 
                  src={coverImageUrl} 
                  alt="Aperçu" 
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-foreground">{surveyTitle}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Image className="h-3 w-3" />
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
              {t('share.share', 'Partager')}
            </Button>
            <Button variant="outline" onClick={() => window.open(surveyUrl, '_blank')} size="sm" className="text-xs sm:text-sm h-9">
              <ExternalLink className="h-4 w-4 mr-1" />
              {t('share.open', 'Ouvrir')}
            </Button>
          </div>

          {/* QR Code Section */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-foreground">QR Code</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowFullScreenQR(true)}
                className="text-xs h-7 px-2"
              >
                <Maximize2 className="h-3 w-3 mr-1" />
                {t('share.fullscreen', 'Plein écran')}
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3" ref={qrRef}>
              <div className="bg-white p-2 rounded-lg shadow-sm relative">
                <QRCodeCanvas 
                  value={surveyUrl} 
                  size={100}
                  includeMargin 
                  level="H"
                  imageSettings={{
                    src: logoImage,
                    height: 20,
                    width: 20,
                    excavate: true,
                  }}
                />
              </div>
              <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                <Button 
                  onClick={() => handleDownloadQR(qrRef)} 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 sm:flex-none text-xs h-8"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {t('share.download', 'Télécharger')}
                </Button>
                <Button 
                  onClick={() => handleShareQR(qrRef)} 
                  variant="outline"
                  size="sm" 
                  className="flex-1 sm:flex-none text-xs h-8"
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  {t('share.shareQR', 'Partager QR')}
                </Button>
              </div>
            </div>
            {/* Brand name */}
            <p className="text-center mt-2 text-xs font-bold text-primary tracking-wider uppercase">
              {APP_CONFIG.appName}
            </p>
          </div>

          {/* Production URL note */}
          <div className="bg-primary/5 rounded-lg p-2 sm:p-3 border border-primary/10">
            <p className="text-primary text-[10px] sm:text-xs flex items-center gap-1">
              <Check className="h-3 w-3" />
              {t('share.productionUrl', 'Lien optimisé pour le partage (youcollect.netlify.app)')}
            </p>
          </div>

          {/* Tip */}
          <div className="bg-muted/50 rounded-lg p-2 sm:p-3">
            <p className="text-muted-foreground text-[10px] sm:text-xs">
              💡 {t('share.offlineTip', "Cette application fonctionne hors-ligne ! Les enquêteurs peuvent collecter des données sans connexion.")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
