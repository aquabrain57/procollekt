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

  // Get computed CSS color values for QR code (resolve HSL to actual colors)
  const qrColors = useMemo(() => {
    if (typeof window === 'undefined') return { fg: '#000000', bg: '#ffffff' };
    
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    // Get HSL values from CSS variables
    const primaryHsl = computedStyle.getPropertyValue('--primary').trim();
    const backgroundHsl = computedStyle.getPropertyValue('--background').trim();
    
    // Convert HSL to RGB hex
    const hslToHex = (hsl: string): string => {
      if (!hsl) return '#000000';
      const [h, s, l] = hsl.split(' ').map(v => parseFloat(v.replace('%', '')));
      
      const c = (1 - Math.abs(2 * l / 100 - 1)) * (s / 100);
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = l / 100 - c / 2;
      
      let r = 0, g = 0, b = 0;
      if (h < 60) { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      
      const toHex = (n: number) => {
        const hex = Math.round((n + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };
    
    return {
      fg: primaryHsl ? hslToHex(primaryHsl) : '#1a1a2e',
      bg: backgroundHsl ? hslToHex(backgroundHsl) : '#ffffff'
    };
  }, []);

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
        <DialogContent className="w-[92vw] max-w-xs mx-auto p-3 sm:p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-center text-sm sm:text-base font-bold truncate">
              {t('share.scanToAccess', 'Scanner pour accéder')}
            </DialogTitle>
            <DialogDescription className="text-center text-xs line-clamp-1 px-2">
              {surveyTitle}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-3" ref={fullScreenQrRef}>
            <div className="bg-background p-3 sm:p-4 rounded-xl shadow-lg border border-border">
              <QRCodeCanvas
                value={surveyUrl}
                size={Math.min(200, window.innerWidth - 100)}
                includeMargin
                level="H"
                fgColor="#000000"
                bgColor="#ffffff"
              />
            </div>
            
            {/* URL display */}
            <div className="mt-2 text-center w-full px-2">
              <p className="text-[9px] text-muted-foreground break-all line-clamp-2">
                {surveyUrl}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => handleDownloadQR(fullScreenQrRef)} variant="outline" size="sm" className="text-xs h-8">
              <Download className="h-3 w-3 mr-1" />
              {t('share.download', 'Télécharger')}
            </Button>
            <Button onClick={() => handleShareQR(fullScreenQrRef)} size="sm" className="text-xs h-8">
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
            className="w-full mt-1 text-xs h-7"
          >
            ← {t('share.backToOptions', 'Retour')}
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={mainDialogOpen} onOpenChange={setMainDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-8 px-2 sm:px-3">
          <Share2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
          <span className="hidden xs:inline">{t('share.share', 'Partager')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[92vw] max-w-sm mx-auto p-3 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Link2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="truncate">{t('share.shareSurvey', "Partager l'enquête")}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {surveyDescription && (
              <span className="block mb-1 line-clamp-1">{surveyDescription}</span>
            )}
            {t('share.shareWithEnumerators', 'Partagez ce lien avec vos enquêteurs.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 py-2">
          {/* Cover Image Thumbnail */}
          {coverImageUrl && (
            <div className="rounded-lg overflow-hidden border border-border bg-muted">
              <div className="flex items-center gap-2 p-2">
                <img 
                  src={coverImageUrl} 
                  alt="Aperçu" 
                  className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs truncate text-foreground">{surveyTitle}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t('share.illustrativeImage', 'Image illustrative')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* URL Copy */}
          <div className="flex items-center gap-1.5">
            <Input 
              value={surveyUrl} 
              readOnly 
              className="font-mono text-[9px] flex-1 min-w-0 h-8 px-2" 
            />
            <Button size="icon" variant="outline" onClick={handleCopy} className="flex-shrink-0 h-8 w-8">
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleShare} size="sm" className="text-xs h-8">
              <Share2 className="h-3 w-3 mr-1" />
              {t('share.share', 'Partager')}
            </Button>
            <Button variant="outline" onClick={() => window.open(surveyUrl, '_blank')} size="sm" className="text-xs h-8">
              <ExternalLink className="h-3 w-3 mr-1" />
              {t('share.open', 'Ouvrir')}
            </Button>
          </div>

          {/* QR Code Section - Compact */}
          <div className="rounded-lg border border-border bg-muted/30 p-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-foreground">QR Code</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setMainDialogOpen(false);
                  setTimeout(() => setShowFullScreenQR(true), 100);
                }}
                className="text-[10px] h-6 px-1.5"
              >
                <Maximize2 className="h-3 w-3 mr-0.5" />
                {t('share.fullscreen', 'Agrandir')}
              </Button>
            </div>
            <div className="flex items-center gap-2" ref={qrRef}>
              <div className="bg-background p-1.5 rounded-lg shadow-sm border border-border flex-shrink-0">
                <QRCodeCanvas
                  value={surveyUrl}
                  size={70}
                  includeMargin
                  level="H"
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <Button 
                  onClick={() => handleDownloadQR(qrRef)} 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-[10px] h-7"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {t('share.download', 'Télécharger')}
                </Button>
                <Button 
                  onClick={() => handleShareQR(qrRef)} 
                  variant="outline"
                  size="sm" 
                  className="w-full text-[10px] h-7"
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  {t('share.shareQR', 'Partager QR')}
                </Button>
              </div>
            </div>
          </div>

          {/* Production URL + Tip combined */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-primary flex items-center gap-0.5">
              <Check className="h-3 w-3" />
              youcollect.netlify.app
            </span>
            <span className="text-muted-foreground">• 💡 Hors-ligne OK</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};