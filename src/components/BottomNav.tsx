import { Home, ClipboardList, Database, Settings, IdCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

type Tab = 'home' | 'surveys' | 'data' | 'settings' | 'badges';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: 'home' as Tab, icon: Home, label: 'Accueil', path: '/' },
  { id: 'surveys' as Tab, icon: ClipboardList, label: 'Enquêtes', path: '/' },
  { id: 'badges' as Tab, icon: IdCard, label: 'Badges', path: '/badges' },
  { id: 'data' as Tab, icon: Database, label: 'Données', path: '/' },
  { id: 'settings' as Tab, icon: Settings, label: 'Paramètres', path: '/' },
];

export const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const navigate = useNavigate();

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.id === 'badges') {
      navigate('/badges');
    } else {
      if (window.location.pathname !== '/') {
        navigate('/');
      }
      onTabChange(tab.id);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/50 safe-area-bottom md:hidden">
      <div className="flex items-center justify-around px-1 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 touch-target min-w-[56px]',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
