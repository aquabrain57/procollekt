import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SurveyCardEnhanced } from '@/components/SurveyCardEnhanced';
import { ResponsesList } from '@/components/ResponsesList';
import { SettingsPanel } from '@/components/SettingsPanel';
import { SurveyBuilder } from '@/components/SurveyBuilder';
import { MySurveysList } from '@/components/MySurveysList';
import { CreateSurveyDialog } from '@/components/CreateSurveyDialog';
import { ActiveSurveyForm } from '@/components/ActiveSurveyForm';
import { SurveyAnalytics } from '@/components/SurveyAnalytics';
import { EnhancedDashboard } from '@/components/EnhancedDashboard';
import { DataModuleTabs } from '@/components/DataModuleTabs';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useSurveys, useSurveyResponses, DbSurvey } from '@/hooks/useSurveys';
import { Survey, SyncStatus } from '@/types/survey';
import { Plus, Search, Loader2, FileEdit, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

type Tab = 'home' | 'surveys' | 'data' | 'settings';
type SurveyView = 'list' | 'builder' | 'fill' | 'responses';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [surveyView, setSurveyView] = useState<SurveyView>('list');
  const [selectedSurvey, setSelectedSurvey] = useState<DbSurvey | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const { surveys, loading: surveysLoading, createSurvey, updateSurvey, deleteSurvey, publishSurvey, unpublishSurvey, duplicateSurvey } = useSurveys();
  const { responses: allResponses, loading: responsesLoading } = useSurveyResponses();
  const { responses, loading: selectedResponsesLoading } = useSurveyResponses(selectedSurvey?.id);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const syncStatus: SyncStatus = {
    isOnline,
    pendingCount: 0,
    lastSyncAt: null,
    isSyncing,
  };

  const handleSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSyncing(false);
    toast.success('Synchronisation terminée');
  }, [isOnline, isSyncing]);

  // Convert DB surveys to the legacy format for stats
  const surveysForStats: Survey[] = surveys.map(s => ({
    id: s.id,
    title: s.title,
    description: s.description || '',
    status: s.status,
    createdAt: s.created_at,
    responseCount: 0,
    fields: [],
  }));

  // Calculate response counts per survey
  const responseCounts: Record<string, number> = {};
  allResponses.forEach(r => {
    responseCounts[r.survey_id] = (responseCounts[r.survey_id] || 0) + 1;
  });

  const mySurveys = surveys.filter(s => s.user_id === user?.id);
  const activeSurveys = surveys.filter(s => s.status === 'active');

  const filteredActiveSurveys = activeSurveys.filter(survey =>
    survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (survey.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const getTitle = () => {
    if (surveyView === 'builder' && selectedSurvey) return 'Éditer l\'enquête';
    if (surveyView === 'fill' && selectedSurvey) return selectedSurvey.title;
    if (surveyView === 'responses' && selectedSurvey) return 'Réponses';
    switch (activeTab) {
      case 'home': return 'WooCollekt IA';
      case 'surveys': return 'Enquêtes';
      case 'data': return 'Données';
      case 'settings': return 'Paramètres';
      default: return 'WooCollekt IA';
    }
  };

  const handleBack = () => {
    if (surveyView !== 'list') {
      setSurveyView('list');
      setSelectedSurvey(null);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Utilisateur';

  const handleEditSurvey = (survey: DbSurvey) => {
    setSelectedSurvey(survey);
    setSurveyView('builder');
  };

  const generatedFieldSchema = z.object({
    field_type: z.string().min(1),
    label: z.string().min(1).max(200),
    placeholder: z.string().optional().nullable(),
    required: z.boolean().optional().default(false),
    options: z
      .array(z.object({ value: z.string(), label: z.string() }))
      .optional()
      .nullable(),
    min_value: z.number().int().optional().nullable(),
    max_value: z.number().int().optional().nullable(),
  });

  const addGeneratedFieldsToSurvey = async (surveyId: string, fieldsToAdd: unknown[]) => {
    const parsed = z.array(generatedFieldSchema).safeParse(fieldsToAdd);
    if (!parsed.success) {
      console.warn('Invalid generated fields payload');
      return;
    }

    const rows = parsed.data.map((f, i) => ({
      survey_id: surveyId,
      field_type: f.field_type,
      label: f.label,
      placeholder: f.placeholder ?? null,
      required: Boolean(f.required),
      options: f.options ?? null,
      min_value: f.min_value ?? null,
      max_value: f.max_value ?? null,
      conditional_on: null,
      field_order: i,
    }));

    const { error } = await supabase.from('survey_fields').insert(rows);
    if (error) throw error;
  };

  const handleCreateSurveyWithImage = async (title: string, description: string, coverImageUrl?: string) => {
    const survey = await createSurvey(title, description);
    if (survey && coverImageUrl) {
      // Update survey with cover image
      await updateSurvey(survey.id, { cover_image_url: coverImageUrl } as any);
      return { ...survey, cover_image_url: coverImageUrl };
    }
    return survey;
  };

  const handleSurveyCreated = async (survey: DbSurvey, fieldsToAdd?: unknown[]) => {
    try {
      if (fieldsToAdd?.length) {
        await addGeneratedFieldsToSurvey(survey.id, fieldsToAdd);
        toast.success('Questions ajoutées automatiquement');
      }
    } catch (e) {
      console.error(e);
      toast.error('Enquête créée, mais ajout automatique des questions a échoué');
    }

    setSelectedSurvey(survey);
    setSurveyView('builder');
  };

  const handleFillSurvey = (survey: DbSurvey) => {
    setSelectedSurvey(survey);
    setSurveyView('fill');
  };

  const handleViewResponses = (survey: DbSurvey) => {
    setSelectedSurvey(survey);
    setSurveyView('responses');
  };

  const handleSelectDataSurvey = (survey: DbSurvey) => {
    setSelectedSurvey(survey);
  };

  const handlePublishToggle = async () => {
    if (!selectedSurvey) return;
    if (selectedSurvey.status === 'active') {
      await unpublishSurvey(selectedSurvey.id);
      setSelectedSurvey({ ...selectedSurvey, status: 'draft' });
    } else {
      await publishSurvey(selectedSurvey.id);
      setSelectedSurvey({ ...selectedSurvey, status: 'active' });
    }
  };

  const renderContent = () => {
    // Survey views
    if (surveyView === 'builder' && selectedSurvey) {
      return (
        <div className="p-4">
          <SurveyBuilder
            survey={selectedSurvey}
            onPublish={handlePublishToggle}
            onPreview={() => {
              setSurveyView('fill');
            }}
          />
        </div>
      );
    }

    if (surveyView === 'fill' && selectedSurvey) {
      return (
        <div className="p-4">
          <ActiveSurveyForm
            survey={selectedSurvey}
            onComplete={() => {
              setSurveyView('list');
              setSelectedSurvey(null);
            }}
          />
        </div>
      );
    }

    if (surveyView === 'responses' && selectedSurvey) {
      return (
        <div className="p-4 pb-24">
          <SurveyAnalytics
            survey={selectedSurvey}
            responses={responses}
          />
        </div>
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <div className="px-2 sm:px-4 py-4 space-y-4 pb-24">
            {/* Welcome Section */}
            <div className="slide-up">
              <h2 className="text-2xl font-bold text-foreground mb-1">
                Bonjour, {displayName} 👋
              </h2>
              <p className="text-muted-foreground">
                Prêt à collecter des données aujourd'hui ?
              </p>
            </div>

            {/* Enhanced Dashboard Stats */}
            <EnhancedDashboard surveys={surveys} responses={allResponses} />

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

            {/* Active Surveys */}
            {activeSurveys.length > 0 && (
              <div className="slide-up" style={{ animationDelay: '250ms' }}>
                <h3 className="font-semibold text-foreground mb-3">Enquêtes disponibles</h3>
                <div className="space-y-3">
                    {activeSurveys.slice(0, 3).map((survey) => (
                      <SurveyCardEnhanced
                        key={survey.id}
                        survey={survey}
                        responses={allResponses}
                        onClick={() => handleFillSurvey(survey)}
                        showSubscribe={true}
                        onSubscribe={() => {
                          toast.success(`Vous suivez maintenant "${survey.title}"`);
                        }}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'surveys':
        return (
          <div className="p-4 space-y-4 pb-24">
            <Tabs defaultValue="available" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="available" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Disponibles
                </TabsTrigger>
                <TabsTrigger value="my-surveys" className="flex items-center gap-2">
                  <FileEdit className="h-4 w-4" />
                  Mes enquêtes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="available" className="mt-4">
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Rechercher une enquête..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-10"
                  />
                </div>

                {surveysLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </div>
                ) : filteredActiveSurveys.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Aucune enquête disponible</p>
                    <p className="text-sm">Les enquêtes publiées apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredActiveSurveys.map((survey) => (
                      <SurveyCardEnhanced
                        key={survey.id}
                        survey={survey}
                        responses={allResponses}
                        onClick={() => handleFillSurvey(survey)}
                        showSubscribe={true}
                        onSubscribe={() => {
                          toast.success(`Vous suivez maintenant "${survey.title}"`);
                        }}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="my-surveys" className="mt-4 space-y-4">
                <CreateSurveyDialog onSubmit={handleCreateSurveyWithImage} onSurveyCreated={handleSurveyCreated} />
                
                {surveysLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </div>
                ) : (
                  <MySurveysList
                    surveys={mySurveys}
                    responseCounts={responseCounts}
                    onEdit={handleEditSurvey}
                    onDelete={deleteSurvey}
                    onPublish={publishSurvey}
                    onUnpublish={unpublishSurvey}
                    onViewResponses={handleViewResponses}
                    onDuplicate={duplicateSurvey}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        );

      case 'data':
        return (
          <div className="p-4 pb-24">
            {mySurveys.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Aucune donnée</p>
                <p className="text-sm">Créez des enquêtes pour collecter des données</p>
              </div>
            ) : selectedSurvey ? (
              <div className="space-y-4">
                {/* Back button and survey info */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedSurvey(null)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedSurvey.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {responses.length} réponse{responses.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <DataModuleTabs survey={selectedSurvey} responses={responses} />
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground text-lg">Données des enquêtes</h3>
                <p className="text-sm text-muted-foreground">
                  Sélectionnez une enquête pour voir les réponses collectées et les rapports d'analyse
                </p>
                <div className="grid gap-3">
                  {mySurveys.map((survey) => {
                    const surveyResponses = allResponses.filter(r => r.survey_id === survey.id);
                    return (
                      <SurveyCardEnhanced
                        key={survey.id}
                        survey={survey}
                        responses={allResponses}
                        onClick={() => handleSelectDataSurvey(survey)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 'settings':
        return (
          <div className="p-4 pb-24 w-full">
            <SettingsPanel
              syncStatus={syncStatus}
              onSync={handleSync}
              onClearData={() => {}}
              pendingCount={0}
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
        showBack={surveyView !== 'list'}
        onBack={handleBack}
        syncStatus={syncStatus}
        activeTab={surveyView === 'list' ? activeTab : undefined}
        onTabChange={surveyView === 'list' ? setActiveTab : undefined}
      />

      <main className="fade-in max-w-5xl mx-auto">
        {renderContent()}
      </main>

      {surveyView === 'list' && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  );
};

export default Index;
