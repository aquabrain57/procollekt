import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Layers, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DbSurveyResponse } from '@/hooks/useSurveys';
import { reverseGeocodeBatch } from '@/hooks/useReverseGeocode';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RealtimeGPSMapProps {
  responses: DbSurveyResponse[];
  title?: string;
}

interface ClusterZone {
  id: string;
  lat: number;
  lng: number;
  count: number;
  responses: DbSurveyResponse[];
  name?: string;
}

export const RealtimeGPSMap = ({ responses, title = 'Carte temps réel' }: RealtimeGPSMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [showClusters, setShowClusters] = useState(true);
  const [zoneNames, setZoneNames] = useState<Map<string, string>>(new Map());

  // Filter geo responses
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

  // Create clusters/zones
  const clusters = useMemo<ClusterZone[]>(() => {
    if (!showClusters || geoResponses.length === 0) return [];

    const zones: Record<string, ClusterZone> = {};
    const precision = 2; // ~1km precision

    geoResponses.forEach(r => {
      const lat = Math.round(r.location!.latitude * Math.pow(10, precision)) / Math.pow(10, precision);
      const lng = Math.round(r.location!.longitude * Math.pow(10, precision)) / Math.pow(10, precision);
      const key = `${lat},${lng}`;

      if (!zones[key]) {
        zones[key] = {
          id: key,
          lat,
          lng,
          count: 0,
          responses: [],
        };
      }
      zones[key].count++;
      zones[key].responses.push(r);
    });

    return Object.values(zones).sort((a, b) => b.count - a.count);
  }, [geoResponses, showClusters]);

  // Geocode zone names
  useEffect(() => {
    const geocodeZones = async () => {
      if (clusters.length === 0) return;

      const locations = clusters.slice(0, 20).map(z => ({
        id: z.id,
        latitude: z.lat,
        longitude: z.lng,
      }));

      try {
        const results = await reverseGeocodeBatch(locations);
        const names = new Map<string, string>();
        results.forEach((geo, id) => {
          const name = [geo.city, geo.region].filter(Boolean).join(', ') || `Zone ${id}`;
          names.set(id, name);
        });
        setZoneNames(names);
      } catch (error) {
        console.error('Zone geocoding error:', error);
      }
    };

    geocodeZones();
  }, [clusters]);

  // Calculate center and bounds
  const mapBounds = useMemo(() => {
    if (geoResponses.length === 0) return null;

    const lats = geoResponses.map(r => r.location!.latitude);
    const lngs = geoResponses.map(r => r.location!.longitude);

    return {
      center: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2] as [number, number],
      bounds: [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]] as [[number, number], [number, number]],
    };
  }, [geoResponses]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || geoResponses.length === 0) {
      setIsLoading(false);
      return;
    }

    const center = mapBounds?.center || [1.2255, 6.1375];

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center,
      zoom: 5,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.current.on('load', () => {
      setIsLoading(false);
      setMapReady(true);

      // Fit bounds if we have multiple points
      if (mapBounds && geoResponses.length > 1) {
        map.current?.fitBounds(mapBounds.bounds, { padding: 50, maxZoom: 12 });
      }
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
      setMapReady(false);
    };
  }, [geoResponses.length > 0]);

  // Update markers
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (showClusters && clusters.length > 0) {
      // Add cluster markers
      clusters.forEach(zone => {
        const el = document.createElement('div');
        const size = Math.min(60, 24 + zone.count * 4);
        const zoneName = zoneNames.get(zone.id) || `Zone`;

        el.innerHTML = `
          <div style="
            background: linear-gradient(135deg, hsl(142, 71%, 45%), hsl(142, 71%, 35%));
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
            border: 3px solid white;
            cursor: pointer;
            transition: transform 0.2s;
            font-weight: bold;
            color: white;
            font-size: ${zone.count > 99 ? '12px' : '14px'};
          " title="${zoneName}: ${zone.count} réponses">
            ${zone.count}
          </div>
        `;

        const popup = new maplibregl.Popup({
          offset: 25,
          closeButton: true,
          maxWidth: '280px',
        }).setHTML(`
          <div style="font-family: system-ui; padding: 4px;">
            <div style="font-weight: 600; color: #16a34a; margin-bottom: 8px; font-size: 14px;">
              📍 ${zoneName}
            </div>
            <div style="font-size: 13px; margin-bottom: 6px;">
              <strong>${zone.count}</strong> réponses collectées
            </div>
            <div style="font-size: 11px; color: #6b7280;">
              Dernière: ${format(new Date(zone.responses[0].created_at), "dd MMM 'à' HH:mm", { locale: fr })}
            </div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([zone.lng, zone.lat])
          .setPopup(popup)
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    } else {
      // Add individual markers
      geoResponses.forEach(r => {
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="
            background: linear-gradient(135deg, hsl(217, 91%, 50%), hsl(271, 81%, 56%));
            width: 24px;
            height: 24px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 8px rgba(99, 102, 241, 0.4);
            border: 2px solid white;
            cursor: pointer;
          ">
            <div style="transform: rotate(45deg); width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([r.location!.longitude, r.location!.latitude])
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    }
  }, [geoResponses, clusters, mapReady, showClusters, zoneNames]);

  if (geoResponses.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] bg-muted/30 rounded-lg flex items-center justify-center border-2 border-dashed border-muted">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune donnée géolocalisée</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {geoResponses.length} pts
            </Badge>
            <Button
              variant={showClusters ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowClusters(!showClusters)}
            >
              <Layers className="h-3 w-3 mr-1" />
              Zones
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <div className="relative h-[250px] sm:h-[300px] rounded-lg overflow-hidden border border-border">
          {isLoading && (
            <div className="absolute inset-0 bg-muted/60 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
          <div ref={mapContainer} className="h-full w-full" />
        </div>

        {/* Zone summary */}
        {showClusters && clusters.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {clusters.slice(0, 5).map(zone => (
              <Badge
                key={zone.id}
                variant="outline"
                className="text-xs py-1"
              >
                📍 {zoneNames.get(zone.id) || 'Zone'}: {zone.count}
              </Badge>
            ))}
            {clusters.length > 5 && (
              <Badge variant="secondary" className="text-xs">
                +{clusters.length - 5} zones
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
