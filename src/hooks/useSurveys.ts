import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DbSurvey {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
  cover_image_url?: string | null;
}

export interface DbSurveyField {
  id: string;
  survey_id: string;
  field_type: 'text' | 'textarea' | 'email' | 'phone' | 'number' | 'decimal' | 'select' | 'multiselect' | 'date' | 'time' | 'datetime' | 'location' | 'photo' | 'audio' | 'video' | 'rating' | 'note' | 'barcode' | 'consent' | 'file' | 'range' | 'ranking' | 'calculate' | 'hidden' | 'matrix' | 'line' | 'area' | 'signature';
  label: string;
  placeholder: string | null;
  required: boolean;
  options: { value: string; label: string }[] | null;
  min_value: number | null;
  max_value: number | null;
  conditional_on: { fieldId: string; value: string | string[] } | null;
  field_order: number;
  created_at: string;
}

export interface DbSurveyResponse {
  id: string;
  survey_id: string;
  user_id: string;
  data: Record<string, any>;
  sync_status: 'synced' | 'pending' | 'error';
  location: { latitude: number; longitude: number } | null;
  created_at: string;
  surveyor_id?: string | null;
  surveyor_validated?: boolean;
  badge_id?: string | null;
}

export const useSurveys = () => {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<DbSurvey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSurveys = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('id, user_id, title, description, status, created_at, updated_at, cover_image_url')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSurveys((data as DbSurvey[]) || []);
    } catch (error: any) {
      console.error('Error fetching surveys:', error);
      toast.error('Erreur lors du chargement des enquêtes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const createSurvey = async (title: string, description: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('surveys')
        .insert({
          user_id: user.id,
          title,
          description,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      
      setSurveys(prev => [data as DbSurvey, ...prev]);
      toast.success('Enquête créée avec succès');
      return data as DbSurvey;
    } catch (error: any) {
      console.error('Error creating survey:', error);
      toast.error('Erreur lors de la création de l\'enquête');
      return null;
    }
  };

  const updateSurvey = async (id: string, updates: Partial<DbSurvey>) => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSurveys(prev => prev.map(s => s.id === id ? (data as DbSurvey) : s));
      toast.success('Enquête mise à jour');
      return data as DbSurvey;
    } catch (error: any) {
      console.error('Error updating survey:', error);
      toast.error('Erreur lors de la mise à jour');
      return null;
    }
  };

  const deleteSurvey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSurveys(prev => prev.filter(s => s.id !== id));
      toast.success('Enquête supprimée');
      return true;
    } catch (error: any) {
      console.error('Error deleting survey:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  };

  const publishSurvey = async (id: string) => {
    return updateSurvey(id, { status: 'active' });
  };

  const unpublishSurvey = async (id: string) => {
    return updateSurvey(id, { status: 'draft' });
  };

  const duplicateSurvey = async (sourceSurvey: DbSurvey) => {
    if (!user) return null;

    try {
      // Create new survey as a copy
      const { data: newSurvey, error: surveyError } = await supabase
        .from('surveys')
        .insert({
          user_id: user.id,
          title: `${sourceSurvey.title} (copie)`,
          description: sourceSurvey.description,
          status: 'draft',
          cover_image_url: sourceSurvey.cover_image_url,
        })
        .select()
        .single();

      if (surveyError) throw surveyError;

      // Fetch source survey fields
      const { data: sourceFields, error: fieldsError } = await supabase
        .from('survey_fields')
        .select('*')
        .eq('survey_id', sourceSurvey.id)
        .order('field_order', { ascending: true });

      if (fieldsError) throw fieldsError;

      // Duplicate fields if any
      if (sourceFields && sourceFields.length > 0) {
        const newFields = sourceFields.map((field: any) => ({
          survey_id: newSurvey.id,
          field_type: field.field_type,
          label: field.label,
          placeholder: field.placeholder,
          required: field.required,
          options: field.options,
          min_value: field.min_value,
          max_value: field.max_value,
          conditional_on: field.conditional_on,
          field_order: field.field_order,
        }));

        const { error: insertFieldsError } = await supabase
          .from('survey_fields')
          .insert(newFields);

        if (insertFieldsError) throw insertFieldsError;
      }

      setSurveys(prev => [newSurvey as DbSurvey, ...prev]);
      toast.success('Enquête dupliquée avec succès');
      return newSurvey as DbSurvey;
    } catch (error: any) {
      console.error('Error duplicating survey:', error);
      toast.error('Erreur lors de la duplication');
      return null;
    }
  };

  return {
    surveys,
    loading,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    publishSurvey,
    unpublishSurvey,
    duplicateSurvey,
    refetch: fetchSurveys,
  };
};

export const useSurveyFields = (surveyId: string | null) => {
  const [fields, setFields] = useState<DbSurveyField[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFields = useCallback(async () => {
    if (!surveyId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('survey_fields')
        .select('*')
        .eq('survey_id', surveyId)
        .order('field_order', { ascending: true });

      if (error) throw error;
      setFields((data as DbSurveyField[]) || []);
    } catch (error: any) {
      console.error('Error fetching fields:', error);
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const addField = async (field: Omit<DbSurveyField, 'id' | 'survey_id' | 'created_at'>) => {
    if (!surveyId) return null;

    try {
      const { data, error } = await supabase
        .from('survey_fields')
        .insert({
          survey_id: surveyId,
          ...field,
        })
        .select()
        .single();

      if (error) throw error;

      setFields(prev => [...prev, data as DbSurveyField]);
      return data as DbSurveyField;
    } catch (error: any) {
      console.error('Error adding field:', error);
      toast.error(error?.message ? `Erreur lors de l'ajout: ${error.message}` : "Erreur lors de l'ajout du champ");
      return null;
    }
  };

  const updateField = async (id: string, updates: Partial<DbSurveyField>) => {
    try {
      const { data, error } = await supabase
        .from('survey_fields')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setFields(prev => prev.map(f => f.id === id ? (data as DbSurveyField) : f));
      return data as DbSurveyField;
    } catch (error: any) {
      console.error('Error updating field:', error);
      toast.error('Erreur lors de la mise à jour du champ');
      return null;
    }
  };

  const deleteField = async (id: string) => {
    try {
      const { error } = await supabase
        .from('survey_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFields(prev => prev.filter(f => f.id !== id));
      return true;
    } catch (error: any) {
      console.error('Error deleting field:', error);
      toast.error('Erreur lors de la suppression du champ');
      return false;
    }
  };

  const reorderFields = async (reorderedFields: DbSurveyField[]) => {
    setFields(reorderedFields);

    try {
      for (let i = 0; i < reorderedFields.length; i++) {
        await supabase
          .from('survey_fields')
          .update({ field_order: i })
          .eq('id', reorderedFields[i].id);
      }
    } catch (error: any) {
      console.error('Error reordering fields:', error);
      toast.error('Erreur lors de la réorganisation');
    }
  };

  return {
    fields,
    loading,
    addField,
    updateField,
    deleteField,
    reorderFields,
    refetch: fetchFields,
  };
};

export const useSurveyResponses = (surveyId?: string) => {
  const { user } = useAuth();
  const [responses, setResponses] = useState<DbSurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResponses = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('survey_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (surveyId) {
        query = query.eq('survey_id', surveyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setResponses((data as unknown as DbSurveyResponse[]) || []);
    } catch (error: any) {
      console.error('Error fetching responses:', error);
    } finally {
      setLoading(false);
    }
  }, [user, surveyId]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const submitResponse = async (
    surveyId: string, 
    data: Record<string, any>, 
    location?: { latitude: number; longitude: number },
    surveyorId?: string,
    badgeId?: string,
    surveyorValidated?: boolean
  ) => {
    if (!user) return null;

    try {
      const { data: response, error } = await supabase
        .from('survey_responses')
        .insert({
          survey_id: surveyId,
          user_id: user.id,
          data,
          location,
          sync_status: 'synced',
          surveyor_id: surveyorId || null,
          badge_id: badgeId || null,
          surveyor_validated: surveyorValidated || false,
        })
        .select()
        .single();

      if (error) throw error;

      setResponses(prev => [response as unknown as DbSurveyResponse, ...prev]);
      toast.success('Réponse enregistrée avec succès');
      return response as unknown as DbSurveyResponse;
    } catch (error: any) {
      console.error('Error submitting response:', error);
      toast.error('Erreur lors de l\'enregistrement');
      return null;
    }
  };

  return {
    responses,
    loading,
    submitResponse,
    refetch: fetchResponses,
  };
};
