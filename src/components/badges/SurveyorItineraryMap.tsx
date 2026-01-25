import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AlertCircle, MapPin, Navigation, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface SurveyorItineraryMapProps {
  points: { latitude: number; longitude: number; recorded_at: string }[];
  isOnline?: boolean;
  surveyorName?: string;
}

export function SurveyorItineraryMap({ points, isOnline, surveyorName }: SurveyorItineraryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const validPoints = useMemo(() => 
    points.filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)),
    [points]
  );

  const line = useMemo(() => {
    const coords = validPoints
      .slice()
      .reverse() // oldest -> newest for route
      .map(p => [p.longitude, p.latitude] as [number, number]);
    return coords.length >= 2 ? coords : null;
  }, [validPoints]);

  const center = useMemo<[number, number]>(() => {
    const first = validPoints[0];
    if (!first) return [1.2255, 6.1375]; // Default: Lomé
    return [first.longitude, first.latitude];
  }, [validPoints]);

  // Calculate distance in km
  const totalDistance = useMemo(() => {
    if (validPoints.length < 2) return 0;
    
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    let total = 0;
    
    for (let i = 1; i < validPoints.length; i++) {
      const p1 = validPoints[i - 1];
      const p2 = validPoints[i];
      
      const R = 6371; // Earth radius in km
      const dLat = toRad(p2.latitude - p1.latitude);
      const dLon = toRad(p2.longitude - p1.longitude);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(p1.latitude)) * Math.cos(toRad(p2.latitude)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      total += R * c;
    }
    
    return total;
  }, [validPoints]);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (validPoints.length === 0) return;

    // Use OpenStreetMap tiles (no token needed)
    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center,
      zoom: 13,
      attributionControl: false,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left'
    );

    mapRef.current.on('load', () => {
      if (!mapRef.current) return;
      setMapReady(true);

      // Add markers: start (green) + end (indigo/current)
      if (validPoints.length > 0) {
        const newest = validPoints[0];
        const oldest = validPoints[validPoints.length - 1];

        // Start marker (green)
        const startEl = document.createElement('div');
        startEl.className = 'flex items-center justify-center w-6 h-6 rounded-full bg-green-500 border-2 border-white shadow-lg';
        startEl.innerHTML = '<div class="w-2 h-2 rounded-full bg-white"></div>';
        new maplibregl.Marker({ element: startEl })
          .setLngLat([oldest.longitude, oldest.latitude])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<p class="text-xs font-medium">Départ</p>'))
          .addTo(mapRef.current);

        // End/current marker (indigo)
        const endEl = document.createElement('div');
        endEl.className = 'flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500 border-2 border-white shadow-lg animate-pulse';
        endEl.innerHTML = '<div class="w-3 h-3 rounded-full bg-white"></div>';
        new maplibregl.Marker({ element: endEl })
          .setLngLat([newest.longitude, newest.latitude])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<p class="text-xs font-medium">Position actuelle</p>'))
          .addTo(mapRef.current);
      }

      // Add route line
      if (line) {
        mapRef.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: line,
            },
          },
        });

        mapRef.current.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#6366f1',
            'line-width': 4,
            'line-opacity': 0.85,
          },
        });

        // Fit bounds
        const bounds = new maplibregl.LngLatBounds();
        line.forEach(c => bounds.extend(c));
        mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [center, line, validPoints]);

  if (validPoints.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun point GPS enregistré</p>
          <p className="text-xs mt-1">L'itinéraire s'affichera dès que des positions seront collectées</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {surveyorName && (
          <span className="text-sm font-medium">{surveyorName}</span>
        )}
        <div className="flex items-center gap-2">
          {isOnline !== undefined && (
            <Badge variant={isOnline ? 'default' : 'secondary'} className="text-xs">
              {isOnline ? (
                <><Wifi className="w-3 h-3 mr-1" /> En ligne</>
              ) : (
                <><WifiOff className="w-3 h-3 mr-1" /> Hors ligne</>
              )}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            <Navigation className="w-3 h-3 mr-1" />
            {totalDistance.toFixed(2)} km
          </Badge>
          <Badge variant="outline" className="text-xs">
            <MapPin className="w-3 h-3 mr-1" />
            {validPoints.length} points
          </Badge>
        </div>
      </div>

      {/* Map */}
      <div 
        ref={mapContainer} 
        className="h-[350px] w-full rounded-xl overflow-hidden border border-border shadow-sm"
      />

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm" />
          <span>Départ</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-indigo-500 border border-white shadow-sm" />
          <span>Position actuelle</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-1 rounded bg-indigo-500" />
          <span>Trajet</span>
        </div>
      </div>
    </div>
  );
}
