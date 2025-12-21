import { useState } from 'react';
import { User, Building, Phone, Save, Loader2 } from 'lucide-react';
import { Profile, useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

interface ProfileEditorProps {
  profile: Profile | null;
}

export const ProfileEditor = ({ profile }: ProfileEditorProps) => {
  const { updateProfile } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    organization: profile?.organization || '',
    phone: profile?.phone || '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await updateProfile(formData);
    setIsSaving(false);

    if (error) {
      toast.error('Erreur lors de la mise à jour du profil');
    } else {
      toast.success('Profil mis à jour');
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Mon profil
        </h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-primary font-medium hover:underline"
          >
            Modifier
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(false)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Annuler
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Full Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Nom complet
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="input-field"
              placeholder="Votre nom"
            />
          ) : (
            <p className="text-foreground">{profile?.full_name || 'Non renseigné'}</p>
          )}
        </div>

        {/* Organization */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            Organisation
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="input-field"
              placeholder="Votre organisation"
            />
          ) : (
            <p className="text-foreground">{profile?.organization || 'Non renseigné'}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Téléphone
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field"
              placeholder="Votre numéro de téléphone"
            />
          ) : (
            <p className="text-foreground">{profile?.phone || 'Non renseigné'}</p>
          )}
        </div>

        {/* Save Button */}
        {isEditing && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full btn-primary py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4" />
                Enregistrer
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
