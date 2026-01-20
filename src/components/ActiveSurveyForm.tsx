import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import { DbSurvey, DbSurveyField, useSurveyFields, useSurveyResponses } from '@/hooks/useSurveys';
import { FormFieldComponent } from './FormField';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SurveyorValidation } from './badges/SurveyorValidation';
import { FormSignature, generateSignatureData } from './badges/FormSignature';
import { SurveyorBadge } from '@/hooks/useSurveyorBadges';
import { supabase } from '@/integrations/supabase/client';

interface ActiveSurveyFormProps {
  survey: DbSurvey;
  onComplete: () => void;
  requireSurveyorValidation?: boolean;
}

export const ActiveSurveyForm = ({ survey, onComplete, requireSurveyorValidation = false }: ActiveSurveyFormProps) => {
  const { fields, loading: fieldsLoading } = useSurveyFields(survey.id);
  const { submitResponse } = useSurveyResponses();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validatedBadge, setValidatedBadge] = useState<SurveyorBadge | null>(null);
  const [signatureData, setSignatureData] = useState<ReturnType<typeof generateSignatureData> | null>(null);

  const convertToFormField = (dbField: DbSurveyField) => ({
    id: dbField.id,
    type: dbField.field_type,
    label: dbField.label,
    placeholder: dbField.placeholder || undefined,
    required: dbField.required,
    options: dbField.options || undefined,
    min: dbField.min_value || undefined,
    max: dbField.max_value || undefined,
    conditionalOn: dbField.conditional_on || undefined,
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.required) {
        const value = formData[field.id];
        if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.id] = 'Ce champ est obligatoire';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Check surveyor validation if required
    if (requireSurveyorValidation && !validatedBadge) {
      toast.error('Veuillez valider votre identité avant de soumettre');
      return;
    }

    setIsSubmitting(true);

    let location: { latitude: number; longitude: number } | undefined;

    // Try to get location
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch (e) {
        // Location not available
      }
    }

    // Submit response with surveyor info if validated
    const result = await submitResponse(
      survey.id, 
      formData, 
      location,
      validatedBadge?.surveyor_id,
      validatedBadge?.id,
      !!validatedBadge
    );
    
    // If validated, create signature
    if (result && validatedBadge && signatureData) {
      try {
        await supabase.from('form_signatures').insert({
          response_id: result.id,
          survey_id: survey.id,
          surveyor_id: validatedBadge.surveyor_id,
          badge_id: validatedBadge.id,
          timestamp: signatureData.timestamp,
          gps_latitude: signatureData.gps_latitude,
          gps_longitude: signatureData.gps_longitude,
          device_id: signatureData.device_id,
          signature_hash: signatureData.signature_hash,
        });
      } catch (error) {
        console.error('Error saving signature:', error);
      }
    }
    
    setIsSubmitting(false);

    if (result) {
      setIsSubmitted(true);
    }
  };

  const handleBadgeValidated = (badge: SurveyorBadge) => {
    setValidatedBadge(badge);
    // Generate signature data when badge is validated
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        const sig = generateSignatureData(
          badge,
          survey.id,
          { latitude: position.coords.latitude, longitude: position.coords.longitude }
        );
        setSignatureData(sig);
      },
      () => {
        // GPS not available, generate without location
        const sig = generateSignatureData(badge, survey.id);
        setSignatureData(sig);
      },
      { timeout: 5000 }
    );
  };

  if (fieldsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chargement du formulaire...</div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center slide-up">
        <div className="p-4 rounded-full bg-success/10 mb-4">
          <CheckCircle className="h-12 w-12 text-success" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Merci !
        </h3>
        <p className="text-muted-foreground mb-6">
          Votre réponse a été enregistrée avec succès.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onComplete}
          >
            Retour
          </Button>
          <Button
            onClick={() => {
              setFormData({});
              setIsSubmitted(false);
            }}
          >
            Nouvelle réponse
          </Button>
        </div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="font-medium">Formulaire vide</p>
        <p className="text-sm">Ce formulaire ne contient aucun champ</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-2">{survey.title}</h2>
        {survey.description && (
          <p className="text-muted-foreground">{survey.description}</p>
        )}
      </div>

      {/* Surveyor Validation Section */}
      <SurveyorValidation
        onValidated={handleBadgeValidated}
        required={requireSurveyorValidation}
      />

      {/* Show signature preview when validated */}
      {validatedBadge && (
        <FormSignature
          badge={validatedBadge}
          surveyId={survey.id}
          location={signatureData ? { latitude: signatureData.gps_latitude ?? 0, longitude: signatureData.gps_longitude ?? 0 } : null}
        />
      )}

      {fields.map((field, index) => (
        <div key={field.id} style={{ animationDelay: `${index * 50}ms` }}>
          <FormFieldComponent
            field={convertToFormField(field)}
            value={formData[field.id]}
            onChange={(value) => {
              setFormData({ ...formData, [field.id]: value });
              if (errors[field.id]) {
                setErrors({ ...errors, [field.id]: '' });
              }
            }}
            error={errors[field.id]}
          />
        </div>
      ))}

      <div className="fixed bottom-20 left-0 right-0 p-4 glass-card border-t border-border/50">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || (requireSurveyorValidation && !validatedBadge)}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <span className="animate-spin mr-2">⏳</span>
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {requireSurveyorValidation && !validatedBadge ? 'Validez votre identité' : 'Soumettre'}
        </Button>
      </div>
    </div>
  );
};
