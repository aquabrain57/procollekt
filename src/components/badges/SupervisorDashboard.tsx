import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  MapPin,
  Search,
  BarChart3,
  Clock,
  Eye
} from 'lucide-react';
import { useSurveyorBadges, SurveyorBadge } from '@/hooks/useSurveyorBadges';
import { useSurveyResponses } from '@/hooks/useSurveys';
import { BadgeCard } from './BadgeCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const SupervisorDashboard = () => {
  const { badges, loading } = useSurveyorBadges();
  const { responses } = useSurveyResponses();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<SurveyorBadge | null>(null);

  // Calculate stats per surveyor
  const surveyorStats = badges.map(badge => {
    const surveyorResponses = responses.filter(r => r.surveyor_id === badge.surveyor_id);
    const today = new Date().toDateString();
    const todayResponses = surveyorResponses.filter(r => 
      new Date(r.created_at).toDateString() === today
    );
    const validatedResponses = surveyorResponses.filter(r => r.surveyor_validated);
    const withLocation = surveyorResponses.filter(r => r.location);

    return {
      badge,
      totalResponses: surveyorResponses.length,
      todayResponses: todayResponses.length,
      validatedResponses: validatedResponses.length,
      withLocation: withLocation.length,
      lastActivity: surveyorResponses.length > 0 
        ? new Date(Math.max(...surveyorResponses.map(r => new Date(r.created_at).getTime())))
        : null,
    };
  });

  // Alerts
  const alerts = [
    ...badges.filter(b => b.status === 'suspended').map(b => ({
      type: 'warning' as const,
      message: `Badge suspendu: ${b.first_name} ${b.last_name}`,
      badge: b,
    })),
    ...badges.filter(b => b.status === 'expired').map(b => ({
      type: 'error' as const,
      message: `Badge expiré: ${b.first_name} ${b.last_name}`,
      badge: b,
    })),
  ];

  // Summary stats
  const totalSurveyors = badges.length;
  const activeSurveyors = badges.filter(b => b.status === 'active').length;
  const suspendedSurveyors = badges.filter(b => b.status === 'suspended').length;
  const totalValidatedResponses = responses.filter(r => r.surveyor_validated).length;

  const filteredStats = surveyorStats.filter(stat =>
    `${stat.badge.first_name} ${stat.badge.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stat.badge.surveyor_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSurveyors}</p>
                <p className="text-xs text-muted-foreground">Enquêteurs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSurveyors}</p>
                <p className="text-xs text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{suspendedSurveyors}</p>
                <p className="text-xs text-muted-foreground">Suspendus</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalValidatedResponses}</p>
                <p className="text-xs text-muted-foreground">Réponses validées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alertes ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  alert.type === 'error' ? 'bg-destructive/10' : 'bg-warning/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  {alert.type === 'error' ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                  <span className="text-sm">{alert.message}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBadge(alert.badge)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Surveyor Stats Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base">Statistiques par enquêteur</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucun enquêteur trouvé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStats.map((stat) => (
                <div
                  key={stat.badge.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {stat.badge.photo_url ? (
                        <img
                          src={stat.badge.photo_url}
                          alt={`${stat.badge.first_name} ${stat.badge.last_name}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-semibold text-primary">
                          {stat.badge.first_name[0]}{stat.badge.last_name[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {stat.badge.first_name} {stat.badge.last_name}
                        </span>
                        <Badge
                          variant={
                            stat.badge.status === 'active' ? 'default' :
                            stat.badge.status === 'suspended' ? 'secondary' : 'destructive'
                          }
                          className="text-xs"
                        >
                          {stat.badge.status === 'active' ? 'Actif' :
                           stat.badge.status === 'suspended' ? 'Suspendu' : 'Expiré'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ID: {stat.badge.surveyor_id}
                        {stat.badge.covered_zone && ` • Zone: ${stat.badge.covered_zone}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center hidden sm:block">
                      <p className="font-semibold">{stat.totalResponses}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center hidden md:block">
                      <p className="font-semibold">{stat.todayResponses}</p>
                      <p className="text-xs text-muted-foreground">Aujourd'hui</p>
                    </div>
                    <div className="text-center hidden md:block">
                      <div className="flex items-center gap-1 justify-center">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="font-semibold">{stat.withLocation}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">GPS</p>
                    </div>
                    <div className="text-center hidden lg:block">
                      <div className="flex items-center gap-1 justify-center text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">
                          {stat.lastActivity
                            ? format(stat.lastActivity, 'dd/MM HH:mm', { locale: fr })
                            : '-'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Dernière activité</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBadge(stat.badge)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Badge Detail Dialog */}
      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Profil enquêteur</DialogTitle>
          </DialogHeader>
          {selectedBadge && (
            <BadgeCard badge={selectedBadge} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
