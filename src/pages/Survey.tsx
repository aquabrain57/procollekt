import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DbSurvey, DbSurveyField } from '@/hooks/useSurveys';
import { Loader2, AlertCircle, CheckCircle, MapPin, Wifi, WifiOff, Camera, Star, Check, Calendar, Clock, Download, Smartphone, Mic, Video, File, QrCode, PenTool, GripVertical, Minus, Square, Grid, Calculator, EyeOff, Globe, Moon, Sun, ChevronLeft, ChevronRight, ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { Progress } from '@/components/ui/progress';
import { PublicSurveyorIdField } from '@/components/PublicSurveyorIdField';
import defaultFormImage from '@/assets/auth-field-bg.jpg';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


interface PendingResponse {
  id: string;
  survey_id: string;
  data: Record<string, any>;
  location: { lat: number; lng: number } | null;
  created_at: string;
}

// Hook pour le reverse geocoding (uses edge function proxy for privacy)
const useReverseGeocode = (lat: number | null, lng: number | null) => {
  const [locationName, setLocationName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat === null || lng === null) {
      setLocationName('');
      return;
    }

    const fetchLocationName = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('reverse-geocode', {
          body: { latitude: lat, longitude: lng, language: 'fr' }
        });
        
        if (error) throw error;
        
        const city = data.city || '';
        const country = data.country || '';
        setLocationName(city ? `${city}, ${country}` : country);
      } catch (error) {
        console.error('Error reverse geocoding:', error);
        setLocationName('');
      } finally {
        setLoading(false);
      }
    };

    fetchLocationName();
  }, [lat, lng]);

  return { locationName, loading };
};

// Optimized input component with local state to prevent lag
const TextInput = ({ 
  value, 
  onChange, 
  placeholder,
  type = 'text',
  min,
  max,
  fieldMode = false,
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
  fieldMode?: boolean;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Debounce the parent update
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onChange(type === 'number' && newValue ? newValue : newValue);
    }, 150);
  };

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      min={min}
      max={max}
      className={cn(
        "w-full rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors",
        fieldMode 
          ? "px-4 py-4 text-lg sm:text-xl" 
          : "px-4 py-3 text-base"
      )}
    />
  );
};

// Location field with auto-detection and city name display
const LocationFieldWithAutoDetect = ({
  value,
  onChange,
  autoDetectedLocation,
  fieldMode = false,
  t,
}: {
  value: any;
  onChange: (value: any) => void;
  autoDetectedLocation: { lat: number; lng: number } | null;
  fieldMode?: boolean;
  t: (key: string) => string;
}) => {
  const displayValue = value || autoDetectedLocation;
  const { locationName, loading: geoLoading } = useReverseGeocode(
    displayValue?.latitude || displayValue?.lat || null,
    displayValue?.longitude || displayValue?.lng || null
  );

  const handleCapture = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onChange({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast.success('Position GPS mise à jour');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error("Impossible d'obtenir la position GPS");
        }
      );
    }
  };

  // Auto-set if not already set and we have auto-detected location
  useEffect(() => {
    if (!value && autoDetectedLocation) {
      onChange({
        latitude: autoDetectedLocation.lat,
        longitude: autoDetectedLocation.lng,
      });
    }
  }, [autoDetectedLocation]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleCapture}
        className={cn(
          'w-full rounded-lg border text-left transition-all duration-200 flex items-center gap-3',
          displayValue
            ? 'border-green-500 bg-green-500/5 text-foreground'
            : 'border-border bg-background text-muted-foreground hover:border-primary/50',
          fieldMode ? 'px-4 py-5' : 'px-4 py-4'
        )}
      >
        <MapPin className={cn(displayValue ? 'text-green-500' : 'text-muted-foreground', fieldMode ? 'h-6 w-6' : 'h-5 w-5')} />
        <div className="flex-1 min-w-0">
          {displayValue ? (
            <div>
              {geoLoading ? (
                <span className={cn("text-muted-foreground", fieldMode ? "text-base" : "text-sm")}>Chargement...</span>
              ) : locationName ? (
                <span className={cn("font-medium", fieldMode ? "text-base" : "text-sm")}>{locationName}</span>
              ) : (
                <span className={cn(fieldMode ? "text-base" : "text-sm")}>
                  {(displayValue.latitude || displayValue.lat)?.toFixed(4)}, {(displayValue.longitude || displayValue.lng)?.toFixed(4)}
                </span>
              )}
              <p className={cn("text-muted-foreground mt-1", fieldMode ? "text-sm" : "text-xs")}>
                GPS: {(displayValue.latitude || displayValue.lat)?.toFixed(6)}, {(displayValue.longitude || displayValue.lng)?.toFixed(6)}
              </p>
            </div>
          ) : (
            <span className={fieldMode ? "text-base" : "text-sm"}>📍 {t('form.captureGPS')}</span>
          )}
        </div>
      </button>
    </div>
  );
};

