import { useState } from 'react';
import { Check, X, Zap, Crown, Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PricingPlan {
  id: 'free' | 'starter' | 'pro';
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: { name: string; included: boolean; highlight?: boolean }[];
  limits: {
    surveys: number | 'Illimité';
    responses: number | 'Illimité';
    surveyors: number | 'Illimité';
  };
  icon: typeof Zap;
  popular?: boolean;
  cta: string;
}

const plans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Gratuit',
    description: 'Pour les organisations à but non lucratif et les tests',
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: Zap,
    cta: 'Commencer gratuitement',
    limits: {
      surveys: 5,
      responses: 500,
      surveyors: 5,
    },
    features: [
      { name: '5 enquêtes maximum', included: true },
      { name: '500 réponses/mois', included: true },
      { name: '5 enquêteurs', included: true },
      { name: 'Collecte hors-ligne', included: true },
      { name: 'Géolocalisation', included: true },
      { name: 'Exports basiques (CSV)', included: true },
      { name: 'Analyses IA avancées', included: false },
      { name: 'Rapports Premium', included: false },
      { name: 'API & Intégrations', included: false },
      { name: 'Multi-projets', included: false },
      { name: 'Marque blanche', included: false },
      { name: 'Support prioritaire', included: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Pour les équipes en croissance',
    monthlyPrice: 29,
    yearlyPrice: 23,
    icon: Crown,
    cta: 'Démarrer l\'essai',
    limits: {
      surveys: 25,
      responses: 5000,
      surveyors: 15,
    },
    features: [
      { name: '25 enquêtes', included: true },
      { name: '5 000 réponses/mois', included: true },
      { name: '15 enquêteurs', included: true },
      { name: 'Collecte hors-ligne', included: true },
      { name: 'Géolocalisation', included: true },
      { name: 'Exports avancés (Excel, PDF, Word)', included: true, highlight: true },
      { name: 'Analyses IA basiques', included: true, highlight: true },
      { name: 'Rapports Premium', included: true, highlight: true },
      { name: 'Badges enquêteurs QR Code', included: true, highlight: true },
      { name: 'API & Intégrations', included: false },
      { name: 'Multi-projets', included: false },
      { name: 'Marque blanche', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Pour les organisations exigeantes',
    monthlyPrice: 79,
    yearlyPrice: 59,
    icon: Building2,
    popular: true,
    cta: 'Passer au Pro',
    limits: {
      surveys: 'Illimité',
      responses: 'Illimité',
      surveyors: 'Illimité',
    },
    features: [
      { name: 'Enquêtes illimitées', included: true },
      { name: 'Réponses illimitées', included: true },
      { name: 'Enquêteurs illimités', included: true },
      { name: 'Collecte hors-ligne', included: true },
      { name: 'Géolocalisation avancée', included: true },
      { name: 'Tous les exports (+ PowerPoint)', included: true, highlight: true },
      { name: 'Analyses IA complètes', included: true, highlight: true },
      { name: 'Rapports personnalisés', included: true, highlight: true },
      { name: 'Badges enquêteurs + signatures', included: true, highlight: true },
      { name: 'API REST complète', included: true, highlight: true },
      { name: 'Multi-projets & équipes', included: true, highlight: true },
      { name: 'Marque blanche & personnalisation', included: true, highlight: true },
    ],
  },
];

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelectPlan = (planId: string) => {
    if (!user) {
      toast.info('Connectez-vous pour souscrire à un plan');
      navigate('/auth');
      return;
    }

    if (planId === 'free') {
      toast.success('Vous utilisez le plan Gratuit');
      navigate('/');
    } else {
      // For paid plans, show coming soon or integrate payment
      toast.info('Paiement en cours d\'intégration. Contactez-nous pour accès anticipé.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="outline" className="mb-4 border-primary/30">
            Tarification simple et transparente
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Choisissez votre plan YouCollect
          </h1>
          <p className="text-lg text-muted-foreground">
            Des solutions adaptées à toutes les tailles d'organisations, de la petite ONG aux grandes entreprises.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Label htmlFor="billing" className={!isYearly ? 'font-semibold' : 'text-muted-foreground'}>
            Mensuel
          </Label>
          <Switch
            id="billing"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label htmlFor="billing" className={isYearly ? 'font-semibold' : 'text-muted-foreground'}>
            Annuel
          </Label>
          {isYearly && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              -25% d'économie
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const Icon = plan.icon;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col transition-all duration-300 hover:shadow-xl ${
                  plan.popular
                    ? 'border-primary shadow-lg scale-105 z-10'
                    : 'hover:border-primary/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      Le plus populaire
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center ${
                    plan.popular 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-primary/10 text-primary'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">{price}€</span>
                      {plan.id !== 'free' && (
                        <span className="text-muted-foreground">/mois</span>
                      )}
                    </div>
                    {plan.id !== 'free' && isYearly && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Facturé {price * 12}€/an
                      </p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="grid grid-cols-3 gap-2 mb-6 p-3 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{plan.limits.surveys}</div>
                      <div className="text-xs text-muted-foreground">Enquêtes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{plan.limits.responses}</div>
                      <div className="text-xs text-muted-foreground">Rép./mois</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{plan.limits.surveyors}</div>
                      <div className="text-xs text-muted-foreground">Enquêteurs</div>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            feature.highlight ? 'text-green-500' : 'text-primary'
                          }`} />
                        ) : (
                          <X className="w-5 h-5 mt-0.5 flex-shrink-0 text-muted-foreground/40" />
                        )}
                        <span className={`text-sm ${
                          feature.included 
                            ? feature.highlight 
                              ? 'font-medium' 
                              : ''
                            : 'text-muted-foreground/60'
                        }`}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full group"
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-center mb-8">Questions fréquentes</h2>
          <div className="space-y-6">
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-2">Puis-je changer de plan à tout moment ?</h3>
              <p className="text-muted-foreground">
                Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. Les changements prennent effet immédiatement.
              </p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-2">Le plan Gratuit est-il vraiment gratuit ?</h3>
              <p className="text-muted-foreground">
                Absolument ! Le plan Gratuit est conçu pour les organisations à but non lucratif et les tests. Aucune carte de crédit requise.
              </p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-2">Comment fonctionnent les limites de réponses ?</h3>
              <p className="text-muted-foreground">
                Les limites sont réinitialisées chaque mois. Si vous atteignez la limite, vous pouvez upgrader ou attendre le mois suivant.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
