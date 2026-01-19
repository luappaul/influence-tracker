'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';

// Interface pour une campagne
export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed';
  objective?: string;
  totalBudget: number;
  influencers: any[];
  createdAt: string;
  updatedAt?: string;
}

// Hook pour gérer les campagnes via Supabase
export function useUserCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaignsState] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les campagnes depuis Supabase
  useEffect(() => {
    if (!user?.id) {
      setCampaignsState([]);
      setIsLoading(false);
      return;
    }

    const fetchCampaigns = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching campaigns:', error);
          setCampaignsState([]);
        } else {
          // Mapper les données Supabase vers notre format
          const mapped = (data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            status: c.status || 'draft',
            objective: c.objective,
            totalBudget: parseFloat(c.total_budget) || 0,
            influencers: c.influencers || [],
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));
          setCampaignsState(mapped);
        }
      } catch (e) {
        console.error('Error loading campaigns:', e);
        setCampaignsState([]);
      }
      setIsLoading(false);
    };

    fetchCampaigns();
  }, [user?.id]);

  // Ajouter une campagne
  const addCampaign = useCallback(async (campaign: Omit<Campaign, 'id' | 'createdAt'>) => {
    if (!user?.id) return null;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: campaign.name,
          status: campaign.status || 'draft',
          objective: campaign.objective,
          total_budget: campaign.totalBudget || 0,
          influencers: campaign.influencers || [],
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding campaign:', error);
        return null;
      }

      const newCampaign: Campaign = {
        id: data.id,
        name: data.name,
        status: data.status,
        objective: data.objective,
        totalBudget: parseFloat(data.total_budget) || 0,
        influencers: data.influencers || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setCampaignsState(prev => [newCampaign, ...prev]);
      return newCampaign;
    } catch (e) {
      console.error('Error adding campaign:', e);
      return null;
    }
  }, [user?.id]);

  // Mettre à jour une campagne
  const updateCampaign = useCallback(async (campaignId: string, updates: Partial<Campaign>) => {
    if (!user?.id) return false;

    try {
      const supabase = createClient();

      // Mapper les updates vers le format Supabase
      const supabaseUpdates: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) supabaseUpdates.name = updates.name;
      if (updates.status !== undefined) supabaseUpdates.status = updates.status;
      if (updates.objective !== undefined) supabaseUpdates.objective = updates.objective;
      if (updates.totalBudget !== undefined) supabaseUpdates.total_budget = updates.totalBudget;
      if (updates.influencers !== undefined) supabaseUpdates.influencers = updates.influencers;

      const { error } = await supabase
        .from('campaigns')
        .update(supabaseUpdates)
        .eq('id', campaignId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating campaign:', error);
        return false;
      }

      setCampaignsState(prev =>
        prev.map(c => c.id === campaignId ? { ...c, ...updates, updatedAt: supabaseUpdates.updated_at } : c)
      );
      return true;
    } catch (e) {
      console.error('Error updating campaign:', e);
      return false;
    }
  }, [user?.id]);

  // Supprimer une campagne
  const deleteCampaign = useCallback(async (campaignId: string) => {
    if (!user?.id) return false;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting campaign:', error);
        return false;
      }

      setCampaignsState(prev => prev.filter(c => c.id !== campaignId));
      return true;
    } catch (e) {
      console.error('Error deleting campaign:', e);
      return false;
    }
  }, [user?.id]);

  // Fonction legacy pour compatibilité
  const setCampaigns = useCallback((newCampaigns: Campaign[] | ((prev: Campaign[]) => Campaign[])) => {
    console.warn('setCampaigns is deprecated, use addCampaign/updateCampaign instead');
    setCampaignsState(prev => {
      return typeof newCampaigns === 'function' ? newCampaigns(prev) : newCampaigns;
    });
  }, []);

  return {
    campaigns,
    setCampaigns,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    isLoading,
  };
}

// Interface pour un influenceur sauvegardé
export interface SavedInfluencer {
  id: string;
  username: string;
  fullName: string;
  profilePicUrl: string;
  followersCount: number;
  addedAt: string;
  lastUsedAt?: string;
}

