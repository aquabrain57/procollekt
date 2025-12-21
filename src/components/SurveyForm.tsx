import { useState } from 'react';
import { Send, Save, CheckCircle } from 'lucide-react';
import { Survey, SurveyResponse } from '@/types/survey';
import { FormFieldComponent } from './FormField';
import { toast } from 'sonner';

interface SurveyFormProps {
  survey: Survey;
  onSubmit: (response: Omit<SurveyResponse, 'id'>) => void;
  isOnline: boolean;
}

export const SurveyForm = ({ survey, onSubmit, isOnline }: SurveyFormProps) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    survey.fields.forEach((field) => {
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

    setIsSubmitting(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const response: Omit<SurveyResponse, 'id'> = {
      surveyId: survey.id,
      data: formData,
      createdAt: new Date().toISOString(),
      syncStatus: isOnline ? 'synced' : 'pending',
    };

    // Try to get location
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        response.location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch (e) {
        // Location not available
      }
    }

    onSubmit(response);
    setIsSubmitting(false);
    setIsSubmitted(true);

    toast.success(
      isOnline
        ? 'Réponse enregistrée et synchronisée'
        : 'Réponse enregistrée localement'
    );
  };

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
        <button
          onClick={() => {
            setFormData({});
            setIsSubmitted(false);
          }}
          className="btn-primary px-6 py-3 rounded-lg font-medium"
        >
          Nouvelle réponse
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-2">{survey.title}</h2>
        <p className="text-muted-foreground">{survey.description}</p>
      </div>

      {survey.fields.map((field, index) => (
        <div key={field.id} style={{ animationDelay: `${index * 50}ms` }}>
          <FormFieldComponent
            field={field}
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
        <div className="flex gap-3">
          <button
            onClick={() => setFormData({})}
            className="btn-secondary flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            Effacer
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <Send className="h-4 w-4" />
            )}
            Soumettre
          </button>
        </div>
      </div>
    </div>
  );
};
