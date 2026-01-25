import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, WifiOff, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SurveyorOnlineStatusProps {
  badgeId: string;
  surveyorId: string;
  lastLocationAt?: string | null;
  compact?: boolean;
  showLastSeen?: boolean;
}

export const SurveyorOnlineStatus = ({
  badgeId,
  surveyorId,
  lastLocationAt,
  compact = false,
  showLastSeen = true,
}: SurveyorOnlineStatusProps) => {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(lastLocationAt ? new Date(lastLocationAt) : null);
  const [presenceCount, setPresenceCount] = useState(0);

  useEffect(() => {
    // Subscribe to realtime presence for this surveyor
    const channel = supabase.channel(`surveyor-presence-${surveyorId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const isPresent = Object.keys(state).length > 0;
        setIsOnline(isPresent);
        setPresenceCount(Object.keys(state).length);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setIsOnline(true);
        setLastSeen(new Date());
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const state = channel.presenceState();
        setIsOnline(Object.keys(state).length > 0);
        setLastSeen(new Date());
      })
      .subscribe();

    // Also check recent location updates as fallback
    const checkRecentActivity = async () => {
      const { data } = await supabase
        .from('surveyor_locations')
        .select('recorded_at')
        .eq('badge_id', badgeId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const lastActivity = new Date(data.recorded_at);
        setLastSeen(lastActivity);
        
        // Consider online if activity within last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (lastActivity > fiveMinutesAgo) {
          setIsOnline(true);
        }
      }
    };

    checkRecentActivity();

    // Set up realtime subscription for location updates
    const locationChannel = supabase
      .channel(`surveyor-location-${badgeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'surveyor_locations',
          filter: `badge_id=eq.${badgeId}`,
        },
        (payload) => {
          setIsOnline(true);
          setLastSeen(new Date(payload.new.recorded_at));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(locationChannel);
    };
  }, [badgeId, surveyorId]);

  // Calculate time since last seen
  const lastSeenText = lastSeen
    ? formatDistanceToNow(lastSeen, { addSuffix: true, locale: fr })
    : 'Jamais connecté';

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
              isOnline 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            )}>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              )} />
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {isOnline ? 'Actuellement actif' : `Dernière activité ${lastSeenText}`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          isOnline 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        )}>
          {isOnline ? (
            <>
              <Wifi className="h-3 w-3" />
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              En ligne
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Hors ligne
            </>
          )}
        </div>
      </div>
      
      {showLastSeen && lastSeen && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Dernière activité {lastSeenText}</span>
        </div>
      )}
    </div>
  );
};

// Simple inline badge for tables
export const OnlineStatusDot = ({ 
  isOnline, 
  size = 'sm' 
}: { 
  isOnline: boolean; 
  size?: 'xs' | 'sm' | 'md';
}) => {
  const sizeClasses = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  };

  return (
    <span className={cn(
      'rounded-full inline-block',
      sizeClasses[size],
      isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
    )} />
  );
};
