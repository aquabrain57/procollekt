import { Wifi, WifiOff, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  className?: string;
}

export const StatusBadge = ({ isOnline, pendingCount, isSyncing, className }: StatusBadgeProps) => {
  if (isSyncing) {
    return (
      <div className={cn('status-badge bg-primary/15 text-primary', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Synchronisation...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className={cn('status-badge status-offline', className)}>
        <WifiOff className="h-3.5 w-3.5" />
        <span>Hors ligne</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className={cn('status-badge status-pending', className)}>
        <CloudOff className="h-3.5 w-3.5" />
        <span>{pendingCount} en attente</span>
      </div>
    );
  }

  return (
    <div className={cn('status-badge status-synced', className)}>
      <Cloud className="h-3.5 w-3.5" />
      <span>Synchronisé</span>
    </div>
  );
};
