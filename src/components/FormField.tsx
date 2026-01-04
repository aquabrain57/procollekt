import { useState, useEffect } from 'react';
import { Camera, MapPin, Star, Check, Loader2, Clock } from 'lucide-react';
import { FormField as FormFieldType } from '@/types/survey';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FormFieldProps {
  field: FormFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

// Component for displaying location with city name
const LocationFieldDisplay = ({ 
  value, 
  onCapture, 
  hasValue 
}: { 
  value: any; 
  onCapture: () => void; 
  hasValue: boolean;
}) => {
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isLoadingName, setIsLoadingName] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (value?.latitude && value?.longitude) {
      setIsLoadingName(true);
      fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${value.latitude}&longitude=${value.longitude}&localityLanguage=fr`
      )
        .then((res) => res.json())
        .then((data) => {
          const parts = [];
          if (data.locality) parts.push(data.locality);
          else if (data.city) parts.push(data.city);
          if (data.principalSubdivision) parts.push(data.principalSubdivision);
          if (data.countryName) parts.push(data.countryName);
          
          setLocationName(parts.length > 0 ? parts.join(', ') : null);
        })
        .catch(() => setLocationName(null))
        .finally(() => setIsLoadingName(false));
    }
  }, [value?.latitude, value?.longitude]);

  const handleCapture = async () => {
    setIsCapturing(true);
    onCapture();
    setTimeout(() => setIsCapturing(false), 3000);
  };

  return (
    <button
      type="button"
      onClick={handleCapture}
      disabled={isCapturing}
      className={cn(
        'w-full px-4 py-4 rounded-lg border text-left transition-all duration-200 touch-target flex items-center gap-3',
        hasValue
          ? 'border-success bg-success/5 text-foreground'
          : 'border-border bg-background text-muted-foreground hover:border-primary/50'
      )}
    >
      {isCapturing ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : (
        <MapPin className={cn('h-5 w-5', hasValue ? 'text-success' : 'text-muted-foreground')} />
      )}
      {hasValue ? (
        <div className="flex flex-col">
          {isLoadingName ? (
            <span className="text-sm text-muted-foreground">Chargement...</span>
          ) : locationName ? (
            <>
              <span className="text-sm font-medium">{locationName}</span>
              <span className="text-xs text-muted-foreground">
                {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
              </span>
            </>
          ) : (
            <span className="text-sm">
              {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
            </span>
          )}
        </div>
      ) : (
        <span>{isCapturing ? 'Capture en cours...' : 'Capturer la position GPS'}</span>
      )}
    </button>
  );
};

export const FormFieldComponent = ({ field, value, onChange, error }: FormFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);

  const baseInputClass = cn(
    'input-field touch-target',
    error && 'border-destructive focus:ring-destructive/20',
    isFocused && 'form-field-focus'
  );

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            className={baseInputClass}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        );

      case 'textarea':
        return (
          <textarea
            className={cn(baseInputClass, 'min-h-[120px] resize-y')}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            rows={4}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            className={baseInputClass}
            placeholder={field.placeholder || 'exemple@email.com'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        );

      case 'phone':
        return (
          <input
            type="tel"
            className={baseInputClass}
            placeholder={field.placeholder || '+241 XX XX XX XX'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className={baseInputClass}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            min={field.min}
            max={field.max}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            className={baseInputClass}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        );

      case 'time':
        return (
          <div className="relative">
            <input
              type="time"
              className={baseInputClass}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
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
                  'w-full px-4 py-3 rounded-lg border text-left transition-all duration-200 touch-target flex items-center justify-between',
                  value === option.value
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50'
                )}
              >
                <span>{option.label}</span>
                {value === option.value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
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
                    'w-full px-4 py-3 rounded-lg border text-left transition-all duration-200 touch-target flex items-center justify-between',
                    isSelected
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-background text-foreground hover:border-primary/50'
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        );

      case 'rating':
        const maxRating = field.max || 5;
        return (
          <div className="flex gap-2">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => onChange(rating)}
                className={cn(
                  'p-3 rounded-lg border transition-all duration-200 touch-target',
                  (value || 0) >= rating
                    ? 'border-warning bg-warning/10 text-warning'
                    : 'border-border bg-background text-muted-foreground hover:border-warning/50'
                )}
              >
                <Star
                  className={cn(
                    'h-6 w-6',
                    (value || 0) >= rating && 'fill-current'
                  )}
                />
              </button>
            ))}
          </div>
        );

      case 'range':
        const min = field.min || 1;
        const max = field.max || 10;
        return (
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{min}</span>
              <span className="font-medium text-foreground">{value || min}</span>
              <span>{max}</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={value || min}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        );

      case 'location':
        return (
          <LocationFieldDisplay
            value={value}
            hasValue={!!value}
            onCapture={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    onChange({
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                    });
                  },
                  (error) => {
                    console.error('Error getting location:', error);
                    toast.error('Impossible d\'obtenir la position');
                  }
                );
              }
            }}
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
                value
                  ? 'border-success bg-success/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              {value ? (
                <img
                  src={value}
                  alt="Captured"
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Camera className="h-8 w-8 mb-2" />
                  <span className="text-sm">Prendre une photo</span>
                  <span className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP (max 5MB)</span>
                </div>
              )}
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2 slide-up">
      <label className="block font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </label>
      {renderField()}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};