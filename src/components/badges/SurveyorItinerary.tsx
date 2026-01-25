import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Navigation, 
  RefreshCw, 
  Clock, 
  FileText, 
  Calendar,
  TrendingUp,
  Route,
  Activity,
  Map
} from 'lucide-react';
import { SurveyorBadge, useSurveyorBadges } from '@/hooks/useSurveyorBadges';
import { supabase } from '@/integrations/supabase/client';
import { SurveyorItineraryMap } from './SurveyorItineraryMap';

interface SurveyorLocation {
  id: string;
  badge_id: string;
  surveyor_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
  accuracy?: number;
}

interface FormSubmission {
  id: string;
  created_at: string;
  survey_id: string;
  survey_title?: string;
  location?: { latitude: number; longitude: number };
}

interface SurveyorItineraryProps {
  badge: SurveyorBadge;
}

export function SurveyorItinerary({ badge }: SurveyorItineraryProps) {
  const { updateLocation } = useSurveyorBadges();
  const [locations, setLocations] = useState<SurveyorLocation[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDistance: 0,
    todayForms: 0,
    weekForms: 0,
    totalForms: 0,
    averageFormsPerDay: 0,
  });

  useEffect(() => {
    fetchAllData();
    
    // Subscribe to realtime location updates
    const channel = supabase
      .channel(`itinerary-${badge.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'surveyor_locations',
          filter: `badge_id=eq.${badge.id}`,
        },
        (payload) => {
          const newLoc = payload.new as SurveyorLocation;
          setLocations(prev => [newLoc, ...prev.slice(0, 99)]);
          setCurrentPosition({ lat: newLoc.latitude, lng: newLoc.longitude });
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [badge.id]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchLocations(), fetchSubmissions()]);
    setLoading(false);
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('surveyor_locations')
        .select('*')
        .eq('badge_id', badge.id)
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setLocations(data as SurveyorLocation[]);
        if (data.length > 0) {
          setCurrentPosition({
            lat: data[0].latitude,
            lng: data[0].longitude
          });
          setLastUpdate(new Date(data[0].recorded_at));
        }
        
        // Calculate total distance
        if (data.length > 1) {
          let distance = 0;
          for (let i = 0; i < data.length - 1; i++) {
            distance += calculateDistance(
              data[i].latitude, data[i].longitude,
              data[i + 1].latitude, data[i + 1].longitude
            );
          }
          setStats(prev => ({ ...prev, totalDistance: distance }));
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select(`
          id,
          created_at,
          survey_id,
          location,
          surveys (title)
        `)
        .eq('badge_id', badge.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        const formattedData = data.map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          survey_id: item.survey_id,
          survey_title: item.surveys?.title,
          location: item.location,
        }));
        setSubmissions(formattedData);
        
        // Calculate stats
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const todayForms = formattedData.filter(s => new Date(s.created_at) >= today).length;
        const weekForms = formattedData.filter(s => new Date(s.created_at) >= weekAgo).length;
        
        // Calculate average (assume badge was created at least 1 day ago)
        const daysSinceCreation = Math.max(1, Math.ceil(
          (now.getTime() - new Date(badge.created_at).getTime()) / (24 * 60 * 60 * 1000)
        ));
        const avgPerDay = formattedData.length / daysSinceCreation;
        
        setStats(prev => ({
          ...prev,
          todayForms,
          weekForms,
          totalForms: formattedData.length,
          averageFormsPerDay: avgPerDay,
        }));
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  // Haversine formula to calculate distance between two GPS points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const startTracking = () => {
    if (!navigator.geolocation) return;
    setIsTracking(true);

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentPosition({ lat: latitude, lng: longitude });
        await updateLocation(badge.id, latitude, longitude);
        setLastUpdate(new Date());
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    (window as any).__trackingWatchId = watchId;
  };

  const stopTracking = () => {
    setIsTracking(false);
    const watchId = (window as any).__trackingWatchId;
    if (watchId !== undefined) {
      navigator.geolocation.clearWatch(watchId);
    }
  };

  const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-lg flex items-center gap-2">
          <Route className="w-5 h-5 text-primary" />
          Itinéraire & Activité
          <Badge variant="outline" className="ml-auto">
            {badge.first_name} {badge.last_name}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-primary/10 rounded-xl">
            <FileText className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-primary">{stats.totalForms}</p>
            <p className="text-[10px] text-muted-foreground">Total fiches</p>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-xl">
            <Calendar className="w-5 h-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{stats.todayForms}</p>
            <p className="text-[10px] text-muted-foreground">Aujourd'hui</p>
          </div>
          <div className="text-center p-3 bg-blue-500/10 rounded-xl">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">{stats.weekForms}</p>
            <p className="text-[10px] text-muted-foreground">Cette semaine</p>
          </div>
          <div className="text-center p-3 bg-violet-500/10 rounded-xl">
            <Activity className="w-5 h-5 mx-auto mb-1 text-violet-600" />
            <p className="text-2xl font-bold text-violet-600">{stats.averageFormsPerDay.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">Moy./jour</p>
          </div>
        </div>

        {/* Tracking Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <div>
              <p className="font-medium text-sm">{isTracking ? 'Suivi GPS actif' : 'Suivi inactif'}</p>
              {lastUpdate && (
                <p className="text-xs text-muted-foreground">
                  Dernière màj: {formatTime(lastUpdate)}
                </p>
              )}
            </div>
          </div>
          <Button
            variant={isTracking ? 'destructive' : 'default'}
            size="sm"
            onClick={isTracking ? stopTracking : startTracking}
          >
            <Navigation className="w-4 h-4 mr-1" />
            {isTracking ? 'Arrêter' : 'Démarrer'}
          </Button>
        </div>

        {/* Current Position */}
        {currentPosition && (
          <div className="p-3 border rounded-xl bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">Position actuelle</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Latitude: </span>
                <span className="font-mono text-xs">{currentPosition.lat.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Longitude: </span>
                <span className="font-mono text-xs">{currentPosition.lng.toFixed(6)}</span>
              </div>
            </div>
            {stats.totalDistance > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Distance parcourue: <strong>{stats.totalDistance.toFixed(2)} km</strong>
              </p>
            )}
          </div>
        )}

        {/* Tabs for History */}
        <Tabs defaultValue="map" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="map" className="text-xs">
              <Map className="w-3 h-3 mr-1" />
              Carte
            </TabsTrigger>
            <TabsTrigger value="forms" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              Fiches ({submissions.length})
            </TabsTrigger>
            <TabsTrigger value="gps" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              GPS ({locations.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="map" className="mt-3">
            <SurveyorItineraryMap 
              points={locations.map(l => ({
                latitude: l.latitude,
                longitude: l.longitude,
                recorded_at: l.recorded_at
              }))}
              isOnline={isTracking}
              surveyorName={`${badge.first_name} ${badge.last_name}`}
            />
          </TabsContent>
          
          <TabsContent value="forms" className="mt-3">
            <div className="max-h-60 overflow-y-auto space-y-2">
              {submissions.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">Aucun formulaire soumis</p>
              ) : (
                submissions.slice(0, 15).map((sub) => (
                  <div 
                    key={sub.id} 
                    className="flex items-start gap-2 p-2.5 bg-muted/30 rounded-lg"
                  >
                    <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sub.survey_title || 'Formulaire'}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(sub.created_at)}</p>
                    </div>
                    {sub.location && (
                      <MapPin className="w-3 h-3 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="gps" className="mt-3">
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="sm" onClick={fetchLocations}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Actualiser
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {locations.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">Aucun point GPS enregistré</p>
              ) : (
                locations.slice(0, 20).map((loc) => (
                  <div 
                    key={loc.id} 
                    className="flex items-center gap-2 p-2 bg-muted/20 rounded text-xs"
                  >
                    <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground whitespace-nowrap">{formatDate(loc.recorded_at)}</span>
                    <span className="font-mono text-muted-foreground truncate">
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
