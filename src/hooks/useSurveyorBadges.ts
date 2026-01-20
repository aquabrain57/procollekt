import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type BadgeStatus = 'active' | 'suspended' | 'expired';

export interface SurveyorBadge {
  id: string;
  user_id: string;
  surveyor_id: string;
  first_name: string;
  last_name: string;
  role: string;
  organization: string | null;
  project: string | null;
  covered_zone: string | null;
  phone: string | null;
  photo_url: string | null;
  status: BadgeStatus;
  qr_code_data: string | null;
  barcode_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBadgeInput {
  surveyor_id: string;
  first_name: string;
  last_name: string;
  role?: string;
  organization?: string;
  project?: string;
  covered_zone?: string;
  phone?: string;
  photo_url?: string;
}

export const useSurveyorBadges = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<SurveyorBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBadges = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('surveyor_badges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBadges((data as unknown as SurveyorBadge[]) || []);
    } catch (error: any) {
      console.error('Error fetching badges:', error);
      toast.error('Erreur lors du chargement des badges');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const createBadge = async (input: CreateBadgeInput) => {
    if (!user) return null;

    try {
      // Generate QR code data and barcode data
      const qrData = JSON.stringify({
        type: 'YOUCOLLECT_BADGE',
        id: input.surveyor_id,
        name: `${input.first_name} ${input.last_name}`,
        org: input.organization,
        created: new Date().toISOString(),
      });

      const barcodeData = `YC-${input.surveyor_id}-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from('surveyor_badges')
        .insert({
          user_id: user.id,
          surveyor_id: input.surveyor_id,
          first_name: input.first_name,
          last_name: input.last_name,
          role: input.role || 'surveyor',
          organization: input.organization,
          project: input.project,
          covered_zone: input.covered_zone,
          phone: input.phone,
          photo_url: input.photo_url,
          status: 'active' as BadgeStatus,
          qr_code_data: qrData,
          barcode_data: barcodeData,
        })
        .select()
        .single();

      if (error) throw error;

      const newBadge = data as unknown as SurveyorBadge;
      setBadges(prev => [newBadge, ...prev]);
      toast.success('Badge créé avec succès');
      return newBadge;
    } catch (error: any) {
      console.error('Error creating badge:', error);
      if (error.code === '23505') {
        toast.error('Un badge avec cet ID enquêteur existe déjà');
      } else {
        toast.error('Erreur lors de la création du badge');
      }
      return null;
    }
  };

  const updateBadge = async (id: string, updates: Partial<SurveyorBadge>) => {
    try {
      const { data, error } = await supabase
        .from('surveyor_badges')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedBadge = data as unknown as SurveyorBadge;
      setBadges(prev => prev.map(b => b.id === id ? updatedBadge : b));
      toast.success('Badge mis à jour');
      return updatedBadge;
    } catch (error: any) {
      console.error('Error updating badge:', error);
      toast.error('Erreur lors de la mise à jour');
      return null;
    }
  };

  const deleteBadge = async (id: string) => {
    try {
      const { error } = await supabase
        .from('surveyor_badges')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBadges(prev => prev.filter(b => b.id !== id));
      toast.success('Badge supprimé');
      return true;
    } catch (error: any) {
      console.error('Error deleting badge:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  };

  const suspendBadge = async (id: string) => {
    return updateBadge(id, { status: 'suspended' as BadgeStatus });
  };

  const activateBadge = async (id: string) => {
    return updateBadge(id, { status: 'active' as BadgeStatus });
  };

  const validateBadge = async (surveyorId: string): Promise<SurveyorBadge | null> => {
    try {
      const { data, error } = await supabase
        .from('surveyor_badges')
        .select('*')
        .eq('surveyor_id', surveyorId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return null;
      }

      const badge = data as unknown as SurveyorBadge;
      
      if (badge.status !== 'active') {
        return null;
      }

      return badge;
    } catch (error) {
      console.error('Error validating badge:', error);
      return null;
    }
  };

  return {
    badges,
    loading,
    createBadge,
    updateBadge,
    deleteBadge,
    suspendBadge,
    activateBadge,
    validateBadge,
    refetch: fetchBadges,
  };
};
