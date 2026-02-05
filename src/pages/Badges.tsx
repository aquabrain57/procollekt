import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BadgeManagement } from '@/components/badges/BadgeManagement';
import { SupervisorDashboard } from '@/components/badges/SupervisorDashboard';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/contexts/AuthContext';
import { SyncStatus } from '@/types/survey';
import { IdCard, BarChart3, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Tab = 'home' | 'surveys' | 'data' | 'settings' | 'badges';

const Badges = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('badges');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const syncStatus: SyncStatus = {
    isOnline,
    pendingCount: 0,
    lastSyncAt: null,
    isSyncing: false,
  };

  const handleTabChange = (tab: Tab) => {
    if (tab === 'badges') return;
    navigate('/');
    // The Index component will handle the tab change
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        title={t('badges.title', 'Badges')}
        syncStatus={syncStatus}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <main className="fade-in w-full max-w-none px-2 sm:px-4 lg:px-6 py-4 pb-24">
        <Tabs defaultValue="management" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="management" className="flex items-center gap-2">
              <IdCard className="h-4 w-4" />
              {t('badges.management', 'Gestion')}
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('badges.dashboard', 'Tableau de bord')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="management" className="mt-4">
            <BadgeManagement />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-4">
            <SupervisorDashboard />
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Badges;
