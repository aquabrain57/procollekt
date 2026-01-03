import { useState, useEffect } from 'react';

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

    // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key required)
    const fetchAddress = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`,
          {
            headers: {
              'User-Agent': 'FieldCollect-App/1.0',
            },
          }
        );

        if (!response.ok) throw new Error('Geocoding failed');

        const data = await response.json();
        const address = data.address || {};

        const city = address.city || address.town || address.village || address.municipality || address.locality || null;
        const region = address.state || address.region || address.county || null;
        const country = address.country || null;

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
      // Add delay between requests to respect Nominatim rate limit (1 req/sec)
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 1100));

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}&accept-language=fr`,
        {
          headers: {
            'User-Agent': 'FieldCollect-App/1.0',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const address = data.address || {};

        const result = {
          city: address.city || address.town || address.village || address.municipality || address.locality || null,
          region: address.state || address.region || address.county || null,
          country: address.country || null,
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
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`,
      {
        headers: {
          'User-Agent': 'FieldCollect-App/1.0',
        },
      }
    );

    if (!response.ok) throw new Error('Geocoding failed');

    const data = await response.json();
    const address = data.address || {};

    const city = address.city || address.town || address.village || address.municipality || address.locality || null;
    const region = address.state || address.region || address.county || null;
    const country = address.country || null;

    geocodeCache.set(cacheKey, { city, region, country });
    
    return [city, region, country].filter(Boolean).join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  } catch (error) {
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
};
