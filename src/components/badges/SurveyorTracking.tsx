import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, RefreshCw, Clock } from 'lucide-react';
import { SurveyorBadge, useSurveyorBadges } from '@/hooks/useSurveyorBadges';
import { supabase } from '@/integrations/supabase/client';

interface SurveyorLocation {
  id: string;
  badge_id: string;
  surveyor_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
}

interface SurveyorTrackingProps {
  badge: SurveyorBadge;
}

export function SurveyorTracking({ badge }: SurveyorTrackingProps) {
  const { updateLocation } = useSurveyorBadges();
  const [locations, setLocations] = useState<SurveyorLocation[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    fetchLocations();
    
    // Subscribe to realtime location updates
    const channel = supabase
      .channel(`locations-${badge.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'surveyor_locations',
          filter: `badge_id=eq.${badge.id}`,
        },
        (payload) => {
          setLocations(prev => [payload.new as SurveyorLocation, ...prev.slice(0, 49)]);
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [badge.id]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('surveyor_locations')
        .select('*')
        .eq('badge_id', badge.id)
        .order('recorded_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setLocations(data as SurveyorLocation[]);
        if (data.length > 0) {
          setCurrentPosition({
            lat: data[0].latitude,
            lng: data[0].longitude
          });
          setLastUpdate(new Date(data[0].recorded_at));
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

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
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );

    // Store watch ID for cleanup
    (window as any).__trackingWatchId = watchId;
  };

  const stopTracking = () => {
    setIsTracking(false);
    const watchId = (window as any).__trackingWatchId;
    if (watchId !== undefined) {
      navigator.geolocation.clearWatch(watchId);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Navigation className="w-5 h-5 text-primary" />
          Suivi de position
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <div>
              <p className="font-medium text-sm">
                {isTracking ? 'Suivi actif' : 'Suivi inactif'}
              </p>
              {lastUpdate && (
                <p className="text-xs text-muted-foreground">
                  Dernière mise à jour: {formatTime(lastUpdate)}
                </p>
              )}
            </div>
          </div>
          <Button
            variant={isTracking ? 'destructive' : 'default'}
            size="sm"
            onClick={isTracking ? stopTracking : startTracking}
          >
            {isTracking ? 'Arrêter' : 'Démarrer'}
          </Button>
        </div>

        {/* Current Position */}
        {currentPosition && (
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Position actuelle</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Lat: </span>
                <span className="font-mono">{currentPosition.lat.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Lng: </span>
                <span className="font-mono">{currentPosition.lng.toFixed(6)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <p className="text-2xl font-bold text-primary">{badge.forms_submitted || 0}</p>
            <p className="text-xs text-muted-foreground">Formulaires</p>
          </div>
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <p className="text-2xl font-bold text-primary">{locations.length}</p>
            <p className="text-xs text-muted-foreground">Points GPS</p>
          </div>
        </div>

        {/* Location History */}
        {locations.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Historique récent</span>
              <Button variant="ghost" size="sm" onClick={fetchLocations}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {locations.slice(0, 10).map((loc, idx) => (
                <div 
                  key={loc.id} 
                  className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs"
                >
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{formatDate(loc.recorded_at)}</span>
                  <span className="font-mono text-muted-foreground">
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
