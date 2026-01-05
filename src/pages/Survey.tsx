import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DbSurvey, DbSurveyField } from '@/hooks/useSurveys';
import { Loader2, AlertCircle, CheckCircle, MapPin, Wifi, WifiOff, Camera, Star, Check, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';

interface PendingResponse {
  id: string;
  survey_id: string;
  data: Record<string, any>;
  location: { lat: number; lng: number } | null;
  created_at: string;
}

// Hook pour le reverse geocoding
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
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=fr`
        );
        const data = await response.json();
        const city = data.city || data.locality || data.principalSubdivision || '';
        const country = data.countryName || '';
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
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
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
      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
    />
  );
};

// Location field with auto-detection and city name display
const LocationFieldWithAutoDetect = ({
  value,
  onChange,
  autoDetectedLocation,
}: {
  value: any;
  onChange: (value: any) => void;
  autoDetectedLocation: { lat: number; lng: number } | null;
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
          'w-full px-4 py-4 rounded-lg border text-left transition-all duration-200 flex items-center gap-3',
          displayValue
            ? 'border-green-500 bg-green-500/5 text-foreground'
            : 'border-border bg-background text-muted-foreground hover:border-primary/50'
        )}
      >
        <MapPin className={cn('h-5 w-5', displayValue ? 'text-green-500' : 'text-muted-foreground')} />
        <div className="flex-1">
          {displayValue ? (
            <div>
              {geoLoading ? (
                <span className="text-sm text-muted-foreground">Chargement...</span>
              ) : locationName ? (
                <span className="text-sm font-medium">{locationName}</span>
              ) : (
                <span className="text-sm">
                  {(displayValue.latitude || displayValue.lat)?.toFixed(4)}, {(displayValue.longitude || displayValue.lng)?.toFixed(4)}
                </span>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                GPS: {(displayValue.latitude || displayValue.lat)?.toFixed(6)}, {(displayValue.longitude || displayValue.lng)?.toFixed(6)}
              </p>
            </div>
          ) : (
            <span>Capturer la position GPS</span>
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
}: { 
  field: DbSurveyField; 
  value: any; 
  onChange: (value: any) => void;
  autoDetectedLocation: { lat: number; lng: number } | null;
}) => {
  const renderField = () => {
    switch (field.field_type) {
      case 'text':
        return (
          <TextInput
            value={value || ''}
            onChange={onChange}
            placeholder={field.placeholder || ''}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ''}
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        );

      case 'number':
      case 'decimal':
        return (
          <TextInput
            type="number"
            value={value?.toString() || ''}
            onChange={(v) => onChange(v ? Number(v) : '')}
            placeholder={field.placeholder || ''}
            min={field.min_value || undefined}
            max={field.max_value || undefined}
          />
        );

      case 'email':
        return (
          <TextInput
            type="email"
            value={value || ''}
            onChange={onChange}
            placeholder={field.placeholder || 'email@example.com'}
          />
        );

      case 'phone':
        return (
          <TextInput
            type="tel"
            value={value || ''}
            onChange={onChange}
            placeholder={field.placeholder || '+241 XX XX XX XX'}
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
                  'w-full px-4 py-3 rounded-lg border text-left transition-all duration-200 flex items-center justify-between',
                  value === option.value
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50'
                )}
              >
                <span>{option.label}</span>
                {value === option.value && <Check className="h-4 w-4 text-primary" />}
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
                    'w-full px-4 py-3 rounded-lg border text-left transition-all duration-200 flex items-center justify-between',
                    isSelected
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-background text-foreground hover:border-primary/50'
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        );

      case 'rating':
        const maxRating = field.max_value || 5;
        return (
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => onChange(rating)}
                className={cn(
                  'p-3 rounded-lg border transition-all duration-200',
                  (value || 0) >= rating
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                    : 'border-border bg-background text-muted-foreground hover:border-yellow-500/50'
                )}
              >
                <Star className={cn('h-6 w-6', (value || 0) >= rating && 'fill-current')} />
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
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{field.min_value || 0}</span>
              <span className="font-medium text-foreground">{value || field.min_value || 0}</span>
              <span>{field.max_value || 100}</span>
            </div>
          </div>
        );

      case 'date':
        return (
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="date"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        );

      case 'time':
        return (
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="time"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        );

      case 'location':
        return (
          <LocationFieldWithAutoDetect
            value={value}
            onChange={onChange}
            autoDetectedLocation={autoDetectedLocation}
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
                <img src={value} alt="Captured" className="w-full h-48 object-cover rounded-lg" />
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

      case 'consent':
        return (
          <button
            type="button"
            onClick={() => onChange(!value)}
            className={cn(
              'w-full px-4 py-4 rounded-lg border text-left transition-all duration-200 flex items-center gap-3',
              value
                ? 'border-green-500 bg-green-500/5 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50'
            )}
          >
            <div className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
              value ? 'border-green-500 bg-green-500' : 'border-muted-foreground'
            )}>
              {value && <Check className="h-3 w-3 text-white" />}
            </div>
            <span>Je donne mon consentement</span>
          </button>
        );

      case 'note':
        return (
          <div className="p-4 bg-muted/50 rounded-lg text-muted-foreground">
            {field.placeholder || 'Information'}
          </div>
        );

      default:
        return (
          <TextInput
            value={value || ''}
            onChange={onChange}
            placeholder={field.placeholder || ''}
          />
        );
    }
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <label className="block font-medium text-foreground">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </label>
        {renderField()}
      </CardContent>
    </Card>
  );
};

const Survey = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
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
          toast.error(`Le champ "${field.label}" est obligatoire`);
          return false;
        }
        if (Array.isArray(value) && value.length === 0) {
          toast.error(`Le champ "${field.label}" est obligatoire`);
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

    const responseData: PendingResponse = {
      id: crypto.randomUUID(),
      survey_id: survey.id,
      data: formData,
      location,
      created_at: new Date().toISOString(),
    };

    // Always save locally first (public access - no auth required)
    setPendingResponses(prev => [...prev, responseData]);
    
    // Try to sync if online (using anonymous insert if possible)
    if (isOnline) {
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // If authenticated, insert directly
          const { error } = await supabase
            .from('survey_responses')
            .insert({
              survey_id: survey.id,
              user_id: user.id,
              data: formData,
              location,
              sync_status: 'synced',
            });

          if (!error) {
            // Remove from pending if sync successful
            setPendingResponses(prev => prev.filter(r => r.id !== responseData.id));
          }
        }
        // If not authenticated, keep in local storage for later sync
      } catch (err) {
        console.error('Error syncing response:', err);
        // Keep in local storage
      }
    }

    setSubmitted(true);
    toast.success(isOnline ? 'Réponse enregistrée !' : 'Réponse sauvegardée localement');
    setSubmitting(false);
  };

  const handleNewResponse = () => {
    setSubmitted(false);
    initializeFormData(fields);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de l'enquête...</p>
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
            <h2 className="text-xl font-bold text-foreground mb-2">Erreur</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="bg-green-500/10 p-4 rounded-full w-fit mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Merci !</h2>
            <p className="text-muted-foreground mb-6">
              Votre réponse a été enregistrée avec succès.
            </p>
            <div className="space-y-3">
              <Button onClick={handleNewResponse} className="w-full">
                Nouvelle réponse
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Retour à l'accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-foreground truncate">{survey?.title}</h1>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <Wifi className="h-3 w-3" />
                En ligne
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-orange-600">
                <WifiOff className="h-3 w-3" />
                Hors ligne
              </span>
            )}
            {pendingResponses.length > 0 && (
              <span className="text-xs bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-full">
                {pendingResponses.length} en attente
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {survey?.description && (
          <p className="text-muted-foreground mb-6">{survey.description}</p>
        )}

        <div className="space-y-4">
          {fields.map((field) => (
            <SurveyFormField
              key={field.id}
              field={field}
              value={formData[field.id]}
              onChange={(value) => handleFieldChange(field.id, value)}
              autoDetectedLocation={autoDetectedLocation}
            />
          ))}
        </div>

        {/* Submit button */}
        <div className="mt-8 pb-8">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-6 text-lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              'Soumettre la réponse'
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Survey;
