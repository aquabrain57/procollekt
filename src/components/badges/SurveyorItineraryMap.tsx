import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AlertCircle, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMapboxToken } from '@/hooks/useMapboxToken';

interface SurveyorItineraryMapProps {
  points: { latitude: number; longitude: number; recorded_at: string }[];
}

export function SurveyorItineraryMap({ points }: SurveyorItineraryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { token } = useMapboxToken();

  const line = useMemo(() => {
    const coords = points
      .filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
      // API returns newest first; draw route from oldest -> newest
      .slice()
      .reverse()
      .map(p => [p.longitude, p.latitude] as [number, number]);
    return coords.length >= 2 ? coords : null;
  }, [points]);

  const center = useMemo<[number, number]>(() => {
    const first = points.find(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    if (!first) return [1.2255, 6.1375];
    return [first.longitude, first.latitude];
  }, [points]);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (!token) {
      setError('Token Mapbox non configuré');
      return;
    }
    if (points.length === 0) {
      setError(null);
      return;
    }

    setError(null);

    try {
      mapboxgl.accessToken = token;
      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center,
        zoom: 12,
        attributionControl: false,
      });

      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      mapRef.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

      mapRef.current.on('load', () => {
        if (!mapRef.current) return;

        // markers: start + end
        const valid = points.filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
        if (valid.length) {
          const newest = valid[0];
          const oldest = valid[valid.length - 1];

          new mapboxgl.Marker({ color: '#10b981' })
            .setLngLat([oldest.longitude, oldest.latitude])
            .addTo(mapRef.current);
          new mapboxgl.Marker({ color: '#6366f1' })
            .setLngLat([newest.longitude, newest.latitude])
            .addTo(mapRef.current);
        }

        if (!line) return;

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
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#6366f1', 'line-width': 4, 'line-opacity': 0.85 },
        });

        // Fit bounds
        const bounds = new mapboxgl.LngLatBounds();
        line.forEach(c => bounds.extend(c));
        mapRef.current.fitBounds(bounds, { padding: 40, maxZoom: 15 });
      });

      mapRef.current.on('error', (e) => {
        const errorData = e as any;
        if (errorData?.error?.status === 401 || errorData?.error?.status === 403) {
          setError('Token Mapbox invalide');
        } else {
          setError('Erreur de chargement de la carte');
        }
      });
    } catch {
      setError('Erreur de chargement de la carte');
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token, center, line, points]);

  if (points.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun point GPS enregistré</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-amber-500/30 bg-amber-500/10">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Carte non disponible</AlertTitle>
        <AlertDescription className="text-sm">{error}</AlertDescription>
      </Alert>
    );
  }

  return <div ref={mapContainer} className="h-[320px] w-full rounded-xl overflow-hidden border border-border" />;
}
