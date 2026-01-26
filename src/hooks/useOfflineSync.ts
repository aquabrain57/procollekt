import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const PENDING_RESPONSES_KEY = 'youcollect_pending_responses';
const PENDING_LOCATIONS_KEY = 'youcollect_pending_locations';

interface PendingResponse {
  id: string;
  surveyId: string;
  data: Record<string, any>;
  location?: { latitude: number; longitude: number };
  surveyorId?: string;
  badgeId?: string;
  createdAt: string;
}

interface PendingLocation {
  id: string;
  badgeId: string;
  surveyorId: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
}

export const useOfflineSync = () => {
  const { user } = useAuth();
  const [pendingResponses, setPendingResponses] = useState<PendingResponse[]>([]);
  const [pendingLocations, setPendingLocations] = useState<PendingLocation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Load pending items from localStorage
  useEffect(() => {
    const loadPendingItems = () => {
      try {
        const responses = localStorage.getItem(PENDING_RESPONSES_KEY);
        const locations = localStorage.getItem(PENDING_LOCATIONS_KEY);
        
        if (responses) {
          setPendingResponses(JSON.parse(responses));
        }
        if (locations) {
          setPendingLocations(JSON.parse(locations));
        }
      } catch (error) {
        console.error('Error loading pending items:', error);
      }
    };
    
    loadPendingItems();
  }, []);

  // Save pending items to localStorage
  const savePendingResponses = useCallback((responses: PendingResponse[]) => {
    try {
      localStorage.setItem(PENDING_RESPONSES_KEY, JSON.stringify(responses));
      setPendingResponses(responses);
    } catch (error) {
      console.error('Error saving pending responses:', error);
    }
  }, []);

  const savePendingLocations = useCallback((locations: PendingLocation[]) => {
    try {
      localStorage.setItem(PENDING_LOCATIONS_KEY, JSON.stringify(locations));
      setPendingLocations(locations);
    } catch (error) {
      console.error('Error saving pending locations:', error);
    }
  }, []);

  // Add a response to pending queue
  const addPendingResponse = useCallback((response: Omit<PendingResponse, 'id' | 'createdAt'>) => {
    const newResponse: PendingResponse = {
      ...response,
      id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    
    const updated = [...pendingResponses, newResponse];
    savePendingResponses(updated);
    return newResponse;
  }, [pendingResponses, savePendingResponses]);

  // Add a location to pending queue
  const addPendingLocation = useCallback((location: Omit<PendingLocation, 'id' | 'recordedAt'>) => {
    const newLocation: PendingLocation = {
      ...location,
      id: `pending_loc_${Date.now()}`,
      recordedAt: new Date().toISOString(),
    };
    
    const updated = [...pendingLocations, newLocation];
    savePendingLocations(updated);
    return newLocation;
  }, [pendingLocations, savePendingLocations]);

  // Sync all pending items
  const syncPendingItems = useCallback(async () => {
    if (!user || isSyncing || !navigator.onLine) return;
    
    const totalPending = pendingResponses.length + pendingLocations.length;
    if (totalPending === 0) return;

    setIsSyncing(true);
    let syncedResponses = 0;
    let syncedLocations = 0;
    const failedResponses: PendingResponse[] = [];
    const failedLocations: PendingLocation[] = [];

    try {
      // Sync responses
      for (const response of pendingResponses) {
        try {
          const { error } = await supabase
            .from('survey_responses')
            .insert({
              survey_id: response.surveyId,
              user_id: user.id,
              data: response.data,
              location: response.location,
              surveyor_id: response.surveyorId,
              badge_id: response.badgeId,
              sync_status: 'synced',
              created_at: response.createdAt,
            });

          if (error) {
            console.error('Error syncing response:', error);
            failedResponses.push(response);
          } else {
            syncedResponses++;
          }
        } catch (err) {
          failedResponses.push(response);
        }
      }

      // Sync locations
      for (const location of pendingLocations) {
        try {
          const { error } = await supabase
            .from('surveyor_locations')
            .insert({
              badge_id: location.badgeId,
              surveyor_id: location.surveyorId,
              latitude: location.latitude,
              longitude: location.longitude,
              recorded_at: location.recordedAt,
            });

          if (error) {
            console.error('Error syncing location:', error);
            failedLocations.push(location);
          } else {
            syncedLocations++;
          }
        } catch (err) {
          failedLocations.push(location);
        }
      }

      // Update localStorage with remaining items
      savePendingResponses(failedResponses);
      savePendingLocations(failedLocations);

      // Show notification
      if (syncedResponses > 0 || syncedLocations > 0) {
        const parts = [];
        if (syncedResponses > 0) {
          parts.push(`${syncedResponses} réponse${syncedResponses > 1 ? 's' : ''}`);
        }
        if (syncedLocations > 0) {
          parts.push(`${syncedLocations} position${syncedLocations > 1 ? 's' : ''}`);
        }
        toast.success(`Synchronisation réussie: ${parts.join(' et ')}`);
      }

      if (failedResponses.length > 0 || failedLocations.length > 0) {
        toast.warning(`${failedResponses.length + failedLocations.length} élément(s) en attente de synchronisation`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setIsSyncing(false);
    }
  }, [user, isSyncing, pendingResponses, pendingLocations, savePendingResponses, savePendingLocations]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Delay sync slightly to ensure connection is stable
      setTimeout(() => {
        syncPendingItems();
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    if (navigator.onLine && (pendingResponses.length > 0 || pendingLocations.length > 0)) {
      syncPendingItems();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingItems, pendingResponses.length, pendingLocations.length]);

  return {
    isOnline,
    isSyncing,
    pendingCount: pendingResponses.length + pendingLocations.length,
    pendingResponses,
    pendingLocations,
    addPendingResponse,
    addPendingLocation,
    syncPendingItems,
  };
};
