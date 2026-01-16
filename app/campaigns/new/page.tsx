'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Instagram,
  Users,
  Euro,
  Save,
  Loader2,
  X,
  Calendar,
  Target,
  TrendingUp,
  Megaphone,
  Sparkles,
  ShoppingBag,
  AlertTriangle,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import { campaignObjectives, CampaignObjective } from '@/lib/mock-data';
import { useUserCampaigns, useUserInfluencers, SavedInfluencer } from '@/lib/hooks/use-user-data';

interface InfluencerEntry {
  id: string;
  username: string;
  fullName: string;
  profilePicUrl: string;
  followersCount: number;
  budget: number;
  campaignStartDate: string;
  campaignDays: number;
}

interface SearchResult {
  id: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  followers_count: number;
}

// Icônes pour les objectifs
const objectiveIcons: Record<CampaignObjective, React.ReactNode> = {
  ventes: <ShoppingBag className="w-5 h-5" />,
  notoriete: <Megaphone className="w-5 h-5" />,
  engagement: <TrendingUp className="w-5 h-5" />,
  lancement: <Sparkles className="w-5 h-5" />,
};

export default function NewCampaignPage() {
  const router = useRouter();
  const { addCampaign } = useUserCampaigns();
  const { influencers: savedInfluencers, saveInfluencer, searchSavedInfluencers } = useUserInfluencers();
  const [campaignName, setCampaignName] = useState('');
  const [objective, setObjective] = useState<CampaignObjective>('ventes');
  const [influencers, setInfluencers] = useState<InfluencerEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Filtrer les influenceurs sauvegardés qui matchent la recherche
  const filteredSavedInfluencers = searchQuery.trim()
    ? searchSavedInfluencers(searchQuery)
    : savedInfluencers;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/instagram/search?q=${encodeURIComponent(searchQuery)}&type=username`
      );
      const data = await response.json();
      setSearchResults(data.profiles || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Ajouter depuis un influenceur sauvegardé
  const addFromSaved = (saved: SavedInfluencer) => {
    if (influencers.some((i) => i.username === saved.username)) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    setInfluencers([
      ...influencers,
      {
        id: saved.id,
        username: saved.username,
        fullName: saved.fullName,
        profilePicUrl: saved.profilePicUrl,
        followersCount: saved.followersCount,
        budget: 0,
        campaignStartDate: today,
        campaignDays: 30,
      },
    ]);

    // Mettre à jour lastUsedAt
    saveInfluencer({ ...saved, lastUsedAt: new Date().toISOString() });

    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  // Ajouter depuis une recherche Instagram (nouveau)
  const addInfluencer = (result: SearchResult) => {
    if (influencers.some((i) => i.username === result.username)) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const newInfluencer: InfluencerEntry = {
      id: result.id || `temp-${Date.now()}`,
      username: result.username,
      fullName: result.full_name,
      profilePicUrl: result.profile_pic_url,
      followersCount: result.followers_count,
      budget: 0,
      campaignStartDate: today,
      campaignDays: 30,
    };

    setInfluencers([...influencers, newInfluencer]);

    // Sauvegarder dans la base d'influenceurs
    saveInfluencer({
      id: newInfluencer.id,
      username: newInfluencer.username,
      fullName: newInfluencer.fullName,
      profilePicUrl: newInfluencer.profilePicUrl,
      followersCount: newInfluencer.followersCount,
      addedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });

    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const removeInfluencer = (username: string) => {
    setInfluencers(influencers.filter((i) => i.username !== username));
  };

  const updateBudget = (username: string, budget: number) => {
    setInfluencers(
      influencers.map((i) =>
        i.username === username ? { ...i, budget } : i
      )
    );
  };

  const updateStartDate = (username: string, date: string) => {
    setInfluencers(
      influencers.map((i) =>
        i.username === username ? { ...i, campaignStartDate: date } : i
      )
    );
  };

  const updateDays = (username: string, days: number) => {
    setInfluencers(
      influencers.map((i) =>
        i.username === username ? { ...i, campaignDays: days } : i
      )
    );
  };

  const totalBudget = influencers.reduce((sum, i) => sum + i.budget, 0);

  // Générer un token unique pour chaque influenceur
  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleCreateClick = () => {
    if (!campaignName.trim()) {
      alert('Veuillez entrer un nom de campagne');
      return;
    }
    if (influencers.length === 0) {
      alert('Veuillez ajouter au moins un influenceur');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    setShowConfirmModal(false);

    const newCampaign = {
      id: `camp-${Date.now()}`,
      name: campaignName,
      objective: objective,
      status: 'active',
      locked: true, // La campagne est verrouillée après création
      influencers: influencers.map((i) => ({
        ...i,
        collabToken: generateToken(), // Token unique pour le lien de collaboration
        scrapedPosts: [],
        roi: null,
        revenue: 0,
        instagramConnected: false,
      })),
      totalBudget,
      createdAt: new Date().toISOString(),
    };

    addCampaign(newCampaign);

    setTimeout(() => {
      router.push(`/campaigns/${newCampaign.id}`);
    }, 500);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/campaigns"
          className="w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center hover:bg-border transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Nouvelle campagne</h1>
          <p className="text-foreground-secondary">Créez une campagne et ajoutez des influenceurs</p>
        </div>
      </div>

      {/* Informations de la campagne */}
      <Card>
        <CardTitle className="mb-4">Informations</CardTitle>
        <div className="space-y-6">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nom de la campagne
            </label>
            <Input
              placeholder="Ex: Lancement Été 2024"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>

          {/* Objectif */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" />
                Objectif de la campagne
              </div>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {campaignObjectives.map((obj) => (
                <button
                  key={obj.value}
                  type="button"
                  onClick={() => setObjective(obj.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    objective === obj.value
                      ? 'border-accent bg-accent/5 text-accent'
                      : 'border-border hover:border-foreground-secondary text-foreground-secondary hover:text-foreground'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    objective === obj.value ? 'bg-accent/10' : 'bg-background-secondary'
                  }`}>
                    {objectiveIcons[obj.value]}
                  </div>
                  <span className="font-medium text-sm">{obj.label}</span>
                  <span className="text-xs text-center opacity-70">{obj.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Influenceurs */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Influenceurs ({influencers.length})</CardTitle>
          <Button onClick={() => setShowSearch(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {/* Modal de recherche */}
        {showSearch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card rounded-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Rechercher un influenceur
                </h3>
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-foreground-secondary hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                  <Input
                    placeholder="Username Instagram..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Influenceurs sauvegardés */}
                {filteredSavedInfluencers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground-secondary mb-2 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Mes influenceurs ({filteredSavedInfluencers.length})
                    </p>
                    <div className="space-y-2">
                      {filteredSavedInfluencers.map((saved) => {
                        const isAdded = influencers.some((i) => i.username === saved.username);
                        return (
                          <div
                            key={saved.username}
                            className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20"
                          >
                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
                              {saved.profilePicUrl ? (
                                <img
                                  src={`/api/proxy-image?url=${encodeURIComponent(saved.profilePicUrl)}`}
                                  alt={saved.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-medium text-accent">
                                  {saved.username.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {saved.fullName || saved.username}
                              </p>
                              <p className="text-sm text-foreground-secondary">
                                @{saved.username} · {formatNumber(saved.followersCount)} followers
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant={isAdded ? 'secondary' : 'primary'}
                              onClick={() => addFromSaved(saved)}
                              disabled={isAdded}
                            >
                              {isAdded ? 'Ajouté' : 'Ajouter'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Résultats de recherche Instagram */}
                {searchResults.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground-secondary mb-2 flex items-center gap-1">
                      <Instagram className="w-3 h-3" />
                      Résultats Instagram
                    </p>
                    <div className="space-y-2">
                      {searchResults.map((result) => {
                        const isAdded = influencers.some((i) => i.username === result.username);
                        const isSaved = savedInfluencers.some((i) => i.username === result.username);
                        return (
                          <div
                            key={result.id || result.username}
                            className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary"
                          >
                            <img
                              src={
                                result.profile_pic_url
                                  ? `/api/proxy-image?url=${encodeURIComponent(result.profile_pic_url)}`
                                  : ''
                              }
                              alt={result.username}
                              className="w-10 h-10 rounded-full bg-background object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '';
                                (e.target as HTMLImageElement).className = 'w-10 h-10 rounded-full bg-accent/10';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {result.full_name || result.username}
                              </p>
                              <p className="text-sm text-foreground-secondary">
                                @{result.username} · {formatNumber(result.followers_count)} followers
                                {isSaved && <span className="ml-1 text-accent">(déjà sauvegardé)</span>}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant={isAdded ? 'secondary' : 'primary'}
                              onClick={() => addInfluencer(result)}
                              disabled={isAdded}
                            >
                              {isAdded ? 'Ajouté' : 'Ajouter'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Message si aucun résultat */}
                {searchResults.length === 0 && filteredSavedInfluencers.length === 0 && searchQuery && !isSearching && (
                  <p className="text-center text-foreground-secondary py-8">
                    Aucun résultat. Cliquez sur la loupe pour rechercher sur Instagram.
                  </p>
                )}

                {/* Message initial */}
                {!searchQuery && savedInfluencers.length === 0 && (
                  <p className="text-center text-foreground-secondary py-8">
                    Entrez un username Instagram pour rechercher
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Grille des influenceurs */}
        {influencers.length > 0 ? (
          <div className="space-y-3">
            {/* Header de la grille */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-foreground-secondary">
              <div className="col-span-3">Influenceur</div>
              <div className="col-span-2 text-center">Followers</div>
              <div className="col-span-2 text-center">Budget</div>
              <div className="col-span-2 text-center">Date début</div>
              <div className="col-span-2 text-center">Durée</div>
              <div className="col-span-1"></div>
            </div>

            {/* Lignes */}
            {influencers.map((influencer) => (
              <div
                key={influencer.username}
                className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg bg-background-secondary"
              >
                {/* Influenceur */}
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
                    {influencer.profilePicUrl ? (
                      <img
                        src={`/api/proxy-image?url=${encodeURIComponent(influencer.profilePicUrl)}`}
                        alt={influencer.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-accent">
                        {influencer.username.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {influencer.fullName || influencer.username}
                    </p>
                    <a
                      href={`https://instagram.com/${influencer.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent hover:underline"
                    >
                      @{influencer.username}
                    </a>
                  </div>
                </div>

                {/* Followers */}
                <div className="col-span-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-foreground">
                    <Users className="w-4 h-4 text-foreground-secondary" />
                    {formatNumber(influencer.followersCount)}
                  </div>
                </div>

                {/* Budget */}
                <div className="col-span-2">
                  <div className="relative">
                    <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground-secondary" />
                    <Input
                      type="number"
                      placeholder="0"
                      value={influencer.budget || ''}
                      onChange={(e) =>
                        updateBudget(influencer.username, parseFloat(e.target.value) || 0)
                      }
                      className="pl-7 text-center text-sm h-9"
                    />
                  </div>
                </div>

                {/* Date début */}
                <div className="col-span-2">
                  <Input
                    type="date"
                    value={influencer.campaignStartDate}
                    onChange={(e) => updateStartDate(influencer.username, e.target.value)}
                    className="text-center text-sm h-9"
                  />
                </div>

                {/* Durée */}
                <div className="col-span-2">
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="30"
                      value={influencer.campaignDays || ''}
                      onChange={(e) =>
                        updateDays(influencer.username, parseInt(e.target.value) || 0)
                      }
                      className="text-center text-sm h-9 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-secondary">
                      jours
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => removeInfluencer(influencer.username)}
                    className="p-2 text-foreground-secondary hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-t border-border">
              <div className="col-span-3 font-medium text-foreground">Total</div>
              <div className="col-span-2"></div>
              <div className="col-span-2 text-center font-semibold text-foreground">
                {totalBudget.toLocaleString('fr-FR')} €
              </div>
              <div className="col-span-5"></div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-foreground-secondary">
            <Instagram className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun influenceur ajouté</p>
            <p className="text-sm mt-1">
              Cliquez sur "Ajouter" pour rechercher des influenceurs
            </p>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link href="/campaigns">
          <Button variant="secondary">Annuler</Button>
        </Link>
        <Button onClick={handleCreateClick} disabled={isSaving || !campaignName.trim()}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Créer la campagne
        </Button>
      </div>

      {/* Modal de confirmation */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Confirmer la création
                </h3>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <p className="text-foreground-secondary">
                Une fois la campagne créée, les informations suivantes ne pourront plus être modifiées :
              </p>
              <ul className="text-sm text-foreground-secondary space-y-2">
                <li className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-warning" />
                  Nom de la campagne
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-warning" />
                  Liste des influenceurs
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-warning" />
                  Budgets et dates de collaboration
                </li>
              </ul>
              <p className="text-sm text-foreground-secondary mt-4">
                Un lien unique sera généré pour chaque influenceur afin qu'il puisse connecter son compte Instagram.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowConfirmModal(false)}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Confirmer et créer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