// Hook pour gérer les influenceurs via Supabase
export function useUserInfluencers() {
  const { user } = useAuth();
  const [influencers, setInfluencersState] = useState<SavedInfluencer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les influenceurs depuis Supabase
  useEffect(() => {
    if (!user?.id) {
      setInfluencersState([]);
      setIsLoading(false);
      return;
    }

    const fetchInfluencers = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('saved_influencers')
          .select('*')
          .eq('user_id', user.id)
          .order('added_at', { ascending: false });

        if (error) {
          console.error('Error fetching influencers:', error);
          setInfluencersState([]);
        } else {
          const mapped = (data || []).map((i: any) => ({
            id: i.id,
            username: i.username,
            fullName: i.full_name || '',
            profilePicUrl: i.profile_pic_url || '',
            followersCount: i.followers_count || 0,
            addedAt: i.added_at,
            lastUsedAt: i.last_used_at,
          }));
          setInfluencersState(mapped);
        }
      } catch (e) {
        console.error('Error loading influencers:', e);
        setInfluencersState([]);
      }
      setIsLoading(false);
    };

    fetchInfluencers();
  }, [user?.id]);

  // Ajouter ou mettre à jour un influenceur
  const saveInfluencer = useCallback(async (influencer: Omit<SavedInfluencer, 'id' | 'addedAt'> & { addedAt?: string }) => {
    if (!user?.id) return null;

    try {
      const supabase = createClient();

      // Vérifier si l'influenceur existe déjà
      const existing = influencers.find(i => i.username === influencer.username);

      if (existing) {
        // Mise à jour
        const { error } = await supabase
          .from('saved_influencers')
          .update({
            full_name: influencer.fullName,
            profile_pic_url: influencer.profilePicUrl,
            followers_count: influencer.followersCount,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating influencer:', error);
          return null;
        }

        setInfluencersState(prev =>
          prev.map(i => i.username === influencer.username
            ? { ...i, ...influencer, lastUsedAt: new Date().toISOString() }
            : i
          )
        );
        return existing;
      } else {
        // Insertion
        const { data, error } = await supabase
          .from('saved_influencers')
          .insert({
            user_id: user.id,
            username: influencer.username,
            full_name: influencer.fullName,
            profile_pic_url: influencer.profilePicUrl,
            followers_count: influencer.followersCount,
          })
          .select()
          .single();

        if (error) {
          console.error('Error saving influencer:', error);
          return null;
        }

        const newInfluencer: SavedInfluencer = {
          id: data.id,
          username: data.username,
          fullName: data.full_name || '',
          profilePicUrl: data.profile_pic_url || '',
          followersCount: data.followers_count || 0,
          addedAt: data.added_at,
          lastUsedAt: data.last_used_at,
        };

        setInfluencersState(prev => [newInfluencer, ...prev]);
        return newInfluencer;
      }
    } catch (e) {
      console.error('Error saving influencer:', e);
      return null;
    }
  }, [user?.id, influencers]);

  // Sauvegarder plusieurs influenceurs
  const saveInfluencers = useCallback(async (newInfluencers: Array<Omit<SavedInfluencer, 'id' | 'addedAt'>>) => {
    for (const inf of newInfluencers) {
      await saveInfluencer(inf);
    }
  }, [saveInfluencer]);

  // Supprimer un influenceur
  const deleteInfluencer = useCallback(async (username: string) => {
    if (!user?.id) return false;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('saved_influencers')
        .delete()
        .eq('username', username)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting influencer:', error);
        return false;
      }

      setInfluencersState(prev => prev.filter(i => i.username !== username));
      return true;
    } catch (e) {
      console.error('Error deleting influencer:', e);
      return false;
    }
  }, [user?.id]);

  // Rechercher dans les influenceurs existants
  const searchSavedInfluencers = useCallback((query: string): SavedInfluencer[] => {
    if (!query.trim()) return influencers;
    const q = query.toLowerCase();
    return influencers.filter(i =>
      i.username.toLowerCase().includes(q) ||
      i.fullName.toLowerCase().includes(q)
    );
  }, [influencers]);

  // Fonction legacy pour compatibilité
  const setInfluencers = useCallback((newInfluencers: SavedInfluencer[] | ((prev: SavedInfluencer[]) => SavedInfluencer[])) => {
    console.warn('setInfluencers is deprecated, use saveInfluencer instead');
    setInfluencersState(prev => {
      return typeof newInfluencers === 'function' ? newInfluencers(prev) : newInfluencers;
    });
  }, []);

  return {
    influencers,
    setInfluencers,
    saveInfluencer,
    saveInfluencers,
    deleteInfluencer,
    searchSavedInfluencers,
    isLoading,
  };
}
