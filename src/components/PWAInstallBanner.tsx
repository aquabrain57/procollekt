import { useState, useEffect, useCallback } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { APP_CONFIG } from '@/config/app';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if already installed
  useEffect(() => {
    const checkInstalled = () => {
      const installed = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;
      setIsInstalled(installed);
      return installed;
    };

    if (checkInstalled()) return;

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Check if dismissed recently (only for 1 hour on mobile for better conversion)
    const dismissedTime = localStorage.getItem('pwa_install_dismissed');
    if (dismissedTime) {
      const elapsed = Date.now() - parseInt(dismissedTime);
      const dismissDuration = ios ? 60 * 60 * 1000 : 6 * 60 * 60 * 1000; // 1 hour for iOS, 6 hours for Android
      if (elapsed < dismissDuration) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, show banner after a shorter delay (3 seconds)
    if (ios) {
      const timer = setTimeout(() => {
        if (!checkInstalled()) {
          setShowBanner(true);
        }
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Re-show banner periodically on iOS if not installed (every 10 seconds after dismissal)
  useEffect(() => {
    if (!isIOS || isInstalled) return;

    const interval = setInterval(() => {
      const dismissedTime = localStorage.getItem('pwa_install_dismissed');
      if (dismissedTime) {
        const elapsed = Date.now() - parseInt(dismissedTime);
        // Show again after 10 seconds on iOS
        if (elapsed >= 10 * 1000) {
          localStorage.removeItem('pwa_install_dismissed');
          setDismissed(false);
          setShowBanner(true);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isIOS, isInstalled]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  }, []);

  if (!showBanner || dismissed || isInstalled) return null;

  return (
    <Card className="fixed bottom-4 left-2 right-2 sm:left-4 sm:right-4 z-50 bg-background/98 backdrop-blur-md border-primary/40 shadow-xl animate-in slide-in-from-bottom-4">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
            <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-xs sm:text-sm">
              Installer {APP_CONFIG.appName}
            </h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">
              {isIOS ? (
                <>
                  <Share className="inline h-3 w-3 mr-0.5" />
                  Appuyez sur <strong>Partager</strong> puis <strong>"Sur l'écran d'accueil"</strong>
                </>
              ) : (
                "Installez pour un accès rapide et hors-ligne"
              )}
            </p>
            {!isIOS && deferredPrompt && (
              <Button 
                size="sm" 
                onClick={handleInstall}
                className="mt-2 h-7 sm:h-8 text-[10px] sm:text-xs px-3"
              >
                <Download className="h-3 w-3 mr-1" />
                Installer maintenant
              </Button>
            )}
            {isIOS && (
              <div className="mt-2 p-1.5 bg-muted/50 rounded text-[9px] sm:text-[10px] text-muted-foreground">
                📱 Safari → <Share className="inline h-2.5 w-2.5" /> → "Sur l'écran d'accueil"
              </div>
            )}
          </div>
          <button 
            onClick={handleDismiss}
            className="p-1 hover:bg-muted rounded-md transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};