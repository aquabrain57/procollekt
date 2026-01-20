import { useState, useEffect } from 'react';
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
  Eye,
  Navigation,
  Radio
} from 'lucide-react';
import { useSurveyorBadges, SurveyorBadge } from '@/hooks/useSurveyorBadges';
import { useSurveyResponses } from '@/hooks/useSurveys';
import { BadgeCard } from './BadgeCard';
import { SurveyorTracking } from './SurveyorTracking';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeLocation {
  badge_id: string;
  surveyor_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
}

export const SupervisorDashboard = () => {
  const { badges, loading } = useSurveyorBadges();
  const { responses } = useSurveyResponses();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<SurveyorBadge | null>(null);
  const [dialogTab, setDialogTab] = useState<'profile' | 'tracking'>('profile');
  const [realtimeLocations, setRealtimeLocations] = useState<Record<string, RealtimeLocation>>({});

  // Subscribe to realtime location updates
  useEffect(() => {
    const channel = supabase
      .channel('supervisor-locations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'surveyor_locations',
        },
        (payload) => {
          const loc = payload.new as RealtimeLocation;
          setRealtimeLocations(prev => ({
            ...prev,
            [loc.badge_id]: loc
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate stats per surveyor
  const surveyorStats = badges.map(badge => {
    const surveyorResponses = responses.filter(r => r.surveyor_id === badge.surveyor_id);
    const today = new Date().toDateString();
    const todayResponses = surveyorResponses.filter(r => 
      new Date(r.created_at).toDateString() === today
    );
    const validatedResponses = surveyorResponses.filter(r => r.surveyor_validated);
    const withLocation = surveyorResponses.filter(r => r.location);

    // Check if surveyor has recent location (last 15 minutes)
    const realtimeLoc = realtimeLocations[badge.id];
    const isOnline = realtimeLoc && 
      (new Date().getTime() - new Date(realtimeLoc.recorded_at).getTime()) < 15 * 60 * 1000;

    return {
      badge,
      totalResponses: surveyorResponses.length,
      todayResponses: todayResponses.length,
      validatedResponses: validatedResponses.length,
      withLocation: withLocation.length,
      isOnline,
      lastLocation: realtimeLoc,
      lastActivity: surveyorResponses.length > 0 
        ? new Date(Math.max(...surveyorResponses.map(r => new Date(r.created_at).getTime())))
        : null,
    };
  });

  const onlineSurveyors = surveyorStats.filter(s => s.isOnline).length;

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{totalSurveyors}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Enquêteurs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-success/10">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{activeSurveyors}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/20">
                <Radio className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 animate-pulse" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{onlineSurveyors}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">En ligne</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hidden sm:block">
          <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{suspendedSurveyors}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Suspendus</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hidden sm:block">
          <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{totalValidatedResponses}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Rép. validées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alertes ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                  alert.type === 'error' ? 'bg-destructive/10' : 'bg-warning/10'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {alert.type === 'error' ? (
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm truncate">{alert.message}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 flex-shrink-0"
                  onClick={() => {
                    setSelectedBadge(alert.badge);
                    setDialogTab('profile');
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Surveyor Stats */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <CardTitle className="text-sm sm:text-base">Statistiques par enquêteur</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Aucun enquêteur trouvé</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {filteredStats.map((stat) => (
                <div
                  key={stat.badge.id}
                  className="flex items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative flex-shrink-0">
                      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {stat.badge.photo_url ? (
                          <img
                            src={stat.badge.photo_url}
                            alt={`${stat.badge.first_name} ${stat.badge.last_name}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-semibold text-primary text-xs sm:text-sm">
                            {stat.badge.first_name[0]}{stat.badge.last_name[0]}
                          </span>
                        )}
                      </div>
                      {/* Online indicator */}
                      {stat.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {stat.badge.first_name} {stat.badge.last_name}
                        </span>
                        <Badge
                          variant={
                            stat.badge.status === 'active' ? 'default' :
                            stat.badge.status === 'suspended' ? 'secondary' : 'destructive'
                          }
                          className="text-[10px] h-5"
                        >
                          {stat.badge.status === 'active' ? 'Actif' :
                           stat.badge.status === 'suspended' ? 'Suspendu' : 'Expiré'}
                        </Badge>
                        {stat.isOnline && (
                          <Badge className="text-[10px] h-5 bg-green-500/20 text-green-600 border-green-500/30">
                            <Radio className="h-2 w-2 mr-1" />
                            En ligne
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        ID: {stat.badge.surveyor_id}
                        {stat.badge.covered_zone && ` • ${stat.badge.covered_zone}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 text-sm flex-shrink-0">
                    <div className="text-center hidden sm:block">
                      <p className="font-semibold text-sm">{stat.totalResponses}</p>
                      <p className="text-[10px] text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center block sm:hidden">
                      <p className="font-semibold text-sm">{stat.totalResponses}</p>
                      <p className="text-[10px] text-muted-foreground">Form.</p>
                    </div>
                    <div className="text-center hidden md:block">
                      <p className="font-semibold text-sm">{stat.todayResponses}</p>
                      <p className="text-[10px] text-muted-foreground">Aujourd'hui</p>
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
                      <p className="text-[10px] text-muted-foreground">Dernière act.</p>
                    </div>
                    <div className="flex gap-1">
                      {stat.isOnline && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedBadge(stat.badge);
                            setDialogTab('tracking');
                          }}
                        >
                          <Navigation className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setSelectedBadge(stat.badge);
                          setDialogTab('profile');
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Badge Detail Dialog with Tabs */}
      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBadge?.first_name} {selectedBadge?.last_name}
            </DialogTitle>
          </DialogHeader>
          {selectedBadge && (
            <Tabs value={dialogTab} onValueChange={(v) => setDialogTab(v as 'profile' | 'tracking')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile" className="text-xs sm:text-sm">
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Profil
                </TabsTrigger>
                <TabsTrigger value="tracking" className="text-xs sm:text-sm">
                  <Navigation className="h-3.5 w-3.5 mr-1.5" />
                  Suivi GPS
                </TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="mt-4">
                <BadgeCard badge={selectedBadge} />
              </TabsContent>
              <TabsContent value="tracking" className="mt-4">
                <SurveyorTracking badge={selectedBadge} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
