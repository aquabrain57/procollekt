import { Home, ClipboardList, Database, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'home' | 'surveys' | 'data' | 'settings';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: 'home' as Tab, icon: Home, label: 'Accueil' },
  { id: 'surveys' as Tab, icon: ClipboardList, label: 'Enquêtes' },
  { id: 'data' as Tab, icon: Database, label: 'Données' },
  { id: 'settings' as Tab, icon: Settings, label: 'Paramètres' },
];

export const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 touch-target min-w-[64px]',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
