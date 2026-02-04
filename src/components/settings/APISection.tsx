import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Code, ChevronRight, Copy, Eye, EyeOff, RefreshCw, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface APISectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export const APISection = ({ isExpanded, onToggle }: APISectionProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Use user ID as a simple API key for demo
  const apiKey = user?.id || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
  const maskedKey = apiKey.slice(0, 8) + '••••••••••••••••••••••••';

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success('Clé API copiée dans le presse-papier');
  };

  const regenerateKey = () => {
    toast.info('Régénération de clé API disponible dans une prochaine version');
  };

  return (
    <Card className="border-border">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Code className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <CardTitle className="text-base">API & Intégrations</CardTitle>
                  <CardDescription className="text-xs">Connectez vos outils externes</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Pro</Badge>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* API Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Clé API</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={copyApiKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={showApiKey ? apiKey : maskedKey}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={regenerateKey}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* API Endpoints Info */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">Endpoints disponibles</p>
              <div className="space-y-1 text-xs text-muted-foreground font-mono">
                <p>GET /api-surveys - Liste des enquêtes</p>
                <p>POST /api-surveys - Créer une enquête</p>
                <p>GET /api-responses - Liste des réponses</p>
                <p>POST /api-responses - Soumettre une réponse</p>
              </div>
            </div>

            {/* Documentation Link */}
            <Button variant="outline" className="w-full" onClick={() => toast.info('Documentation API à venir')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Voir la documentation API
            </Button>

            {/* Webhooks */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Webhooks</span>
                <Badge variant="secondary">0 configuré</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Recevez des notifications en temps réel lorsque des événements se produisent
              </p>
              <Button variant="outline" size="sm" className="w-full" onClick={() => toast.info('Configuration webhooks à venir')}>
                Configurer un webhook
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
