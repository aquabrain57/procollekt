import { MapPin, Loader2 } from 'lucide-react';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import { Badge } from '@/components/ui/badge';

interface LocationDisplayProps {
  latitude: number | undefined | null;
  longitude: number | undefined | null;
  showCoordinates?: boolean;
  compact?: boolean;
  className?: string;
}

export const LocationDisplay = ({ 
  latitude, 
  longitude, 
  showCoordinates = false,
  compact = false,
  className = ''
}: LocationDisplayProps) => {
  const { city, region, country, fullAddress, loading } = useReverseGeocode(latitude, longitude);

  if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-1 text-muted-foreground ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Chargement...</span>
      </div>
    );
  }

  if (compact) {
    return (
      <Badge variant="secondary" className={`text-xs gap-1 ${className}`}>
        <MapPin className="h-3 w-3" />
        {city || region || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`}
      </Badge>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
        <span className="font-medium text-foreground">
          {fullAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
        </span>
      </div>
      {showCoordinates && (city || region) && (
        <div className="text-xs text-muted-foreground ml-6">
          GPS: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      )}
    </div>
  );
};

// Simple inline location display for tables - shows locality + country
export const LocationBadge = ({ 
  latitude, 
  longitude,
  showCountry = true
}: { 
  latitude: number | undefined | null; 
  longitude: number | undefined | null;
  showCountry?: boolean;
}) => {
  const { city, region, country, loading } = useReverseGeocode(latitude, longitude);

  if (latitude === undefined || latitude === null) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (loading) {
    return (
      <Badge variant="secondary" className="text-xs">
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ...
      </Badge>
    );
  }

  // Build display text: City, Country (or region if no city)
  const locality = city || region;
  let displayText = '';
  
  if (locality && country && showCountry) {
    displayText = `${locality}, ${country}`;
  } else if (locality) {
    displayText = locality;
  } else if (country) {
    displayText = country;
  } else {
    displayText = `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
  }

  return (
    <Badge variant="secondary" className="text-xs gap-1 max-w-[180px]">
      <MapPin className="h-3 w-3 flex-shrink-0 text-green-600" />
      <span className="truncate" title={displayText}>{displayText}</span>
    </Badge>
  );
};

// Extended location display with full details for reports
export const LocationFull = ({ 
  latitude, 
  longitude 
}: { 
  latitude: number | undefined | null; 
  longitude: number | undefined | null;
}) => {
  const { city, region, country, fullAddress, loading } = useReverseGeocode(latitude, longitude);

  if (latitude === undefined || latitude === null) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
        <span>{city || region || 'Position GPS'}</span>
        {country && <span className="text-muted-foreground">({country})</span>}
      </div>
      <div className="text-xs text-muted-foreground ml-5">
        {latitude.toFixed(6)}°, {longitude.toFixed(6)}°
      </div>
    </div>
  );
};
