import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DbSurveyResponse, DbSurvey } from '@/hooks/useSurveys';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface RealtimeDashboardState {
  responses: DbSurveyResponse[];
  surveys: DbSurvey[];
  isLoading: boolean;
  lastUpdate: Date | null;
  newResponsesCount: number;
  isRealtime: boolean;
}

interface UseRealtimeDashboardOptions {
  surveyId?: string;
  enableNotifications?: boolean;
  autoRefreshInterval?: number; // in ms, 0 = disabled
}

export const useRealtimeDashboard = (options: UseRealtimeDashboardOptions = {}) => {
  const { user } = useAuth();
  const { surveyId, enableNotifications = true, autoRefreshInterval = 30000 } = options;
  
  const [state, setState] = useState<RealtimeDashboardState>({
    responses: [],
    surveys: [],
    isLoading: true,
    lastUpdate: null,
    newResponsesCount: 0,
    isRealtime: true,
  });

  const initialFetchDone = useRef(false);
  const newResponsesRef = useRef(0);

  // Fetch initial data
  const fetchData = useCallback(async (silent = false) => {
    if (!user) return;

    if (!silent) {
      setState(prev => ({ ...prev, isLoading: true }));
    }

    try {
      // Fetch surveys
      const { data: surveysData, error: surveysError } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (surveysError) throw surveysError;

      // Fetch responses
      let responsesQuery = supabase
        .from('survey_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (surveyId) {
        responsesQuery = responsesQuery.eq('survey_id', surveyId);
      }

      const { data: responsesData, error: responsesError } = await responsesQuery;

      if (responsesError) throw responsesError;

      setState(prev => ({
        ...prev,
        surveys: (surveysData as DbSurvey[]) || [],
        responses: (responsesData as unknown as DbSurveyResponse[]) || [],
        isLoading: false,
        lastUpdate: new Date(),
        newResponsesCount: 0,
      }));

      newResponsesRef.current = 0;
      initialFetchDone.current = true;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user, surveyId]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchData();

    // Subscribe to survey_responses changes
    const responsesChannel = supabase
      .channel('dashboard-responses')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'survey_responses',
          ...(surveyId ? { filter: `survey_id=eq.${surveyId}` } : {}),
        },
        (payload) => {
          const newResponse = payload.new as DbSurveyResponse;
          
          setState(prev => ({
            ...prev,
            responses: [newResponse, ...prev.responses],
            lastUpdate: new Date(),
            newResponsesCount: prev.newResponsesCount + 1,
          }));

          newResponsesRef.current++;

          if (enableNotifications && initialFetchDone.current) {
            toast.success('Nouvelle réponse reçue !', {
              description: `Total: ${newResponsesRef.current} nouvelle(s) réponse(s)`,
              duration: 3000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'survey_responses',
        },
        (payload) => {
          const updatedResponse = payload.new as DbSurveyResponse;
          setState(prev => ({
            ...prev,
            responses: prev.responses.map(r => 
              r.id === updatedResponse.id ? updatedResponse : r
            ),
            lastUpdate: new Date(),
          }));
        }
      )
      .subscribe((status) => {
        setState(prev => ({
          ...prev,
          isRealtime: status === 'SUBSCRIBED',
        }));
      });

    // Subscribe to surveys changes
    const surveysChannel = supabase
      .channel('dashboard-surveys')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'surveys',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setState(prev => ({
              ...prev,
              surveys: [payload.new as DbSurvey, ...prev.surveys],
              lastUpdate: new Date(),
            }));
          } else if (payload.eventType === 'UPDATE') {
            setState(prev => ({
              ...prev,
              surveys: prev.surveys.map(s => 
                s.id === (payload.new as DbSurvey).id ? payload.new as DbSurvey : s
              ),
              lastUpdate: new Date(),
            }));
          } else if (payload.eventType === 'DELETE') {
            setState(prev => ({
              ...prev,
              surveys: prev.surveys.filter(s => s.id !== (payload.old as any).id),
              lastUpdate: new Date(),
            }));
          }
        }
      )
      .subscribe();

    // Auto-refresh interval (as backup)
    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefreshInterval > 0) {
      intervalId = setInterval(() => {
        fetchData(true);
      }, autoRefreshInterval);
    }

    return () => {
      supabase.removeChannel(responsesChannel);
      supabase.removeChannel(surveysChannel);
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, surveyId, enableNotifications, autoRefreshInterval, fetchData]);

  // Manual refresh
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Clear new responses count
  const clearNewCount = useCallback(() => {
    setState(prev => ({ ...prev, newResponsesCount: 0 }));
    newResponsesRef.current = 0;
  }, []);

  return {
    ...state,
    refresh,
    clearNewCount,
  };
};