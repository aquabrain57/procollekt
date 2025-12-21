import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SurveyCard } from '@/components/SurveyCard';
import { SurveyForm } from '@/components/SurveyForm';
import { DashboardStats } from '@/components/DashboardStats';
import { ResponsesList } from '@/components/ResponsesList';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { mockSurveys } from '@/data/mockSurveys';
import { Survey, SurveyResponse, SyncStatus } from '@/types/survey';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'home' | 'surveys' | 'data' | 'settings';

const Index = () => {
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useLocalStorage<SurveyResponse[]>('survey_responses', []);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const syncStatus: SyncStatus = {
    isOnline,
    pendingCount: responses.filter(r => r.syncStatus === 'pending').length,
    lastSyncAt: null,
    isSyncing,
  };

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && syncStatus.pendingCount > 0 && !isSyncing) {
      handleSync();
    }
  }, [isOnline]);

  const handleSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    
    // Simulate sync delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    setResponses(prev => 
      prev.map(r => r.syncStatus === 'pending' ? { ...r, syncStatus: 'synced' } : r)
    );

    setIsSyncing(false);
    toast.success('Synchronisation terminée');
  }, [isOnline, isSyncing, setResponses]);

  const handleSubmitResponse = (response: Omit<SurveyResponse, 'id'>) => {
    const newResponse: SurveyResponse = {
      ...response,
      id: `response_${Date.now()}`,
    };
    setResponses(prev => [newResponse, ...prev]);
  };

  const handleClearData = () => {
    setResponses([]);
  };

  const filteredSurveys = mockSurveys.filter(survey =>
    survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    survey.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSurveys = filteredSurveys.filter(s => s.status === 'active');

  const getTitle = () => {
    if (selectedSurvey) return selectedSurvey.title;
    switch (activeTab) {
      case 'home': return 'FieldCollect';
      case 'surveys': return 'Enquêtes';
      case 'data': return 'Données collectées';
      case 'settings': return 'Paramètres';
      default: return 'FieldCollect';
    }
  };

  const renderContent = () => {
    if (selectedSurvey) {
      return (
        <div className="p-4">
          <SurveyForm
            survey={selectedSurvey}
            onSubmit={handleSubmitResponse}
            isOnline={isOnline}
          />
        </div>
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <div className="p-4 space-y-6 pb-24">
            {/* Welcome Section */}
            <div className="slide-up">
              <h2 className="text-2xl font-bold text-foreground mb-1">
                Bonjour 👋
              </h2>
              <p className="text-muted-foreground">
                Prêt à collecter des données aujourd'hui ?
              </p>
            </div>

            {/* Stats */}
            <DashboardStats surveys={mockSurveys} responses={responses} />

            {/* Quick Actions */}
            <div className="slide-up" style={{ animationDelay: '200ms' }}>
              <h3 className="font-semibold text-foreground mb-3">Actions rapides</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('surveys')}
                  className="bg-primary text-primary-foreground p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-6 w-6" />
                  <span className="text-sm font-medium">Nouvelle collecte</span>
                </button>
                <button
                  onClick={handleSync}
                  disabled={!isOnline || isSyncing}
                  className="bg-card border border-border p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <div className={isSyncing ? 'sync-pulse' : ''}>
                    <svg className="h-6 w-6 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c-2.5 0-4.5-4-4.5-9s2-9 4.5-9m0 18c2.5 0 4.5-4 4.5-9s-2-9-4.5-9" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {isSyncing ? 'Sync...' : 'Synchroniser'}
                  </span>
                </button>
              </div>
            </div>

            {/* Recent Surveys */}
            <div className="slide-up" style={{ animationDelay: '250ms' }}>
              <h3 className="font-semibold text-foreground mb-3">Enquêtes récentes</h3>
              <div className="space-y-3">
                {activeSurveys.slice(0, 2).map((survey) => (
                  <SurveyCard
                    key={survey.id}
                    survey={survey}
                    onClick={() => setSelectedSurvey(survey)}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'surveys':
        return (
          <div className="p-4 space-y-4 pb-24">
            {/* Search */}
            <div className="relative slide-up">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher une enquête..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            {/* Survey List */}
            <div className="space-y-3">
              {filteredSurveys.map((survey) => (
                <SurveyCard
                  key={survey.id}
                  survey={survey}
                  onClick={() => setSelectedSurvey(survey)}
                />
              ))}
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="p-4 pb-24">
            <ResponsesList responses={responses} surveys={mockSurveys} />
          </div>
        );

      case 'settings':
        return (
          <div className="p-4 pb-24">
            <SettingsPanel
              syncStatus={syncStatus}
              onSync={handleSync}
              onClearData={handleClearData}
              pendingCount={syncStatus.pendingCount}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        title={getTitle()}
        showBack={!!selectedSurvey}
        onBack={() => setSelectedSurvey(null)}
        syncStatus={syncStatus}
      />

      <main className="fade-in">
        {renderContent()}
      </main>

      {!selectedSurvey && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  );
};

export default Index;
