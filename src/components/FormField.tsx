import { useState } from 'react';
import { Camera, MapPin, Star, Check } from 'lucide-react';
import { FormField as FormFieldType } from '@/types/survey';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FormFieldProps {
  field: FormFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

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

      case 'location':
        return (
          <button
            type="button"
            onClick={() => {
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
                  }
                );
              }
            }}
            className={cn(
              'w-full px-4 py-4 rounded-lg border text-left transition-all duration-200 touch-target flex items-center gap-3',
              value
                ? 'border-success bg-success/5 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50'
            )}
          >
            <MapPin className={cn('h-5 w-5', value ? 'text-success' : 'text-muted-foreground')} />
            {value ? (
              <span className="text-sm">
                {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
              </span>
            ) : (
              <span>Capturer la position GPS</span>
            )}
          </button>
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
                  // Validate file type
                  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                  if (!allowedTypes.includes(file.type)) {
                    toast.error('Format non supporté. Utilisez JPEG, PNG ou WebP');
                    e.target.value = '';
                    return;
                  }
                  
                  // Validate file size (max 5MB)
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
