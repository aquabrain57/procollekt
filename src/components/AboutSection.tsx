import { 
  Smartphone, 
  Globe, 
  MapPin, 
  BarChart3, 
  Users, 
  ShieldCheck,
  Wifi,
  WifiOff,
  Zap,
  FileSpreadsheet,
  UserCheck,
  Brain
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: WifiOff,
    title: 'Mode hors-ligne',
    description: 'Collectez des données même sans connexion Internet. Synchronisation automatique.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: MapPin,
    title: 'Géolocalisation GPS',
    description: 'Capturez automatiquement les coordonnées GPS de chaque réponse.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: UserCheck,
    title: 'Badges enquêteurs',
    description: 'Gérez vos équipes avec des badges QR code et suivi en temps réel.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Brain,
    title: 'Analyses IA',
    description: 'Obtenez des insights intelligents et des recommandations automatiques.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: FileSpreadsheet,
    title: 'Exports multiples',
    description: 'Exportez en Excel, PDF, Word, PowerPoint et CSV en un clic.',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    icon: ShieldCheck,
    title: 'Données sécurisées',
    description: 'Vos données sont chiffrées et stockées de manière sécurisée.',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
];

const stats = [
  { value: '99.9%', label: 'Disponibilité' },
  { value: '50+', label: 'Pays couverts' },
  { value: '1M+', label: 'Réponses collectées' },
  { value: '24/7', label: 'Support' },
];

export const AboutSection = () => {
  return (
    <section className="py-8 sm:py-12">
      {/* Hero */}
      <div className="text-center mb-8 sm:mb-12">
        <Badge variant="outline" className="mb-4 border-primary/30">
          À propos de Youcollect
        </Badge>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
          La plateforme de collecte de données{' '}
          <span className="text-primary">intelligente</span>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
          Youcollect est une solution complète pour la collecte de données sur le terrain. 
          Conçue pour les ONG, chercheurs, entreprises et institutions, elle permet de 
          créer, déployer et analyser des enquêtes avec une efficacité maximale.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 sm:mb-12">
        {stats.map((stat, idx) => (
          <Card key={idx} className="text-center">
            <CardContent className="pt-6 pb-4">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                {stat.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Features Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <Card key={idx} className="group hover:shadow-lg transition-all hover:border-primary/30">
              <CardContent className="pt-6">
                <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CTA */}
      <div className="text-center mt-8 sm:mt-12">
        <p className="text-sm text-muted-foreground">
          Rejoignez des milliers d'organisations qui font confiance à Youcollect pour leurs collectes de données.
        </p>
      </div>
    </section>
  );
};
