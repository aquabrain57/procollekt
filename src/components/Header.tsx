import { ArrowLeft, Globe, Moon, Sun, IdCard } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { SyncStatus } from '@/types/survey';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


type Tab = 'home' | 'surveys' | 'data' | 'settings' | 'badges';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  syncStatus: SyncStatus;
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

export const Header = ({ 
  title, 
  showBack, 
  onBack, 
  syncStatus,
  activeTab,
  onTabChange 
}: HeaderProps) => {
  const { t, i18n } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const navItems: { id: Tab; labelKey: string; path?: string }[] = [
    { id: 'home', labelKey: 'nav.home' },
    { id: 'surveys', labelKey: 'nav.surveys' },
    { id: 'badges', labelKey: 'nav.badges', path: '/badges' },
    { id: 'data', labelKey: 'nav.data' },
    { id: 'settings', labelKey: 'nav.settings' },
  ];

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.path) {
      navigate(item.path);
    } else if (onTabChange) {
      if (window.location.pathname !== '/') {
        navigate('/');
      }
      onTabChange(item.id);
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-border/50 safe-area-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {showBack ? (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors touch-target flex-shrink-0"
              aria-label={t('common.back')}
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
          ) : (
            <span className="font-bold text-lg text-foreground tracking-tight">Youcollect</span>
          )}
          {showBack && (
            <h1 className="font-semibold text-lg text-foreground truncate max-w-[150px] sm:max-w-none">
              {title}
            </h1>
          )}
        </div>

        {/* Desktop Navigation */}
        {!showBack && activeTab && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                  activeTab === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {item.id === 'badges' && <IdCard className="h-4 w-4" />}
                {t(item.labelKey)}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label={resolvedTheme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-5 w-5 text-foreground" />
            ) : (
              <Moon className="h-5 w-5 text-foreground" />
            )}
          </button>

          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-1">
                <Globe className="h-5 w-5 text-foreground" />
                <span className="text-xs font-medium uppercase text-foreground">
                  {i18n.language}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => changeLanguage('fr')}
                className={cn(i18n.language === 'fr' && 'bg-primary/10')}
              >
                🇫🇷 Français
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => changeLanguage('en')}
                className={cn(i18n.language === 'en' && 'bg-primary/10')}
              >
                🇬🇧 English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <StatusBadge
            isOnline={syncStatus.isOnline}
            pendingCount={syncStatus.pendingCount}
            isSyncing={syncStatus.isSyncing}
          />
        </div>
      </div>
    </header>
  );
};
