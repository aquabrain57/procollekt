import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DbSurvey, DbSurveyField } from '@/hooks/useSurveys';
import { Loader2, AlertCircle, CheckCircle, MapPin, Wifi, WifiOff, Camera, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

// Inline FormField component for public surveys
const SurveyFormField = ({ 
  field, 
  value, 
  onChange 
}: { 
  field: DbSurveyField; 
  value: any; 
  onChange: (value: any) => void;
}) => {
  const renderField = () => {
    switch (field.field_type) {
      case 'text':
        return (
          <Input
            type="text"
            placeholder={field.placeholder || ''}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-base"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={field.placeholder || ''}
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            min={field.min_value || undefined}
            max={field.max_value || undefined}
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
          <div className="flex gap-2">
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

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-base"
          />
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
                    toast.success('Position GPS enregistrée');
                  },
                  (error) => {
                    console.error('Error getting location:', error);
                    toast.error('Impossible d\'obtenir la position GPS');
                  }
                );
              }
            }}
            className={cn(
              'w-full px-4 py-4 rounded-lg border text-left transition-all duration-200 flex items-center gap-3',
              value
                ? 'border-green-500 bg-green-500/5 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50'
            )}
          >
            <MapPin className={cn('h-5 w-5', value ? 'text-green-500' : 'text-muted-foreground')} />
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
              accept="image/*"
              capture="environment"
              className="hidden"
              id={`photo-${field.id}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
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
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    if (id) {
      loadSurvey();
    }
  }, [id]);

  // Sync pending responses when online
  useEffect(() => {
    if (isOnline && pendingResponses.length > 0) {
      syncPendingResponses();
    }
  }, [isOnline]);

  const loadSurvey = async () => {
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .eq('status', 'active')
        .single();

      if (surveyError) throw surveyError;
      if (!surveyData) {
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

      // Initialize form data
      const initialData: Record<string, any> = {};
      fieldsData.forEach(field => {
        if (field.field_type === 'multiselect') {
          initialData[field.id] = [];
        } else {
          initialData[field.id] = '';
        }
      });
      setFormData(initialData);
    } catch (err) {
      console.error('Error loading survey:', err);
      setError('Erreur lors du chargement de l\'enquête');
    } finally {
      setLoading(false);
    }
  };

  const syncPendingResponses = async () => {
    const toSync = [...pendingResponses];
    const synced: string[] = [];

    for (const response of toSync) {
      try {
        const { error } = await supabase
          .from('survey_responses')
          .insert({
            survey_id: response.survey_id,
            user_id: (await supabase.auth.getUser()).data.user?.id || 'anonymous',
            data: response.data,
            location: response.location,
            sync_status: 'synced',
          });

        if (!error) {
          synced.push(response.id);
        }
      } catch (err) {
        console.error('Error syncing response:', err);
      }
    }

    if (synced.length > 0) {
      setPendingResponses(prev => prev.filter(r => !synced.includes(r.id)));
      toast.success(`${synced.length} réponse(s) synchronisée(s)`);
    }
  };

  const getLocation = async () => {
    setGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      toast.success('Position GPS enregistrée');
    } catch (err) {
      console.error('Error getting location:', err);
      toast.error('Impossible d\'obtenir la position GPS');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

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

    const responseData = {
      id: crypto.randomUUID(),
      survey_id: survey.id,
      data: formData,
      location,
      created_at: new Date().toISOString(),
    };

    if (isOnline) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from('survey_responses')
          .insert({
            survey_id: survey.id,
            user_id: user?.id || 'anonymous',
            data: formData,
            location,
            sync_status: 'synced',
          });

        if (error) throw error;
        
        setSubmitted(true);
        toast.success('Réponse envoyée avec succès !');
      } catch (err) {
        console.error('Error submitting response:', err);
        // Save locally if online submission fails
        setPendingResponses(prev => [...prev, responseData]);
        setSubmitted(true);
        toast.success('Réponse sauvegardée localement');
      }
    } else {
      // Save locally when offline
      setPendingResponses(prev => [...prev, responseData]);
      setSubmitted(true);
      toast.success('Réponse sauvegardée (sera synchronisée automatiquement)');
    }

    setSubmitting(false);
  };

  const handleNewResponse = () => {
    setSubmitted(false);
    const initialData: Record<string, any> = {};
    fields.forEach(field => {
      if (field.field_type === 'multiselect') {
        initialData[field.id] = [];
      } else {
        initialData[field.id] = '';
      }
    });
    setFormData(initialData);
    setLocation(null);
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
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">{survey?.title}</h1>
              {survey?.description && (
                <p className="text-sm text-muted-foreground truncate">{survey.description}</p>
              )}
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isOnline ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto p-4 pb-32">
        {pendingResponses.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4 text-sm">
            <p className="text-orange-600 font-medium">
              {pendingResponses.length} réponse(s) en attente de synchronisation
            </p>
          </div>
        )}

        <div className="space-y-4">
          {fields.map((field) => (
            <SurveyFormField
              key={field.id}
              field={field}
              value={formData[field.id]}
              onChange={(value) => handleFieldChange(field.id, value)}
            />
          ))}

          {/* GPS Location */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Position GPS</p>
                  <p className="text-sm text-muted-foreground">
                    {location 
                      ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` 
                      : 'Non enregistrée'}
                  </p>
                </div>
                <Button 
                  variant={location ? 'outline' : 'default'} 
                  size="sm" 
                  onClick={getLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  <span className="ml-2">{location ? 'Actualiser' : 'Enregistrer'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4">
        <div className="max-w-2xl mx-auto">
          <Button 
            onClick={handleSubmit} 
            disabled={submitting} 
            className="w-full h-12 text-base"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              'Envoyer la réponse'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Survey;
