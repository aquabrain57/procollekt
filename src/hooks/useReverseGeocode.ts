import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GeocodedLocation {
  city: string | null;
  region: string | null;
  country: string | null;
  fullAddress: string;
  loading: boolean;
}

// Cache for geocoded locations to avoid repeated API calls
const geocodeCache = new Map<string, { city: string | null; region: string | null; country: string | null }>();

export const useReverseGeocode = (
  latitude: number | undefined | null,
  longitude: number | undefined | null
): GeocodedLocation => {
  const [location, setLocation] = useState<GeocodedLocation>({
    city: null,
    region: null,
    country: null,
    fullAddress: '',
    loading: false,
  });

  useEffect(() => {
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      setLocation({
        city: null,
        region: null,
        country: null,
        fullAddress: '',
        loading: false,
      });
      return;
    }

    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    
    // Check cache first
    const cached = geocodeCache.get(cacheKey);
    if (cached) {
      setLocation({
        ...cached,
        fullAddress: [cached.city, cached.region, cached.country].filter(Boolean).join(', '),
        loading: false,
      });
      return;
    }

    setLocation(prev => ({ ...prev, loading: true }));

    // Use edge function proxy for reverse geocoding (keeps user location data private)
    const fetchAddress = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('reverse-geocode', {
          body: { latitude, longitude, language: 'fr' }
        });

        if (error) throw error;

        const city = data.city || null;
        const region = data.region || null;
        const country = data.country || null;

        const result = { city, region, country };
        geocodeCache.set(cacheKey, result);

        setLocation({
          ...result,
          fullAddress: [city, region, country].filter(Boolean).join(', '),
          loading: false,
        });
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        setLocation({
          city: null,
          region: null,
          country: null,
          fullAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          loading: false,
        });
      }
    };

    // Debounce to avoid too many requests
    const timeoutId = setTimeout(fetchAddress, 300);
    return () => clearTimeout(timeoutId);
  }, [latitude, longitude]);

  return location;
};

// Helper function for batch geocoding
export const reverseGeocodeBatch = async (
  locations: Array<{ latitude: number; longitude: number; id: string }>
): Promise<Map<string, { city: string | null; region: string | null; country: string | null }>> => {
  const results = new Map<string, { city: string | null; region: string | null; country: string | null }>();

  // Process in small batches to respect rate limits
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    const cacheKey = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;

    // Check cache
    const cached = geocodeCache.get(cacheKey);
    if (cached) {
      results.set(loc.id, cached);
      continue;
    }

    try {
      // Add delay between requests to respect rate limit (1 req/sec)
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 1100));

      const { data, error } = await supabase.functions.invoke('reverse-geocode', {
        body: { latitude: loc.latitude, longitude: loc.longitude, language: 'fr' }
      });

      if (!error && data) {
        const result = {
          city: data.city || null,
          region: data.region || null,
          country: data.country || null,
        };

        geocodeCache.set(cacheKey, result);
        results.set(loc.id, result);
      }
    } catch (error) {
      console.error('Batch geocoding error for location:', loc.id);
    }
  }

  return results;
};

// Simple function to get address from coordinates
export const getAddressFromCoords = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  
  const cached = geocodeCache.get(cacheKey);
  if (cached) {
    return [cached.city, cached.region, cached.country].filter(Boolean).join(', ');
  }

  try {
    const { data, error } = await supabase.functions.invoke('reverse-geocode', {
      body: { latitude, longitude, language: 'fr' }
    });

    if (error) throw error;

    const city = data.city || null;
    const region = data.region || null;
    const country = data.country || null;

    geocodeCache.set(cacheKey, { city, region, country });
    
    return [city, region, country].filter(Boolean).join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  } catch (error) {
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
};
