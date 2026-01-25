import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import DOMPurify from 'dompurify';
import { DbSurveyResponse, DbSurveyField } from '@/hooks/useSurveys';
import { MapPin, Globe, Navigation, Mountain, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useReverseGeocode, reverseGeocodeBatch } from '@/hooks/useReverseGeocode';

interface ResponsesMapLibreProps {
  responses: DbSurveyResponse[];
  fields: DbSurveyField[];
}

// Single location display component
const LocationInfo = ({ lat, lng }: { lat: number; lng: number }) => {
  const { city, region, country, loading } = useReverseGeocode(lat, lng);
  
  if (loading) return <span className="text-muted-foreground">Chargement...</span>;
  
  const location = [city, region, country].filter(Boolean).join(', ');
  return <span>{location || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}</span>;
};

export const ResponsesMapLibre = ({ responses, fields }: ResponsesMapLibreProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'fr' ? fr : enUS;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [geocodedLocations, setGeocodedLocations] = useState<Map<string, { city: string | null; region: string | null; country: string | null }>>(new Map());

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

  // Geocode locations in batch
  useEffect(() => {
    const geocodeLocations = async () => {
      if (geoResponses.length === 0) return;

      const locations = geoResponses.slice(0, 30).map(r => ({
        id: r.id,
        latitude: r.location!.latitude,
        longitude: r.location!.longitude,
      }));

      try {
        const results = await reverseGeocodeBatch(locations);
        setGeocodedLocations(results);
      } catch (error) {
        console.error('Batch geocoding error:', error);
      }
    };

    geocodeLocations();
  }, [geoResponses]);

  // Initialize map with MapLibre
  useEffect(() => {
    if (!mapContainer.current || geoResponses.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
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

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center,
        zoom,
        attributionControl: false,
      });

      map.current.addControl(
        new maplibregl.NavigationControl({ visualizePitch: true }),
        'top-right'
      );

      map.current.addControl(
        new maplibregl.FullscreenControl(),
        'top-right'
      );

      map.current.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        'bottom-left'
      );

      map.current.on('load', () => {
        setIsLoading(false);
        setMapReady(true);
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setIsLoading(false);
      });

    } catch (error: any) {
      console.error('Map initialization error:', error);
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

      const geocoded = geocodedLocations.get(response.id);
      const locationText = geocoded 
        ? [geocoded.city, geocoded.region, geocoded.country].filter(Boolean).join(', ')
        : `${response.location.latitude.toFixed(4)}, ${response.location.longitude.toFixed(4)}`;

      // Get surveyor info from response data
      const surveyorId = response.data?.surveyor_id || response.surveyor_id;
      const surveyorName = response.data?.surveyor_name;

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
        return `<div style="margin-bottom: 6px; font-size: 12px;"><strong style="color: #374151;">${sanitizedLabel}:</strong> <span style="color: #6b7280;">${sanitizedValue}</span></div>`;
      }).filter(Boolean).join('');

      // Surveyor info HTML
      const surveyorHtml = surveyorId || surveyorName ? `
        <div style="display: flex; align-items: center; gap: 6px; padding: 8px; background: #f0fdf4; border-radius: 6px; margin-bottom: 10px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <div>
            ${surveyorName ? `<span style="font-weight: 600; color: #166534; font-size: 12px;">${DOMPurify.sanitize(surveyorName)}</span>` : ''}
            ${surveyorId ? `<span style="color: #16a34a; font-size: 11px; margin-left: 4px;">(${DOMPurify.sanitize(surveyorId)})</span>` : ''}
          </div>
        </div>
      ` : '';

      // Altitude info if available (from response data if captured)
      const altitude = (response.location as any).altitude ?? response.data?.altitude;
      const altitudeHtml = altitude !== undefined && altitude !== null ? `
        <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #6b7280; margin-top: 6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m8 3 4 8 5-5 5 15H2L8 3z"></path>
          </svg>
          <span>Altitude: ${Math.round(altitude)} m</span>
        </div>
      ` : '';

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 240px; padding: 4px;">
          <div style="font-weight: 600; margin-bottom: 8px; color: #6366f1; font-size: 14px; display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
            ${format(new Date(response.created_at), "dd MMM yyyy 'à' HH:mm", { locale: dateLocale })}
          </div>
          ${surveyorHtml}
          <div style="padding: 8px; background: #f3f4f6; border-radius: 6px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2">
                <circle cx="12" cy="10" r="3"></circle>
                <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 11.5 7.3 11.8a1 1 0 0 0 1.4 0C13 21.5 20 15.4 20 10a8 8 0 0 0-8-8z"></path>
              </svg>
              <span style="font-weight: 500; font-size: 12px; color: #374151;">${DOMPurify.sanitize(locationText)}</span>
            </div>
            <div style="font-size: 10px; color: #9ca3af; font-family: monospace;">
              📍 ${response.location.latitude.toFixed(5)}, ${response.location.longitude.toFixed(5)}
            </div>
            ${altitudeHtml}
          </div>
          ${fieldHtml ? `<div style="border-top: 1px solid #e5e7eb; padding-top: 10px;">${fieldHtml}</div>` : ''}
        </div>
      `;

      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '320px',
      }).setHTML(popupContent);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([response.location.longitude, response.location.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [geoResponses, fields, dateLocale, mapReady, geocodedLocations]);

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

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center justify-between text-sm flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
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
              <span className="text-sm text-muted-foreground">Chargement de la carte...</span>
            </div>
          </div>
        )}
        <div ref={mapContainer} className="h-full w-full" />
      </div>

      {/* Top zones with geocoded names */}
      {geoStats && geoStats.topZones.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Top {geoStats.topZones.length} zones de collecte
            </h4>
            <div className="space-y-3">
              {geoStats.topZones.map((zone, idx) => (
                <div key={zone.coords} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={idx === 0 ? 'default' : 'secondary'} className="text-[10px]">
                        #{idx + 1}
                      </Badge>
                      <span className="font-medium text-xs">
                        <LocationInfo lat={zone.lat} lng={zone.lng} />
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
    </div>
  );
};
