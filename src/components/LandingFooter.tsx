import { Download, ExternalLink, Heart, Mail, Globe, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_CONFIG } from '@/config/app';

export const LandingFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              {APP_CONFIG.appName}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Application professionnelle de collecte de données terrain avec intelligence artificielle.
              Travaillez hors ligne, synchronisez automatiquement, analysez vos données en temps réel.
            </p>
          </div>

          {/* Download Apps */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Télécharger l'application
            </h3>
            <div className="flex flex-col gap-3">
              {/* Google Play Store */}
              <a 
                href="https://play.google.com/store" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-muted hover:bg-muted/80 rounded-xl p-3 transition-colors group"
              >
                <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 9.991l-2.302 2.302-8.634-8.635z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Télécharger sur</span>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Google Play</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>

              {/* Apple App Store */}
              <a 
                href="https://apps.apple.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-muted hover:bg-muted/80 rounded-xl p-3 transition-colors group"
              >
                <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Télécharger sur</span>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">App Store</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          </div>

          {/* Contact & Links */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Contact
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <a href="mailto:contact@youcollect.app" className="hover:text-primary transition-colors">
                  contact@youcollect.app
                </a>
              </p>
              <div className="flex gap-4 pt-2">
                <a 
                  href="/pricing" 
                  className="text-sm hover:text-primary transition-colors"
                >
                  Tarifs
                </a>
                <a 
                  href="#" 
                  className="text-sm hover:text-primary transition-colors"
                >
                  Documentation
                </a>
                <a 
                  href="#" 
                  className="text-sm hover:text-primary transition-colors"
                >
                  API
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {currentYear} {APP_CONFIG.appName}. Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Fait avec <Heart className="h-3 w-3 text-red-500 fill-red-500" /> pour les professionnels du terrain
          </p>
        </div>
      </div>
    </footer>
  );
};
