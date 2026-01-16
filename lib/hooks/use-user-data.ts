'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

// Hook pour gérer les campagnes scopées par utilisateur
export function useUserCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaignsState] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Clé localStorage scopée par utilisateur
  const getStorageKey = useCallback(() => {
    if (!user?.id) return null;
    return `campaigns_${user.id}`;
  }, [user?.id]);

  // Charger les campagnes
  useEffect(() => {
    const key = getStorageKey();
    if (!key) {
      setCampaignsState([]);
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setCampaignsState(JSON.parse(stored));
      } else {
        setCampaignsState([]);
      }
    } catch (e) {
      console.error('Error loading campaigns:', e);
      setCampaignsState([]);
    }
    setIsLoading(false);
  }, [getStorageKey]);

  // Sauvegarder les campagnes
  const setCampaigns = useCallback((newCampaigns: any[] | ((prev: any[]) => any[])) => {
    const key = getStorageKey();
    if (!key) return;

    setCampaignsState(prev => {
      const updated = typeof newCampaigns === 'function' ? newCampaigns(prev) : newCampaigns;
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  }, [getStorageKey]);

  // Ajouter une campagne
  const addCampaign = useCallback((campaign: any) => {
    setCampaigns(prev => [...prev, campaign]);
  }, [setCampaigns]);

  // Mettre à jour une campagne
  const updateCampaign = useCallback((campaignId: string, updates: any) => {
    setCampaigns(prev =>
      prev.map(c => c.id === campaignId ? { ...c, ...updates } : c)
    );
  }, [setCampaigns]);

  // Supprimer une campagne
  const deleteCampaign = useCallback((campaignId: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== campaignId));
  }, [setCampaigns]);

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
  addedAt: string; // Date d'ajout
  lastUsedAt?: string; // Dernière utilisation dans une campagne
}

// Hook pour gérer les influenceurs scopés par utilisateur (indépendant des campagnes)
export function useUserInfluencers() {
  const { user } = useAuth();
  const [influencers, setInfluencersState] = useState<SavedInfluencer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Clé localStorage scopée par utilisateur
  const getStorageKey = useCallback(() => {
    if (!user?.id) return null;
    return `influencers_${user.id}`;
  }, [user?.id]);

  // Charger les influenceurs
  useEffect(() => {
    const key = getStorageKey();
    if (!key) {
      setInfluencersState([]);
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setInfluencersState(JSON.parse(stored));
      } else {
        setInfluencersState([]);
      }
    } catch (e) {
      console.error('Error loading influencers:', e);
      setInfluencersState([]);
    }
    setIsLoading(false);
  }, [getStorageKey]);

  // Sauvegarder les influenceurs
  const setInfluencers = useCallback((newInfluencers: SavedInfluencer[] | ((prev: SavedInfluencer[]) => SavedInfluencer[])) => {
    const key = getStorageKey();
    if (!key) return;

    setInfluencersState(prev => {
      const updated = typeof newInfluencers === 'function' ? newInfluencers(prev) : newInfluencers;
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  }, [getStorageKey]);

  // Ajouter ou mettre à jour un influenceur
  const saveInfluencer = useCallback((influencer: Omit<SavedInfluencer, 'addedAt'> & { addedAt?: string }) => {
    setInfluencers(prev => {
      const existing = prev.find(i => i.username === influencer.username);
      if (existing) {
        // Mettre à jour les infos (followers peuvent changer)
        return prev.map(i =>
          i.username === influencer.username
            ? { ...i, ...influencer, lastUsedAt: new Date().toISOString() }
            : i
        );
      }
      // Ajouter comme nouveau
      return [...prev, {
        ...influencer,
        addedAt: influencer.addedAt || new Date().toISOString()
      }];
    });
  }, [setInfluencers]);

  // Sauvegarder plusieurs influenceurs d'un coup
  const saveInfluencers = useCallback((newInfluencers: Array<Omit<SavedInfluencer, 'addedAt'>>) => {
    newInfluencers.forEach(inf => saveInfluencer(inf));
  }, [saveInfluencer]);

  // Supprimer un influenceur
  const deleteInfluencer = useCallback((username: string) => {
    setInfluencers(prev => prev.filter(i => i.username !== username));
  }, [setInfluencers]);

  // Rechercher dans les influenceurs existants
  const searchSavedInfluencers = useCallback((query: string): SavedInfluencer[] => {
    if (!query.trim()) return influencers;
    const q = query.toLowerCase();
    return influencers.filter(i =>
      i.username.toLowerCase().includes(q) ||
      i.fullName.toLowerCase().includes(q)
    );
  }, [influencers]);

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

// Fonction utilitaire pour migrer les anciennes données (optionnel)
export function migrateOldCampaigns(userId: string) {
  const oldKey = 'campaigns';
  const newKey = `campaigns_${userId}`;

  // Vérifier si des données existent déjà pour cet utilisateur
  const existingData = localStorage.getItem(newKey);
  if (existingData) return; // Ne pas écraser les données existantes

  // Migrer les anciennes données seulement pour l'utilisateur démo
  if (userId === 'demo-user') {
    const oldData = localStorage.getItem(oldKey);
    if (oldData) {
      localStorage.setItem(newKey, oldData);
    }
  }
}
