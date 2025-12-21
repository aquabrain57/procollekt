import { ArrowLeft, Menu } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { SyncStatus } from '@/types/survey';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  syncStatus: SyncStatus;
}

export const Header = ({ title, showBack, onBack, syncStatus }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 glass-card border-b border-border/50 safe-area-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors touch-target"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
          ) : (
            <button
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors touch-target"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>
          )}
          <h1 className="font-semibold text-lg text-foreground truncate">
            {title}
          </h1>
        </div>

        <StatusBadge
          isOnline={syncStatus.isOnline}
          pendingCount={syncStatus.pendingCount}
          isSyncing={syncStatus.isSyncing}
        />
      </div>
    </header>
  );
};
