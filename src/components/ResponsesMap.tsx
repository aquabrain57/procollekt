import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import DOMPurify from 'dompurify';
import { DbSurveyResponse, DbSurveyField } from '@/hooks/useSurveys';
import { MapPin, AlertCircle } from 'lucide-react';

interface ResponsesMapProps {
  responses: DbSurveyResponse[];
  fields: DbSurveyField[];
}

export const ResponsesMap = ({ responses, fields }: ResponsesMapProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'fr' ? fr : enUS;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const geoResponses = responses.filter(r => r.location);

  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Get token from environment
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    
    if (!token || token === 'undefined' || token.trim() === '') {
      setMapError(t('map.tokenNotConfigured'));
      setIsLoading(false);
      return;
    }

    try {
      mapboxgl.accessToken = token;

      // Calculate center from responses or use default (Togo)
      let center: [number, number] = [1.2255, 6.1375]; // Lomé, Togo default
      let zoom = 6;

      if (geoResponses.length > 0) {
        const validResponses = geoResponses.filter(r => 
          r.location && 
          typeof r.location.latitude === 'number' && 
          typeof r.location.longitude === 'number' &&
          !isNaN(r.location.latitude) &&
          !isNaN(r.location.longitude)
        );

        if (validResponses.length > 0) {
          const lats = validResponses.map(r => r.location!.latitude);
          const lngs = validResponses.map(r => r.location!.longitude);
          center = [
            (Math.min(...lngs) + Math.max(...lngs)) / 2,
            (Math.min(...lats) + Math.max(...lats)) / 2
          ];
          
          // Calculate zoom based on spread
          const latSpread = Math.max(...lats) - Math.min(...lats);
          const lngSpread = Math.max(...lngs) - Math.min(...lngs);
          const spread = Math.max(latSpread, lngSpread);
          if (spread < 0.1) zoom = 12;
          else if (spread < 1) zoom = 9;
          else if (spread < 5) zoom = 7;
          else zoom = 4;
        }
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center,
        zoom,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      map.current.addControl(
        new mapboxgl.FullscreenControl(),
        'top-right'
      );

      // Add markers once map is loaded
      map.current.on('load', () => {
        setIsLoading(false);
        
        geoResponses.forEach((response) => {
          if (!response.location || 
              typeof response.location.latitude !== 'number' || 
              typeof response.location.longitude !== 'number') return;

          // Create custom marker element
          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.innerHTML = `
            <div style="
              background: hsl(217 91% 50%);
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 2px solid white;
            ">
              <svg style="transform: rotate(45deg); width: 16px; height: 16px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
          `;

          // Build popup content with sanitized user data to prevent XSS
          const firstFields = fields.slice(0, 3);
          const fieldHtml = firstFields.map(field => {
            const value = response.data[field.id];
            if (value === undefined || value === null || value === '') return '';
            const displayValue = Array.isArray(value) ? value.join(', ') : value.toString();
            const sanitizedLabel = DOMPurify.sanitize(field.label);
            const sanitizedValue = DOMPurify.sanitize(displayValue.slice(0, 50));
            return `<div style="margin-bottom: 4px;"><strong>${sanitizedLabel}:</strong> ${sanitizedValue}</div>`;
          }).join('');

          const popupContent = `
            <div style="font-family: system-ui, sans-serif; min-width: 200px;">
              <div style="font-weight: 600; margin-bottom: 8px; color: hsl(217 91% 50%);">
                ${format(new Date(response.created_at), "dd MMM yyyy 'à' HH:mm", { locale: dateLocale })}
              </div>
              <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                📍 ${response.location.latitude.toFixed(5)}, ${response.location.longitude.toFixed(5)}
              </div>
              ${fieldHtml ? `<div style="font-size: 13px; border-top: 1px solid #eee; padding-top: 8px;">${fieldHtml}</div>` : ''}
            </div>
          `;

          const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: false,
          }).setHTML(popupContent);

          const marker = new mapboxgl.Marker(el)
            .setLngLat([response.location.longitude, response.location.latitude])
            .setPopup(popup)
            .addTo(map.current!);

          markersRef.current.push(marker);
        });
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapError('Erreur de chargement de la carte');
        setIsLoading(false);
      });

    } catch (error: any) {
      console.error('Map initialization error:', error);
      setMapError(error.message || 'Erreur lors du chargement de la carte');
      setIsLoading(false);
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
    };
  }, [geoResponses.length, fields, dateLocale, t]);

  if (geoResponses.length === 0) {
    return (
      <div className="h-[400px] bg-muted/50 rounded-xl flex flex-col items-center justify-center text-muted-foreground">
        <MapPin className="h-12 w-12 mb-4 opacity-50" />
        <p className="font-medium">{t('map.noGeoResponses')}</p>
        <p className="text-sm">{t('map.noGeoResponsesDesc')}</p>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="h-[400px] bg-destructive/10 rounded-xl flex flex-col items-center justify-center text-destructive">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="font-medium">{t('map.mapError')}</p>
        <p className="text-sm">{mapError}</p>
        <p className="text-xs mt-2 text-muted-foreground">
          Vérifiez que le secret VITE_MAPBOX_TOKEN est configuré
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {geoResponses.length} {t('map.geolocatedResponses')}
        </p>
      </div>
      <div className="relative h-[400px] rounded-xl overflow-hidden border border-border">
        {isLoading && (
          <div className="absolute inset-0 bg-muted/50 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        <div ref={mapContainer} className="absolute inset-0" />
      </div>
    </div>
  );
};
