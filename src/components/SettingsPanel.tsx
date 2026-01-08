import { useState } from 'react';
import { 
  RefreshCw, Trash2, Download, Upload, Smartphone, Globe, LogOut,
  Settings, Shield, Bell, Palette, FileSpreadsheet, FileText, 
  ChevronRight, Database, HardDrive, Cloud
} from 'lucide-react';
import { SyncStatus } from '@/types/survey';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { ProfileEditor } from './ProfileEditor';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SettingsPanelProps {
  syncStatus: SyncStatus;
  onSync: () => void;
  onClearData: () => void;
  pendingCount: number;
}

export const SettingsPanel = ({ syncStatus, onSync, onClearData, pendingCount }: SettingsPanelProps) => {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['profile']));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleExportAllData = async () => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      // Fetch all user's surveys
      const { data: surveys, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (surveyError) throw surveyError;

      // Fetch all responses for user's surveys
      const { data: responses, error: responseError } = await supabase
        .from('survey_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (responseError) throw responseError;

      // Fetch all survey fields
      const surveyIds = surveys?.map(s => s.id) || [];
      const { data: fields, error: fieldsError } = await supabase
        .from('survey_fields')
        .select('*')
        .in('survey_id', surveyIds)
        .order('field_order', { ascending: true });

      if (fieldsError) throw fieldsError;

      // Create Excel workbook
      const wb = XLSX.utils.book_new();

      // Surveys sheet
      if (surveys && surveys.length > 0) {
        const surveysData = surveys.map(s => ({
          'ID': s.id,
          'Titre': s.title,
          'Description': s.description || '',
          'Statut': s.status === 'active' ? 'Publié' : s.status === 'draft' ? 'Brouillon' : s.status,
          'Date de création': format(new Date(s.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
          'Dernière modification': format(new Date(s.updated_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
        }));
        const surveysWs = XLSX.utils.json_to_sheet(surveysData);
        XLSX.utils.book_append_sheet(wb, surveysWs, 'Enquêtes');
      }

      // Create a sheet for each survey with its responses
      for (const survey of (surveys || [])) {
        const surveyFields = fields?.filter(f => f.survey_id === survey.id) || [];
        const surveyResponses = responses?.filter(r => r.survey_id === survey.id) || [];

        if (surveyResponses.length > 0) {
          const responseData = surveyResponses.map((r, index) => {
            const loc = r.location as { latitude?: number; longitude?: number } | null;
            const row: Record<string, any> = {
              '#': index + 1,
              'Date': format(new Date(r.created_at), 'dd/MM/yyyy', { locale: fr }),
              'Heure': format(new Date(r.created_at), 'HH:mm:ss', { locale: fr }),
              'Latitude': loc?.latitude || '',
              'Longitude': loc?.longitude || '',
            };

            surveyFields.forEach(field => {
              const value = r.data[field.id];
              if (Array.isArray(value)) {
                row[field.label] = value.join('; ');
              } else if (typeof value === 'object' && value !== null) {
                row[field.label] = JSON.stringify(value);
              } else {
                row[field.label] = String(value ?? '');
              }
            });

            return row;
          });

          // Truncate sheet name to 31 chars (Excel limit)
          const sheetName = survey.title.slice(0, 28) + (survey.title.length > 28 ? '...' : '');
          const ws = XLSX.utils.json_to_sheet(responseData);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      }

      // Summary sheet
      const summaryData = [
        ['EXPORT DE DONNÉES WOOCOLLEKT IA'],
        [`Exporté le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`],
        [`Utilisateur: ${user.email}`],
        [],
        ['RÉSUMÉ'],
        ['Nombre d\'enquêtes', surveys?.length || 0],
        ['Nombre total de réponses', responses?.length || 0],
        [],
        ['ENQUÊTES PAR STATUT'],
        ['Publiées', surveys?.filter(s => s.status === 'active').length || 0],
        ['Brouillons', surveys?.filter(s => s.status === 'draft').length || 0],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé');

      // Download
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbout]), `WooCollekt_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

      toast.success('Export terminé avec succès');
      setShowExportDialog(false);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      const { data: surveys } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: responses } = await supabase
        .from('survey_responses')
        .select('*');

      const csvLines = [
        'Type,ID,Titre/Date,Description/Données,Statut/GPS,Créé le'
      ];

      surveys?.forEach(s => {
        csvLines.push(`Enquête,"${s.id}","${s.title}","${s.description || ''}",${s.status},${s.created_at}`);
      });

      responses?.forEach(r => {
        const loc = r.location as { latitude?: number; longitude?: number } | null;
        const gps = loc ? `${loc.latitude};${loc.longitude}` : '';
        csvLines.push(`Réponse,"${r.id}","${r.created_at}","${JSON.stringify(r.data).replace(/"/g, '""')}","${gps}",${r.created_at}`);
      });

      const blob = new Blob(['\ufeff' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `WooCollekt_Export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      
      toast.success('Export CSV terminé');
      setShowExportDialog(false);
    } catch (error) {
      toast.error('Erreur lors de l\'export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    toast.info('Fonctionnalité d\'import à venir dans une prochaine version');
    setShowImportDialog(false);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Déconnexion réussie');
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Profile Section */}
      <Card className="border-border">
        <Collapsible open={expandedSections.has('profile')} onOpenChange={() => toggleSection('profile')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Profil</CardTitle>
                    <CardDescription className="text-xs">Gérer vos informations personnelles</CardDescription>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.has('profile') ? 'rotate-90' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <ProfileEditor profile={profile} />
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Sync Section */}
      <Card className="border-border">
        <Collapsible open={expandedSections.has('sync')} onOpenChange={() => toggleSection('sync')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Cloud className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Synchronisation</CardTitle>
                    <CardDescription className="text-xs">
                      {syncStatus.isOnline ? 'Connecté' : 'Hors ligne'}
                      {pendingCount > 0 && ` • ${pendingCount} en attente`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${syncStatus.isOnline ? 'bg-green-500' : 'bg-orange-500'}`} />
                  <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.has('sync') ? 'rotate-90' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Statut de connexion</p>
                  <p className="text-xs text-muted-foreground">
                    {syncStatus.isOnline ? 'Vos données sont synchronisées' : 'Les modifications seront synchronisées plus tard'}
                  </p>
                </div>
                <Badge variant={syncStatus.isOnline ? 'default' : 'secondary'}>
                  {syncStatus.isOnline ? 'En ligne' : 'Hors ligne'}
                </Badge>
              </div>

              {pendingCount > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div>
                    <p className="font-medium text-sm text-orange-700">Réponses en attente</p>
                    <p className="text-xs text-orange-600">{pendingCount} réponse{pendingCount > 1 ? 's' : ''} à synchroniser</p>
                  </div>
                  <Badge variant="outline" className="border-orange-500 text-orange-600">
                    {pendingCount}
                  </Badge>
                </div>
              )}

              <Button
                onClick={onSync}
                disabled={!syncStatus.isOnline || syncStatus.isSyncing}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                {syncStatus.isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Data Management Section */}
      <Card className="border-border">
        <Collapsible open={expandedSections.has('data')} onOpenChange={() => toggleSection('data')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Database className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Gestion des données</CardTitle>
                    <CardDescription className="text-xs">Exporter, importer et gérer vos données</CardDescription>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.has('data') ? 'rotate-90' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowExportDialog(true)}
              >
                <Download className="h-4 w-4 mr-3" />
                Exporter toutes les données
                <Badge variant="secondary" className="ml-auto">Excel / CSV</Badge>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowImportDialog(true)}
              >
                <Upload className="h-4 w-4 mr-3" />
                Importer des enquêtes
                <Badge variant="outline" className="ml-auto">Bientôt</Badge>
              </Button>

              <Separator />

              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm('Êtes-vous sûr de vouloir effacer toutes les données locales ? Cette action est irréversible.')) {
                    onClearData();
                    toast.success('Données locales effacées');
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-3" />
                Effacer les données locales
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Account Section */}
      <Card className="border-border">
        <Collapsible open={expandedSections.has('account')} onOpenChange={() => toggleSection('account')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Compte</CardTitle>
                    <CardDescription className="text-xs">{user?.email}</CardDescription>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.has('account') ? 'rotate-90' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Version de l'app</span>
                  <Badge variant="outline">1.0.0</Badge>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Se déconnecter
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exporter les données</DialogTitle>
            <DialogDescription>
              Exportez toutes vos enquêtes et réponses dans un fichier
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={handleExportAllData}
              disabled={isExporting}
            >
              <FileSpreadsheet className="h-5 w-5 mr-3 text-green-600" />
              <div className="text-left">
                <p className="font-medium">Excel (.xlsx)</p>
                <p className="text-xs text-muted-foreground">Export complet avec feuilles par enquête</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={handleExportCSV}
              disabled={isExporting}
            >
              <FileText className="h-5 w-5 mr-3 text-blue-600" />
              <div className="text-left">
                <p className="font-medium">CSV (.csv)</p>
                <p className="text-xs text-muted-foreground">Format universel pour tableurs</p>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowExportDialog(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer des enquêtes</DialogTitle>
            <DialogDescription>
              Cette fonctionnalité sera disponible prochainement
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              L'import d'enquêtes depuis des fichiers Excel ou CSV arrivera dans une prochaine mise à jour.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowImportDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
