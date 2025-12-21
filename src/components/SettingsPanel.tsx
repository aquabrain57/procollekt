import { RefreshCw, Trash2, Download, Upload, Smartphone, Globe, LogOut } from 'lucide-react';
import { SyncStatus } from '@/types/survey';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { ProfileEditor } from './ProfileEditor';

interface SettingsPanelProps {
  syncStatus: SyncStatus;
  onSync: () => void;
  onClearData: () => void;
  pendingCount: number;
}

export const SettingsPanel = ({ syncStatus, onSync, onClearData, pendingCount }: SettingsPanelProps) => {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();

  const handleExport = () => {
    toast.info('Fonctionnalité d\'export à venir');
  };

  const handleImport = () => {
    toast.info('Fonctionnalité d\'import à venir');
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Déconnexion réussie');
  };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <ProfileEditor profile={profile} />

      {/* Sync Section */}
      <section className="bg-card rounded-xl border border-border p-4 slide-up" style={{ animationDelay: '50ms' }}>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          Synchronisation
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Statut</p>
              <p className="text-sm text-muted-foreground">
                {syncStatus.isOnline ? 'Connecté' : 'Hors ligne'}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${syncStatus.isOnline ? 'bg-success' : 'bg-offline'}`} />
          </div>

          {pendingCount > 0 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">En attente</p>
                <p className="text-sm text-muted-foreground">
                  {pendingCount} réponse{pendingCount > 1 ? 's' : ''} à synchroniser
                </p>
              </div>
            </div>
          )}

          <button
            onClick={onSync}
            disabled={!syncStatus.isOnline || syncStatus.isSyncing}
            className="w-full btn-primary py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
            {syncStatus.isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
          </button>
        </div>
      </section>

      {/* Data Management */}
      <section className="bg-card rounded-xl border border-border p-4 slide-up" style={{ animationDelay: '100ms' }}>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          Gestion des données
        </h3>

        <div className="space-y-3">
          <button
            onClick={handleExport}
            className="w-full btn-secondary py-3 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exporter les données
          </button>

          <button
            onClick={handleImport}
            className="w-full btn-secondary py-3 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Importer des enquêtes
          </button>

          <button
            onClick={() => {
              if (confirm('Êtes-vous sûr de vouloir effacer toutes les données locales ?')) {
                onClearData();
                toast.success('Données locales effacées');
              }
            }}
            className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Effacer les données locales
          </button>
        </div>
      </section>

      {/* Account Section */}
      <section className="bg-card rounded-xl border border-border p-4 slide-up" style={{ animationDelay: '150ms' }}>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Compte
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span className="text-foreground">1.0.0</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 border border-border text-foreground hover:bg-muted transition-colors mt-4"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>
      </section>
    </div>
  );
};
