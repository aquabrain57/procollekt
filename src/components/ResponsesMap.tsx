import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import DOMPurify from 'dompurify';
import { DbSurveyResponse, DbSurveyField } from '@/hooks/useSurveys';
import { MapPin, AlertCircle, Globe, Navigation, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ResponsesMapProps {
  responses: DbSurveyResponse[];
  fields: DbSurveyField[];
}

// Public Mapbox token for demo (limited usage)
const DEFAULT_MAPBOX_TOKEN = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

export const ResponsesMap = ({ responses, fields }: ResponsesMapProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'fr' ? fr : enUS;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'checking' | 'valid' | 'invalid' | 'missing'>('checking');

  // Filter and memoize geo responses
  const geoResponses = useMemo(() => 
    responses.filter(r => 
      r.location && 
      typeof r.location.latitude === 'number' && 
      typeof r.location.longitude === 'number' &&
      !isNaN(r.location.latitude) &&
      !isNaN(r.location.longitude) &&
      Math.abs(r.location.latitude) <= 90 &&
      Math.abs(r.location.longitude) <= 180
    ),
    [responses]
  );

  // Calculate geographic stats
  const geoStats = useMemo(() => {
    if (geoResponses.length === 0) return null;

    const latitudes = geoResponses.map(r => r.location!.latitude);
    const longitudes = geoResponses.map(r => r.location!.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    // Group by approximate zones
    const zones: Record<string, { count: number; lat: number; lng: number }> = {};
    geoResponses.forEach(r => {
      const lat = Math.round(r.location!.latitude * 100) / 100;
      const lng = Math.round(r.location!.longitude * 100) / 100;
      const key = `${lat},${lng}`;
      if (!zones[key]) {
        zones[key] = { count: 0, lat, lng };
      }
      zones[key].count++;
    });

    const sortedZones = Object.entries(zones)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([key, data]) => ({
        coords: key,
        ...data,
        percentage: Math.round((data.count / geoResponses.length) * 100),
      }));

    return {
      total: geoResponses.length,
      bounds: { minLat, maxLat, minLng, maxLng },
      center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2] as [number, number],
      zonesCount: Object.keys(zones).length,
      topZones: sortedZones,
    };
  }, [geoResponses]);

  // Get token - try env first, then fallback to public demo token
  const getMapboxToken = (): string | null => {
    // First try VITE_MAPBOX_TOKEN from env
    const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
    if (envToken && envToken !== 'undefined' && envToken.trim() !== '' && envToken.startsWith('pk.')) {
      return envToken;
    }
    
    // Use public fallback token for basic map functionality
    return DEFAULT_MAPBOX_TOKEN;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || geoResponses.length === 0) {
      setIsLoading(false);
      return;
    }

    const token = getMapboxToken();
    
    if (!token) {
      setTokenStatus('missing');
      setMapError('Token Mapbox non disponible');
      setIsLoading(false);
      return;
    }

    setTokenStatus('checking');

    try {
      mapboxgl.accessToken = token;

      // Calculate center and zoom from data
      let center: [number, number] = geoStats?.center || [1.2255, 6.1375];
      let zoom = 6;

      if (geoStats && geoStats.bounds) {
        const latSpread = geoStats.bounds.maxLat - geoStats.bounds.minLat;
        const lngSpread = geoStats.bounds.maxLng - geoStats.bounds.minLng;
        const spread = Math.max(latSpread, lngSpread);
        
        if (spread < 0.01) zoom = 14;
        else if (spread < 0.1) zoom = 12;
        else if (spread < 0.5) zoom = 10;
        else if (spread < 1) zoom = 9;
        else if (spread < 2) zoom = 8;
        else if (spread < 5) zoom = 7;
        else zoom = 5;
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center,
        zoom,
        attributionControl: false,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        'top-right'
      );

      map.current.addControl(
        new mapboxgl.FullscreenControl(),
        'top-right'
      );

      map.current.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        'bottom-left'
      );

      map.current.on('load', () => {
        setIsLoading(false);
        setMapReady(true);
        setTokenStatus('valid');
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        const errorData = e as any;
        if (errorData?.error?.status === 401 || errorData?.error?.status === 403) {
          setTokenStatus('invalid');
          setMapError('Token Mapbox invalide. Vérifiez votre configuration.');
        } else {
          setMapError('Erreur de chargement de la carte');
        }
        setIsLoading(false);
      });

    } catch (error: any) {
      console.error('Map initialization error:', error);
      setMapError(error.message || 'Erreur lors du chargement de la carte');
      setTokenStatus('invalid');
      setIsLoading(false);
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
      setMapReady(false);
    };
  }, [geoResponses.length > 0, geoStats?.center?.[0], geoStats?.center?.[1]]);

  // Update markers when responses change
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    geoResponses.forEach((response) => {
      if (!response.location) return;

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `
        <div style="
          background: linear-gradient(135deg, hsl(217, 91%, 50%), hsl(271, 81%, 56%));
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          border: 2px solid white;
          cursor: pointer;
          transition: transform 0.2s;
        ">
          <svg style="transform: rotate(45deg); width: 14px; height: 14px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="10" r="3"></circle>
            <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 11.5 7.3 11.8a1 1 0 0 0 1.4 0C13 21.5 20 15.4 20 10a8 8 0 0 0-8-8z"></path>
          </svg>
        </div>
      `;

      // Build popup content
      const firstFields = fields.slice(0, 3);
      const fieldHtml = firstFields.map(field => {
        const value = response.data[field.id];
        if (value === undefined || value === null || value === '') return '';
        const displayValue = Array.isArray(value) ? value.join(', ') : value.toString();
        const sanitizedLabel = DOMPurify.sanitize(field.label);
        const sanitizedValue = DOMPurify.sanitize(displayValue.slice(0, 50));
        return `<div style="margin-bottom: 6px; font-size: 13px;"><strong style="color: #374151;">${sanitizedLabel}:</strong> <span style="color: #6b7280;">${sanitizedValue}</span></div>`;
      }).filter(Boolean).join('');

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 220px; padding: 4px;">
          <div style="font-weight: 600; margin-bottom: 8px; color: #6366f1; font-size: 14px; display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
            ${format(new Date(response.created_at), "dd MMM yyyy 'à' HH:mm", { locale: dateLocale })}
          </div>
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 10px; padding: 6px 8px; background: #f3f4f6; border-radius: 6px; font-family: monospace;">
            📍 ${response.location.latitude.toFixed(5)}, ${response.location.longitude.toFixed(5)}
          </div>
          ${fieldHtml ? `<div style="border-top: 1px solid #e5e7eb; padding-top: 10px;">${fieldHtml}</div>` : ''}
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '300px',
      }).setHTML(popupContent);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([response.location.longitude, response.location.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [geoResponses, fields, dateLocale, mapReady]);

  // No geo responses
  if (geoResponses.length === 0) {
    return (
      <div className="h-[400px] bg-gradient-to-br from-muted/30 to-muted/50 rounded-xl flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-muted">
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          <MapPin className="h-10 w-10 opacity-40" />
        </div>
        <p className="font-medium text-base">{t('map.noGeoResponses')}</p>
        <p className="text-sm mt-1 text-center max-w-xs">{t('map.noGeoResponsesDesc')}</p>
      </div>
    );
  }

  // Map error or no token - show enhanced fallback with stats
  if (mapError || tokenStatus === 'invalid' || tokenStatus === 'missing') {
    return (
      <div className="space-y-4">
        {/* Error notice */}
        <Alert variant="destructive" className="border-amber-500/30 bg-amber-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Carte non disponible</AlertTitle>
          <AlertDescription className="text-sm">
            {tokenStatus === 'missing' && 'Token Mapbox non configuré. '}
            {tokenStatus === 'invalid' && 'Token Mapbox invalide. '}
            Les données sont affichées en mode liste ci-dessous.
          </AlertDescription>
        </Alert>

        {/* Stats summary */}
        {geoStats && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{geoStats.total}</p>
                <p className="text-xs text-muted-foreground">Géolocalisées</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{geoStats.zonesCount}</p>
                <p className="text-xs text-muted-foreground">Zones</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round((geoStats.total / responses.length) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">Taux GPS</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top zones */}
        {geoStats && geoStats.topZones.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Top {geoStats.topZones.length} zones géographiques
              </h4>
              <div className="space-y-3">
                {geoStats.topZones.map((zone, idx) => (
                  <div key={zone.coords} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={idx === 0 ? 'default' : 'secondary'} className="text-[10px]">
                          #{idx + 1}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {zone.lat.toFixed(3)}, {zone.lng.toFixed(3)}
                        </span>
                      </div>
                      <span className="font-medium">{zone.count} rép. ({zone.percentage}%)</span>
                    </div>
                    <Progress value={zone.percentage} className="h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location list */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" />
              Liste des positions ({geoResponses.length})
            </h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {geoResponses.slice(0, 20).map((response, idx) => (
                <div 
                  key={response.id} 
                  className="flex items-center justify-between text-xs p-2.5 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">#{idx + 1}</span>
                    <span className="text-muted-foreground">
                      {format(new Date(response.created_at), "dd/MM/yy HH:mm", { locale: dateLocale })}
                    </span>
                  </div>
                  <span className="font-mono text-muted-foreground bg-background px-2 py-0.5 rounded">
                    {response.location?.latitude.toFixed(4)}, {response.location?.longitude.toFixed(4)}
                  </span>
                </div>
              ))}
              {geoResponses.length > 20 && (
                <p className="text-xs text-muted-foreground text-center pt-2 pb-1">
                  +{geoResponses.length - 20} autres réponses...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Normal map display
  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="gap-1.5">
            <MapPin className="h-3 w-3" />
            {geoResponses.length} géolocalisées
          </Badge>
          {geoStats && (
            <span className="text-muted-foreground text-xs">
              {geoStats.zonesCount} zones • {Math.round((geoStats.total / responses.length) * 100)}% couverture
            </span>
          )}
        </div>
      </div>

      {/* Map container */}
      <div className="relative h-[400px] rounded-xl overflow-hidden border border-border shadow-sm">
        {isLoading && (
          <div className="absolute inset-0 bg-muted/60 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
            </div>
          </div>
        )}
        <div ref={mapContainer} className="absolute inset-0" />
      </div>
    </div>
  );
};