// Inline FormField component for public surveys - optimized
const SurveyFormField = ({ 
  field, 
  value, 
  onChange,
  autoDetectedLocation,
  fieldMode = false,
  t,
}: { 
  field: DbSurveyField; 
  value: any; 
  onChange: (value: any) => void;
  autoDetectedLocation: { lat: number; lng: number } | null;
  fieldMode?: boolean;
  t: (key: string) => string;
}) => {
  const renderField = () => {
    switch (field.field_type) {
      case 'text':
        return (
          <TextInput
            value={value || ''}
            onChange={onChange}
            placeholder={field.placeholder || t('form.enterText')}
            fieldMode={fieldMode}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || t('form.enterText')}
            rows={fieldMode ? 5 : 4}
            className={cn(
              "w-full rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none",
              fieldMode 
                ? "px-4 py-4 text-lg sm:text-xl" 
                : "px-4 py-3 text-base"
            )}
          />
        );

      case 'number':
      case 'decimal':
        return (
          <TextInput
            type="number"
            value={value?.toString() || ''}
            onChange={(v) => onChange(v ? Number(v) : '')}
            placeholder={field.placeholder || t('form.enterNumber')}
            min={field.min_value || undefined}
            max={field.max_value || undefined}
            fieldMode={fieldMode}
          />
        );

      case 'email':
        return (
          <TextInput
            type="email"
            value={value || ''}
            onChange={onChange}
            placeholder={field.placeholder || t('form.enterEmail')}
            fieldMode={fieldMode}
          />
        );

      case 'phone':
        return (
          <TextInput
            type="tel"
            value={value || ''}
            onChange={onChange}
            placeholder={field.placeholder || t('form.enterPhone')}
            fieldMode={fieldMode}
          />
        );

      case 'select':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={cn(
                  'w-full rounded-lg border text-left transition-all duration-200 flex items-center justify-between',
                  value === option.value
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50',
                  fieldMode ? 'px-4 py-4' : 'px-4 py-3'
                )}
              >
                <span className={fieldMode ? "text-lg" : "text-base"}>{option.label}</span>
                {value === option.value && <Check className={cn("text-primary", fieldMode ? "h-5 w-5" : "h-4 w-4")} />}
              </button>
            ))}
          </div>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options?.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onChange(selectedValues.filter((v: string) => v !== option.value));
                    } else {
                      onChange([...selectedValues, option.value]);
                    }
                  }}
                  className={cn(
                    'w-full rounded-lg border text-left transition-all duration-200 flex items-center justify-between',
                    isSelected
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-background text-foreground hover:border-primary/50',
                    fieldMode ? 'px-4 py-4' : 'px-4 py-3'
                  )}
                >
                  <span className={fieldMode ? "text-lg" : "text-base"}>{option.label}</span>
                  {isSelected && <Check className={cn("text-primary", fieldMode ? "h-5 w-5" : "h-4 w-4")} />}
                </button>
              );
            })}
          </div>
        );

      case 'rating':
        const maxRating = field.max_value || 5;
        return (
          <div className="flex gap-2 flex-wrap justify-center">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => onChange(rating)}
                className={cn(
                  'rounded-lg border transition-all duration-200',
                  (value || 0) >= rating
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                    : 'border-border bg-background text-muted-foreground hover:border-yellow-500/50',
                  fieldMode ? 'p-4' : 'p-3'
                )}
              >
                <Star className={cn((value || 0) >= rating && 'fill-current', fieldMode ? 'h-8 w-8' : 'h-6 w-6')} />
              </button>
            ))}
          </div>
        );

      case 'range':
        return (
          <div className="space-y-3">
            <input
              type="range"
              min={field.min_value || 0}
              max={field.max_value || 100}
              value={value || field.min_value || 0}
              onChange={(e) => onChange(parseInt(e.target.value))}
              className="w-full h-3 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className={cn("flex justify-between text-muted-foreground", fieldMode ? "text-base" : "text-sm")}>
              <span>{field.min_value || 0}</span>
              <span className={cn("font-bold text-foreground", fieldMode ? "text-2xl" : "text-lg")}>{value || field.min_value || 0}</span>
              <span>{field.max_value || 100}</span>
            </div>
          </div>
        );

      case 'date':
        // Auto-fill with today's date if empty
        const todayDate = new Date().toISOString().split('T')[0];
        const displayDate = value || todayDate;
        
        // Auto-set if not already set
        if (!value) {
          // Schedule update to avoid state update during render
          setTimeout(() => onChange(todayDate), 0);
        }
        
        return (
          <div className="space-y-2">
            <div className="relative">
              <Calendar className={cn("absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", fieldMode ? "h-6 w-6" : "h-5 w-5")} />
              <input
                type="date"
                value={displayDate}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
                  fieldMode 
                    ? "pl-12 pr-4 py-4 text-lg" 
                    : "pl-10 pr-4 py-3 text-base"
                )}
              />
            </div>
            <p className={cn("text-muted-foreground flex items-center gap-1", fieldMode ? "text-sm" : "text-xs")}>
              <Check className="h-3 w-3 text-green-500" />
              {t('form.autoFilled')}
            </p>
          </div>
        );

      case 'time':
        // Auto-fill with current time if empty
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const displayTime = value || currentTime;
        
        // Auto-set if not already set
        if (!value) {
          setTimeout(() => onChange(currentTime), 0);
        }
        
        return (
          <div className="space-y-2">
            <div className="relative">
              <Clock className={cn("absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", fieldMode ? "h-6 w-6" : "h-5 w-5")} />
              <input
                type="time"
                value={displayTime}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
                  fieldMode 
                    ? "pl-12 pr-4 py-4 text-lg" 
                    : "pl-10 pr-4 py-3 text-base"
                )}
              />
            </div>
            <p className={cn("text-muted-foreground flex items-center gap-1", fieldMode ? "text-sm" : "text-xs")}>
              <Check className="h-3 w-3 text-green-500" />
              {t('form.autoFilled')}
            </p>
          </div>
        );

      case 'datetime':
        // Auto-fill with current datetime if empty
        const nowDt = new Date();
        const currentDateTime = nowDt.toISOString().slice(0, 16);
        const displayDateTime = value || currentDateTime;
        
        // Auto-set if not already set
        if (!value) {
          setTimeout(() => onChange(currentDateTime), 0);
        }
        
        return (
          <div className="space-y-2">
            <input
              type="datetime-local"
              value={displayDateTime}
              onChange={(e) => onChange(e.target.value)}
              className={cn(
                "w-full rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
                fieldMode 
                  ? "px-4 py-4 text-lg" 
                  : "px-4 py-3 text-base"
              )}
            />
            <p className={cn("text-muted-foreground flex items-center gap-1", fieldMode ? "text-sm" : "text-xs")}>
              <Check className="h-3 w-3 text-green-500" />
              {t('form.autoFilled')}
            </p>
          </div>
        );

      case 'location':
        return (
          <LocationFieldWithAutoDetect
            value={value}
            onChange={onChange}
            autoDetectedLocation={autoDetectedLocation}
            fieldMode={fieldMode}
            t={t}
          />
        );

      case 'photo':
        return (
          <div>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              capture="environment"
              className="hidden"
              id={`photo-${field.id}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                  if (!allowedTypes.includes(file.type)) {
                    toast.error('Format non supporté. Utilisez JPEG, PNG ou WebP');
                    e.target.value = '';
                    return;
                  }
                  
                  const maxSize = 5 * 1024 * 1024;
                  if (file.size > maxSize) {
                    toast.error('Image trop volumineuse. Maximum 5MB');
                    e.target.value = '';
                    return;
                  }
                  
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    onChange(e.target?.result);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <label
              htmlFor={`photo-${field.id}`}
              className={cn(
                'block w-full rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer',
                value ? 'border-green-500 bg-green-500/5' : 'border-border hover:border-primary/50'
              )}
            >
              {value ? (
                <img src={value} alt="Captured" className={cn("w-full object-cover rounded-lg", fieldMode ? "h-56" : "h-48")} />
              ) : (
                <div className={cn("flex flex-col items-center justify-center text-muted-foreground", fieldMode ? "py-12" : "py-8")}>
                  <Camera className={cn("mb-2", fieldMode ? "h-10 w-10" : "h-8 w-8")} />
                  <span className={fieldMode ? "text-base" : "text-sm"}>{t('form.takePhoto')}</span>
                  <span className={cn("text-muted-foreground mt-1", fieldMode ? "text-sm" : "text-xs")}>JPEG, PNG, WebP (max 5MB)</span>
                </div>
              )}
            </label>
          </div>
        );

      case 'consent':
        return (
          <button
            type="button"
            onClick={() => onChange(!value)}
            className={cn(
              'w-full rounded-lg border text-left transition-all duration-200 flex items-center gap-3',
              value
                ? 'border-green-500 bg-green-500/5 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50',
              fieldMode ? 'px-4 py-5' : 'px-4 py-4'
            )}
          >
            <div className={cn(
              'rounded border-2 flex items-center justify-center transition-colors',
              value ? 'border-green-500 bg-green-500' : 'border-muted-foreground',
              fieldMode ? 'w-6 h-6' : 'w-5 h-5'
            )}>
              {value && <Check className={cn("text-white", fieldMode ? "h-4 w-4" : "h-3 w-3")} />}
            </div>
            <span className={fieldMode ? "text-lg" : "text-base"}>Je donne mon consentement</span>
          </button>
        );

      case 'note':
        return (
          <div className={cn("bg-muted/50 rounded-lg text-muted-foreground", fieldMode ? "p-5 text-base" : "p-4 text-sm")}>
            {field.placeholder || 'Information'}
          </div>
        );

      case 'ranking':
        const rankItems = field.options || [];
        const rankings = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            <p className={cn("text-muted-foreground", fieldMode ? "text-base" : "text-sm")}>Ordonnez les éléments par ordre de préférence</p>
            {rankItems.map((option, idx) => {
              const currentRank = rankings.indexOf(option.value) + 1;
              return (
                <div
                  key={option.value}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border cursor-pointer transition-all',
                    currentRank > 0
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:border-primary/50',
                    fieldMode ? 'px-4 py-4' : 'px-4 py-3'
                  )}
                  onClick={() => {
                    if (currentRank > 0) {
                      onChange(rankings.filter((v: string) => v !== option.value));
                    } else {
                      onChange([...rankings, option.value]);
                    }
                  }}
                >
                  <div className={cn(
                    'rounded-full flex items-center justify-center font-bold',
                    currentRank > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    fieldMode ? 'w-8 h-8 text-base' : 'w-6 h-6 text-xs'
                  )}>
                    {currentRank > 0 ? currentRank : idx + 1}
                  </div>
                  <GripVertical className={cn("text-muted-foreground", fieldMode ? "h-5 w-5" : "h-4 w-4")} />
                  <span className={cn("flex-1 text-foreground", fieldMode ? "text-lg" : "text-base")}>{option.label}</span>
                </div>
              );
            })}
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-3">
            <input
              type="file"
              accept="audio/*"
              capture="user"
              className="hidden"
              id={`audio-${field.id}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 10 * 1024 * 1024) {
                    toast.error('Audio trop volumineux. Maximum 10MB');
                    e.target.value = '';
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => onChange(ev.target?.result);
                  reader.readAsDataURL(file);
                }
              }}
            />
            <label
              htmlFor={`audio-${field.id}`}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-all',
                value ? 'border-green-500 bg-green-500/5' : 'border-border hover:border-primary/50',
                fieldMode ? 'py-12' : 'py-8'
              )}
            >
              <Mic className={cn('mb-2', value ? 'text-green-500' : 'text-muted-foreground', fieldMode ? 'h-10 w-10' : 'h-8 w-8')} />
              <span className={cn("text-muted-foreground", fieldMode ? "text-base" : "text-sm")}>
                {value ? `${t('form.audioRecorded')} ✓` : t('form.recordAudio')}
              </span>
            </label>
            {value && (
              <audio controls src={value} className="w-full" />
            )}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-3">
            <input
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              id={`video-${field.id}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 50 * 1024 * 1024) {
                    toast.error('Vidéo trop volumineuse. Maximum 50MB');
                    e.target.value = '';
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => onChange(ev.target?.result);
                  reader.readAsDataURL(file);
                }
              }}
            />
            <label
              htmlFor={`video-${field.id}`}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-all',
                value ? 'border-green-500 bg-green-500/5' : 'border-border hover:border-primary/50',
                fieldMode ? 'py-12' : 'py-8'
              )}
            >
              <Video className={cn('mb-2', value ? 'text-green-500' : 'text-muted-foreground', fieldMode ? 'h-10 w-10' : 'h-8 w-8')} />
              <span className={cn("text-muted-foreground", fieldMode ? "text-base" : "text-sm")}>
                {value ? `${t('form.videoCaptured')} ✓` : t('form.captureVideo')}
              </span>
            </label>
            {value && (
              <video controls src={value} className="w-full rounded-lg" />
            )}
          </div>
        );

      case 'file':
        return (
          <div className="space-y-3">
            <input
              type="file"
              className="hidden"
              id={`file-${field.id}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 10 * 1024 * 1024) {
                    toast.error('Fichier trop volumineux. Maximum 10MB');
                    e.target.value = '';
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => onChange({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: ev.target?.result
                  });
                  reader.readAsDataURL(file);
                }
              }}
            />
            <label
              htmlFor={`file-${field.id}`}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-all',
                value ? 'border-green-500 bg-green-500/5' : 'border-border hover:border-primary/50',
                fieldMode ? 'py-12' : 'py-8'
              )}
            >
              <File className={cn('mb-2', value ? 'text-green-500' : 'text-muted-foreground', fieldMode ? 'h-10 w-10' : 'h-8 w-8')} />
              <span className={cn("text-muted-foreground", fieldMode ? "text-base" : "text-sm")}>
                {value ? `${value.name} ✓` : t('form.uploadFile')}
              </span>
              <span className={cn("text-muted-foreground mt-1", fieldMode ? "text-sm" : "text-xs")}>{t('form.maxSize')} 10MB</span>
            </label>
          </div>
        );

      case 'line':
      case 'area':
        return (
          <div className={cn("bg-muted/30 rounded-lg text-center", fieldMode ? "p-5" : "p-4")}>
            <div className={cn("flex items-center justify-center gap-2 text-muted-foreground mb-2", fieldMode ? "text-base" : "text-sm")}>
              {field.field_type === 'line' ? <Minus className={fieldMode ? "h-6 w-6" : "h-5 w-5"} /> : <Square className={fieldMode ? "h-6 w-6" : "h-5 w-5"} />}
              <span className="font-medium">
                {field.field_type === 'line' ? 'Tracer une ligne' : 'Délimiter une zone'}
              </span>
            </div>
            <p className={cn("text-muted-foreground", fieldMode ? "text-sm" : "text-xs")}>
              Fonctionnalité cartographique avancée (disponible sur tablette)
            </p>
            <LocationFieldWithAutoDetect
              value={value}
              onChange={onChange}
              autoDetectedLocation={autoDetectedLocation}
              fieldMode={fieldMode}
              t={t}
            />
          </div>
        );

      case 'barcode':
        return (
          <div className="space-y-3">
            <TextInput
              value={value || ''}
              onChange={onChange}
              placeholder="Code-barres ou QR code"
              fieldMode={fieldMode}
            />
            <div className={cn("bg-muted/30 rounded-lg text-center", fieldMode ? "p-5" : "p-4")}>
              <QrCode className={cn("mx-auto mb-2 text-muted-foreground", fieldMode ? "h-10 w-10" : "h-8 w-8")} />
              <p className={cn("text-muted-foreground", fieldMode ? "text-sm" : "text-xs")}>
                Entrez le code manuellement ou utilisez un scanner externe
              </p>
            </div>
          </div>
        );

      case 'signature':
        return (
          <div className="space-y-3">
            <div
              className={cn(
                'rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all',
                value ? 'border-green-500 bg-green-500/5' : 'border-border hover:border-primary/50',
                fieldMode ? 'h-40' : 'h-32'
              )}
              onClick={() => {
                if (!value) {
                  const sig = `Signature capturée le ${new Date().toLocaleString('fr-FR')}`;
                  onChange(sig);
                  toast.success('Signature enregistrée');
                }
              }}
            >
              {value ? (
                <div className="text-center">
                  <PenTool className={cn("mx-auto mb-2 text-green-500", fieldMode ? "h-10 w-10" : "h-8 w-8")} />
                  <span className={cn("text-green-600", fieldMode ? "text-base" : "text-sm")}>Signature validée ✓</span>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <PenTool className={cn("mx-auto mb-2", fieldMode ? "h-10 w-10" : "h-8 w-8")} />
                  <span className={fieldMode ? "text-base" : "text-sm"}>Touchez pour signer</span>
                </div>
              )}
            </div>
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className={cn("text-destructive hover:underline", fieldMode ? "text-sm" : "text-xs")}
              >
                Effacer la signature
              </button>
            )}
          </div>
        );

      case 'calculate':
        return (
          <div className={cn("bg-muted/30 rounded-lg", fieldMode ? "p-5" : "p-4")}>
            <div className={cn("flex items-center gap-2 text-muted-foreground", fieldMode ? "text-base" : "text-sm")}>
              <Calculator className={fieldMode ? "h-6 w-6" : "h-5 w-5"} />
              <span>Valeur calculée automatiquement</span>
            </div>
            {value !== undefined && value !== '' && (
              <p className={cn("mt-2 font-semibold text-foreground", fieldMode ? "text-2xl" : "text-lg")}>{value}</p>
            )}
          </div>
        );

      case 'hidden':
        return null;

      case 'matrix':
        // Support both formats: { type: 'row' } or { value: 'row_X' }
        const matrixRows = field.options?.filter((o: any) => o.type === 'row' || o.value?.startsWith('row_')) || [];
        const matrixCols = field.options?.filter((o: any) => o.type === 'column' || o.value?.startsWith('col_')) || [];
        const matrixValues = value || {};
        
        if (matrixRows.length === 0 || matrixCols.length === 0) {
          return (
            <div className={cn("bg-muted/30 rounded-lg text-center", fieldMode ? "p-5" : "p-4")}>
              <Grid className={cn("mx-auto mb-2 text-muted-foreground", fieldMode ? "h-10 w-10" : "h-8 w-8")} />
              <p className={cn("text-muted-foreground", fieldMode ? "text-base" : "text-sm")}>Grille de questions (configuration requise)</p>
            </div>
          );
        }

        return (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className={cn("w-full", fieldMode ? "text-base" : "text-sm")}>
              <thead>
                <tr>
                  <th className="p-2"></th>
                  {matrixCols.map((col: any) => (
                    <th key={col.value} className="p-2 text-center text-muted-foreground font-medium">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row: any) => (
                  <tr key={row.value} className="border-t border-border">
                    <td className={cn("p-2 font-medium text-foreground", fieldMode ? "text-base" : "text-sm")}>{row.label}</td>
                    {matrixCols.map((col: any) => (
                      <td key={col.value} className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            onChange({
                              ...matrixValues,
                              [row.value]: col.value
                            });
                          }}
                          className={cn(
                            'rounded-full border-2 transition-all',
                            matrixValues[row.value] === col.value
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground hover:border-primary',
                            fieldMode ? 'w-8 h-8' : 'w-6 h-6'
                          )}
                        >
                          {matrixValues[row.value] === col.value && (
                            <Check className={cn("text-white mx-auto", fieldMode ? "h-4 w-4" : "h-3 w-3")} />
                          )}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        // Handle surveyor_id with auto-suggestions and profile selection
        if (field.field_type === 'surveyor_id') {
          return (
            <PublicSurveyorIdField
              value={value}
              onChange={onChange}
              fieldMode={fieldMode}
            />
          );
        }
        return (
          <TextInput
            value={value || ''}
            onChange={onChange}
            placeholder={field.placeholder || ''}
            fieldMode={fieldMode}
          />
        );
    }
  };

  return (
    <div className={cn("bg-card rounded-xl border border-border shadow-sm", fieldMode ? "p-5" : "p-4")}>
      <label className={cn("block font-semibold text-foreground mb-3", fieldMode ? "text-xl sm:text-2xl" : "text-base")}>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </label>
      {renderField()}
    </div>
  );
};

const Survey = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { t, i18n } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const [pendingResponses, setPendingResponses] = useLocalStorage<PendingResponse[]>('pending_responses', []);
  
  const [survey, setSurvey] = useState<DbSurvey | null>(null);
  const [fields, setFields] = useState<DbSurveyField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [autoDetectedLocation, setAutoDetectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cachedSurvey, setCachedSurvey] = useLocalStorage<{ survey: DbSurvey; fields: DbSurveyField[] } | null>(`survey_cache_${id}`, null);
  
  // Mode collecte terrain - navigation par étapes
  const [fieldMode, setFieldMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  // Auto-detect location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setAutoDetectedLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Auto-location detection failed:', error);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    if (id) {
      loadSurvey();
    }
  }, [id]);

  // SEO (SPA): update <title> + meta description in <head>
  useEffect(() => {
    const pageTitle = `${survey?.title || t('nav.surveys')} | Youcollect`;
    document.title = pageTitle;

    const description = survey?.description || "Répondez à cette enquête";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [survey, t]);

  const loadSurvey = async () => {
    try {
      // Try to load from cache first if offline
      if (!isOnline && cachedSurvey) {
        setSurvey(cachedSurvey.survey);
        setFields(cachedSurvey.fields);
        initializeFormData(cachedSurvey.fields);
        setLoading(false);
        return;
      }

      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .eq('status', 'active')
        .single();

      if (surveyError) throw surveyError;
      if (!surveyData) {
        // Try cache if survey not found online
        if (cachedSurvey) {
          setSurvey(cachedSurvey.survey);
          setFields(cachedSurvey.fields);
          initializeFormData(cachedSurvey.fields);
          setLoading(false);
          return;
        }
        setError('Enquête non trouvée ou inactive');
        setLoading(false);
        return;
      }

      setSurvey(surveyData as DbSurvey);

      const { data: fieldsData, error: fieldsError } = await supabase
        .from('survey_fields')
        .select('*')
        .eq('survey_id', id)
        .order('field_order', { ascending: true });

      if (fieldsError) throw fieldsError;
      
      setFields(fieldsData as DbSurveyField[]);
      
      // Cache the survey for offline use
      setCachedSurvey({ survey: surveyData as DbSurvey, fields: fieldsData as DbSurveyField[] });
      
      initializeFormData(fieldsData as DbSurveyField[]);
    } catch (err) {
      console.error('Error loading survey:', err);
      // Try cache on error
      if (cachedSurvey) {
        setSurvey(cachedSurvey.survey);
        setFields(cachedSurvey.fields);
        initializeFormData(cachedSurvey.fields);
      } else {
        setError('Erreur lors du chargement de l\'enquête');
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeFormData = (fieldsData: DbSurveyField[]) => {
    const initialData: Record<string, any> = {};
    fieldsData.forEach(field => {
      if (field.field_type === 'multiselect') {
        initialData[field.id] = [];
      } else {
        initialData[field.id] = '';
      }
    });
    setFormData(initialData);
  };

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  const validateForm = (): boolean => {
    for (const field of fields) {
      if (field.required) {
        const value = formData[field.id];
        if (value === undefined || value === null || value === '') {
          toast.error(`${field.label}: ${t('form.fieldRequired')}`);
          return false;
        }
        if (Array.isArray(value) && value.length === 0) {
          toast.error(`${field.label}: ${t('form.fieldRequired')}`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!survey) return;

    setSubmitting(true);

    // Get location from form data or auto-detected
    const locationField = fields.find(f => f.field_type === 'location');
    let location = autoDetectedLocation;
    if (locationField && formData[locationField.id]) {
      const locData = formData[locationField.id];
      location = {
        lat: locData.latitude || locData.lat,
        lng: locData.longitude || locData.lng,
      };
    }

    // Extract surveyor info from surveyor_id field if present
    const surveyorField = fields.find(f => f.field_type === 'surveyor_id');
    let surveyorId: string | null = null;
    let badgeId: string | null = null;
    let surveyorValidated = false;
    
    if (surveyorField && formData[surveyorField.id]) {
      const surveyorData = formData[surveyorField.id];
      if (typeof surveyorData === 'object') {
        surveyorId = surveyorData.surveyor_id || null;
        badgeId = surveyorData.badge_id || null;
        surveyorValidated = surveyorData.surveyor_validated || false;
      } else if (typeof surveyorData === 'string') {
        surveyorId = surveyorData;
      }
    }

    const responseData: PendingResponse = {
      id: crypto.randomUUID(),
      survey_id: survey.id,
      data: formData,
      location,
      created_at: new Date().toISOString(),
    };

    const saveLocally = () => {
      setPendingResponses((prev) => [...prev, responseData]);
    };

    const markSubmitted = (mode: 'synced' | 'pending') => {
      setSubmitted(true);
      if (mode === 'synced') {
        toast.success('Réponse synchronisée avec le serveur !');
      } else {
        toast.success('Réponse sauvegardée localement (sera synchronisée)');
      }
    };

    // Try to insert immediately when online; fallback to local queue if it fails.
    if (isOnline) {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // If not authenticated, we can't write to the database with current security rules.
        if (!user) {
          saveLocally();
          toast.warning('Connexion requise pour synchroniser. Réponse conservée sur ce téléphone.');
          setSubmitted(true);
          setSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from('survey_responses')
          .insert({
            survey_id: survey.id,
            user_id: user.id,
            data: formData,
            location,
            sync_status: 'synced',
            surveyor_id: surveyorId,
            badge_id: badgeId,
            surveyor_validated: surveyorValidated,
          });

        if (error) {
          saveLocally();
          markSubmitted('pending');
        } else {
          // Also try to sync any already-pending items
          syncPendingResponsesNow(user.id);
          markSubmitted('synced');
        }
      } catch (err) {
        console.error('Error syncing response:', err);
        saveLocally();
        markSubmitted('pending');
      } finally {
        setSubmitting(false);
      }

      return;
    }

    // Offline: queue locally
    saveLocally();
    markSubmitted('pending');
    setSubmitting(false);
  };

  // Sync pending responses when online
  const syncPendingResponsesNow = async (userId: string) => {
    const currentPending = pendingResponses.filter(r => r.survey_id !== survey?.id); // exclude just synced
    if (currentPending.length === 0) return;
    
    let syncedCount = 0;
    const remainingResponses: PendingResponse[] = [];
    
    for (const response of currentPending) {
      try {
        const { error } = await supabase
          .from('survey_responses')
          .insert({
            survey_id: response.survey_id,
            user_id: userId,
            data: response.data,
            location: response.location,
            sync_status: 'synced',
          });
        
        if (!error) {
          syncedCount++;
        } else {
          remainingResponses.push(response);
        }
      } catch (err) {
        remainingResponses.push(response);
      }
    }
    
    if (syncedCount > 0) {
      setPendingResponses(remainingResponses);
      toast.success(`${syncedCount} réponse(s) en attente synchronisée(s)`);
    }
  };

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      if (pendingResponses.length === 0) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        toast.info('Connexion rétablie, synchronisation en cours...');
        
        let syncedCount = 0;
        const remainingResponses: PendingResponse[] = [];
        
        for (const response of pendingResponses) {
          try {
            const { error } = await supabase
              .from('survey_responses')
              .insert({
                survey_id: response.survey_id,
                user_id: user.id,
                data: response.data,
                location: response.location,
                sync_status: 'synced',
              });
            
            if (!error) {
              syncedCount++;
            } else {
              remainingResponses.push(response);
            }
          } catch (err) {
            remainingResponses.push(response);
          }
        }
        
        setPendingResponses(remainingResponses);
        
        if (syncedCount > 0) {
          toast.success(`${syncedCount} réponse(s) synchronisée(s) avec le serveur`);
        }
      }
    };
    
    window.addEventListener('online', handleOnline);
    
    // Initial sync check on mount if online
    if (isOnline && pendingResponses.length > 0) {
      handleOnline();
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleNewResponse = () => {
    setSubmitted(false);
    setCurrentStep(0);
    initializeFormData(fields);
  };

  // Navigation mode collecte terrain
  const goToNextStep = () => {
    if (currentStep < fields.length - 1) {
      // Validate current field if required
      const currentField = fields[currentStep];
      if (currentField.required) {
        const value = formData[currentField.id];
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          toast.error(`Ce champ est obligatoire`);
          return;
        }
      }
      setCurrentStep(prev => prev + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const isLastStep = currentStep === fields.length - 1;
  const progressPercent = fields.length > 0 ? ((currentStep + 1) / fields.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('survey.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">{t('survey.notFound')}</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    // Count pending + this one
    const myResponseCount = pendingResponses.filter(r => r.survey_id === survey?.id).length;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="bg-green-500/10 p-4 rounded-full w-fit mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{t('form.thankYou')}</h2>
            <p className="text-muted-foreground mb-2">
              {t('form.submitted')}
            </p>
            {myResponseCount > 0 && (
              <p className="text-sm text-primary font-medium mb-6">
                📊 {myResponseCount} {myResponseCount === 1 ? t('form.responseRecorded') : t('form.responsesRecorded')}
              </p>
            )}
            <Button onClick={handleNewResponse} className="w-full">
              {t('form.newResponse')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get cover image or use default
  const coverImage = survey?.cover_image_url || defaultFormImage;

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Desktop: Side image panel - square format */}
      <div className="hidden lg:flex lg:w-[400px] xl:w-[450px] fixed right-8 top-1/2 -translate-y-1/2 z-10">
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-border/50">
          <img 
            src={coverImage}
            alt={survey?.title || 'Survey'}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = defaultFormImage; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Survey info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h2 className="text-white font-bold text-lg mb-1 line-clamp-2">{survey?.title}</h2>
            {survey?.description && (
              <p className="text-white/80 text-sm line-clamp-2">{survey.description}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="w-full lg:w-[calc(100%-450px)] xl:w-[calc(100%-500px)] lg:pr-0">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="min-w-0 flex-1">
                  <h1 className="font-bold text-foreground truncate text-xs sm:text-sm">{survey?.title}</h1>
                  {survey?.description && (
                    <>
                      {/* Desktop: show description inline */}
                      <p className="text-[10px] sm:text-xs text-muted-foreground/80 truncate hidden sm:block lg:hidden">{survey.description}</p>
                      {/* Mobile: show info icon with tooltip/popover for description */}
                      <div className="sm:hidden flex items-center gap-1 text-[10px] text-muted-foreground/80">
                        <button
                          onClick={() => toast.info(survey.description, { duration: 5000 })}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          <Info className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">{survey.description.slice(0, 30)}{survey.description.length > 30 ? '...' : ''}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              {/* Field Mode Toggle */}
              <button
                onClick={() => {
                  setFieldMode(!fieldMode);
                  setCurrentStep(0);
                }}
                className={cn(
                  "p-1.5 sm:p-2 rounded-lg transition-colors text-xs",
                  fieldMode 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted text-foreground"
                )}
                title={fieldMode ? "Mode normal" : "Mode collecte terrain"}
              >
                <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label={resolvedTheme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                ) : (
                  <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                )}
              </button>

              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-0.5 sm:gap-1">
                    <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                    <span className="text-[10px] sm:text-xs font-medium uppercase text-foreground">
                      {i18n.language}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => changeLanguage('fr')}
                    className={cn(i18n.language === 'fr' && 'bg-primary/10')}
                  >
                    🇫🇷 Français
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => changeLanguage('en')}
                    className={cn(i18n.language === 'en' && 'bg-primary/10')}
                  >
                    🇬🇧 English
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {isOnline ? (
                <span className="flex items-center text-green-600">
                  <Wifi className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </span>
              ) : (
                <span className="flex items-center text-orange-600">
                  <WifiOff className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </span>
              )}
              {pendingResponses.length > 0 && (
                <span className="text-[10px] sm:text-xs bg-orange-500/10 text-orange-600 px-1.5 sm:px-2 py-0.5 rounded-full">
                  {pendingResponses.length}
                </span>
              )}
            </div>
          </div>
          
          {/* Progress bar for field mode */}
          {fieldMode && fields.length > 0 && (
            <div className="mt-2">
              <Progress value={progressPercent} className="h-1.5" />
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 text-center">
                {currentStep + 1} / {fields.length}
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {fieldMode ? (
          // Mode collecte terrain - une question à la fois
          <div className="space-y-4">
            {fields.length > 0 && (
              <SurveyFormField
                key={fields[currentStep].id}
                field={fields[currentStep]}
                value={formData[fields[currentStep].id]}
                onChange={(value) => handleFieldChange(fields[currentStep].id, value)}
                autoDetectedLocation={autoDetectedLocation}
                fieldMode={true}
                t={t}
              />
            )}
            
            {/* Navigation buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                disabled={currentStep === 0}
                className="flex-1 py-5 sm:py-6 text-base sm:text-lg"
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                {t('common.previous')}
              </Button>
              
              {isLastStep ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-5 sm:py-6 text-base sm:text-lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      {t('form.submitting')}
                    </>
                  ) : (
                    t('form.submit')
                  )}
                </Button>
              ) : (
                <Button
                  onClick={goToNextStep}
                  className="flex-1 py-5 sm:py-6 text-base sm:text-lg"
                >
                  {t('common.next')}
                  <ChevronRight className="h-5 w-5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          // Mode normal - toutes les questions
          <>
            <div className="space-y-3 sm:space-y-4">
              {fields.map((field) => (
                <SurveyFormField
                  key={field.id}
                  field={field}
                  value={formData[field.id]}
                  onChange={(value) => handleFieldChange(field.id, value)}
                  autoDetectedLocation={autoDetectedLocation}
                  fieldMode={false}
                  t={t}
                />
              ))}
            </div>

            {/* Submit button */}
            <div className="mt-6 sm:mt-8 pb-6 sm:pb-8">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-5 sm:py-6 text-base sm:text-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {t('form.submitting')}
                  </>
                ) : (
                  t('form.submit')
                )}
              </Button>
            </div>
          </>
        )}
      </main>

      {/* PWA Install Banner */}
      <PWAInstallBanner />
      </div>
    </div>
  );
};

export default Survey;
