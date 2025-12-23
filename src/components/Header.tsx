import { ArrowLeft } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { SyncStatus } from '@/types/survey';
import { cn } from '@/lib/utils';

type Tab = 'home' | 'surveys' | 'data' | 'settings';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  syncStatus: SyncStatus;
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

const navItems: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Accueil' },
  { id: 'surveys', label: 'Enquêtes' },
  { id: 'data', label: 'Données' },
  { id: 'settings', label: 'Paramètres' },
];

export const Header = ({ 
  title, 
  showBack, 
  onBack, 
  syncStatus,
  activeTab,
  onTabChange 
}: HeaderProps) => {
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
          ) : null}
          <h1 className="font-semibold text-lg text-foreground truncate">
            {title}
          </h1>
        </div>

        {/* Desktop Navigation */}
        {!showBack && activeTab && onTabChange && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}

        <StatusBadge
          isOnline={syncStatus.isOnline}
          pendingCount={syncStatus.pendingCount}
          isSyncing={syncStatus.isSyncing}
        />
      </div>
    </header>
  );
};
