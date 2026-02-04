import { useTranslation } from 'react-i18next';
import { CreditCard, ChevronRight, Crown, Check, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SubscriptionSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export const SubscriptionSection = ({ isExpanded, onToggle }: SubscriptionSectionProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Simulated subscription data
  const currentPlan: 'free' | 'starter' | 'pro' = 'free';
  const surveysUsed = 3;
  const surveysLimit = 5;
  const responsesUsed = 45;
  const responsesLimit = 100;

  const plans = [
    {
      id: 'free',
      name: 'Gratuit',
      price: '0€',
      period: '/mois',
      features: ['5 enquêtes', '100 réponses/mois', 'Support email'],
      current: true,
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '19€',
      period: '/mois',
      features: ['25 enquêtes', '1000 réponses/mois', 'API REST', 'Support prioritaire'],
      current: false,
      popular: true,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '49€',
      period: '/mois',
      features: ['Enquêtes illimitées', 'Réponses illimitées', 'API REST + Webhooks', 'Équipe illimitée', 'Support dédié'],
      current: false,
    },
  ];

  return (
    <Card className="border-border">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Crown className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Abonnement</CardTitle>
                  <CardDescription className="text-xs">Plan actuel: Gratuit</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Free</Badge>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Usage Stats */}
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Enquêtes</span>
                  <span className="font-medium">{surveysUsed}/{surveysLimit}</span>
                </div>
                <Progress value={(surveysUsed / surveysLimit) * 100} className="h-2" />
              </div>
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Réponses ce mois</span>
                  <span className="font-medium">{responsesUsed}/{responsesLimit}</span>
                </div>
                <Progress value={(responsesUsed / responsesLimit) * 100} className="h-2" />
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid gap-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`p-4 rounded-lg border transition-all ${
                    plan.current
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  } ${plan.popular ? 'ring-2 ring-primary/20' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{plan.name}</h4>
                        {plan.popular && (
                          <Badge className="bg-primary text-primary-foreground text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Populaire
                          </Badge>
                        )}
                      </div>
                      <p className="text-lg font-bold">
                        {plan.price}
                        <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
                      </p>
                    </div>
                    {plan.current ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary">Actuel</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant={plan.popular ? 'default' : 'outline'}
                        onClick={() => navigate('/pricing')}
                      >
                        Choisir
                      </Button>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Billing Info */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm font-medium">Moyen de paiement</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.info('Gestion des paiements à venir')}>
                Gérer
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
