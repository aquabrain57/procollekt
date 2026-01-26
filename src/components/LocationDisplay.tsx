import { MapPin, Loader2, Mountain } from 'lucide-react';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LocationDisplayProps {
  latitude: number | undefined | null;
  longitude: number | undefined | null;
  altitude?: number | null;
  showCoordinates?: boolean;
  compact?: boolean;
  className?: string;
}

export const LocationDisplay = ({ 
  latitude, 
  longitude,
  altitude,
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
      {altitude !== undefined && altitude !== null && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-6">
          <Mountain className="h-3 w-3" />
          Alt: {altitude.toFixed(0)}m
        </div>
      )}
      {showCoordinates && (city || region) && (
        <div className="text-xs text-muted-foreground ml-6">
          GPS: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      )}
    </div>
  );
};

// Enhanced inline location display for tables - shows locality, country, and altitude
export const LocationBadge = ({ 
  latitude, 
  longitude,
  altitude,
  showCountry = true,
  showAltitude = false
}: { 
  latitude: number | undefined | null; 
  longitude: number | undefined | null;
  altitude?: number | null;
  showCountry?: boolean;
  showAltitude?: boolean;
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

  // Add altitude if available and requested
  const altitudeText = altitude !== undefined && altitude !== null ? `${altitude.toFixed(0)}m` : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="text-xs gap-1 max-w-[200px] cursor-help">
            <MapPin className="h-3 w-3 flex-shrink-0 text-green-600" />
            <span className="truncate">{displayText}</span>
            {showAltitude && altitudeText && (
              <>
                <span className="text-muted-foreground">|</span>
                <Mountain className="h-3 w-3 flex-shrink-0 text-blue-500" />
                <span>{altitudeText}</span>
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <div className="font-medium">{displayText}</div>
            <div className="text-muted-foreground">
              GPS: {latitude.toFixed(6)}°, {longitude.toFixed(6)}°
            </div>
            {altitudeText && (
              <div className="text-muted-foreground flex items-center gap-1">
                <Mountain className="h-3 w-3" />
                Altitude: {altitudeText}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Extended location display with full details for reports
export const LocationFull = ({ 
  latitude, 
  longitude,
  altitude
}: { 
  latitude: number | undefined | null; 
  longitude: number | undefined | null;
  altitude?: number | null;
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
      <div className="text-xs text-muted-foreground ml-5 space-y-0.5">
        <div>{latitude.toFixed(6)}°, {longitude.toFixed(6)}°</div>
        {altitude !== undefined && altitude !== null && (
          <div className="flex items-center gap-1">
            <Mountain className="h-3 w-3" />
            Altitude: {altitude.toFixed(0)}m
          </div>
        )}
      </div>
    </div>
  );
};
