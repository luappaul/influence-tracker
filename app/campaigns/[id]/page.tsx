'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Instagram,
  Users,
  Euro,
  Loader2,
  X,
  Pencil,
  Check,
  Calendar,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Video,
  Heart,
  MessageCircle,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Link2,
  Copy,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import { useUserCampaigns } from '@/lib/hooks/use-user-data';

interface ScrapedPost {
  id: string;
  shortCode: string;
  caption: string;
  url: string;
  commentsCount: number;
  likesCount: number;
  timestamp: string;
  type: string;
  displayUrl: string;
  videoUrl?: string;
  mentionsProduct?: boolean | null; // null = pas encore analysé, true = parle du produit, false = ne parle pas du produit
}

interface CampaignInfluencer {
  id: string;
  username: string;
  fullName: string;
  profilePicUrl: string;
  followersCount: number;
  budget: number;
  campaignStartDate?: string;
  campaignDays?: number;
  scrapedPosts?: ScrapedPost[];
  lastScrapedAt?: string;
  roi?: number | null;
  revenue?: number;
  collabToken?: string;
  instagramConnected?: boolean;
  collabSigned?: boolean; // L'influenceur a signé/accepté via le lien collab
  collabSignedAt?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'draft';
  locked?: boolean;
  influencers: CampaignInfluencer[];
  totalBudget: number;
  createdAt: string;
}

interface SearchResult {
  id: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  followers_count: number;
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const { campaigns, updateCampaign, deleteCampaign: deleteCampaignFromStorage, isLoading: isCampaignsLoading } = useUserCampaigns();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedInfluencers, setExpandedInfluencers] = useState<Set<string>>(new Set());
  const [scrapingInfluencer, setScrapingInfluencer] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const isLocked = campaign?.locked ?? false;

  const copyCollabLink = async (token: string) => {
    const link = `${window.location.origin}/collab/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  useEffect(() => {
    if (isCampaignsLoading) return;

    const found = campaigns.find((c: Campaign) => c.id === campaignId);
    if (found) {
      setCampaign(found);
      setEditedName(found.name);
    }
    setIsLoading(false);
  }, [campaignId, campaigns, isCampaignsLoading]);

  const saveCampaign = async (updatedCampaign: Campaign) => {
    // Update local state immediately for responsive UI
    setCampaign(updatedCampaign);
    // Save to Supabase in background
    const success = await updateCampaign(campaignId, updatedCampaign);
    if (!success) {
      console.error('Failed to save campaign to Supabase');
    }
  };

  const handleSaveName = () => {
    if (campaign && editedName.trim()) {
      saveCampaign({ ...campaign, name: editedName.trim() });
      setIsEditing(false);
    }
  };

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

  const addInfluencer = (result: SearchResult) => {
    if (!campaign) return;

    if (campaign.influencers.some((i) => i.username === result.username)) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const newInfluencer: CampaignInfluencer = {
      id: result.id || `temp-${Date.now()}`,
      username: result.username,
      fullName: result.full_name,
      profilePicUrl: result.profile_pic_url,
      followersCount: result.followers_count,
      budget: 0,
      campaignStartDate: today,
      campaignDays: 30,
      scrapedPosts: [],
      roi: null,
      revenue: 0,
    };

    const updatedCampaign = {
      ...campaign,
      influencers: [...campaign.influencers, newInfluencer],
    };
    saveCampaign(updatedCampaign);

    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const removeInfluencer = (username: string) => {
    if (!campaign) return;

    const updatedInfluencers = campaign.influencers.filter(
      (i) => i.username !== username
    );
    const newTotalBudget = updatedInfluencers.reduce((sum, i) => sum + i.budget, 0);

    saveCampaign({
      ...campaign,
      influencers: updatedInfluencers,
      totalBudget: newTotalBudget,
    });
  };

  const updateBudget = (username: string, budget: number) => {
    if (!campaign) return;

    const updatedInfluencers = campaign.influencers.map((i) =>
      i.username === username ? { ...i, budget } : i
    );
    const newTotalBudget = updatedInfluencers.reduce((sum, i) => sum + i.budget, 0);

    saveCampaign({
      ...campaign,
      influencers: updatedInfluencers,
      totalBudget: newTotalBudget,
    });
  };

  const updateCampaignStartDate = (username: string, date: string) => {
    if (!campaign) return;

    const updatedInfluencers = campaign.influencers.map((i) =>
      i.username === username ? { ...i, campaignStartDate: date } : i
    );

    saveCampaign({
      ...campaign,
      influencers: updatedInfluencers,
    });
  };

  const updateCampaignDays = (username: string, days: number) => {
    if (!campaign) return;

    const updatedInfluencers = campaign.influencers.map((i) =>
      i.username === username ? { ...i, campaignDays: days } : i
    );

    saveCampaign({
      ...campaign,
      influencers: updatedInfluencers,
    });
  };

  const scrapePosts = async (influencer: CampaignInfluencer) => {
    if (!campaign || !influencer.campaignStartDate || !influencer.campaignDays) return;

    setScrapingInfluencer(influencer.username);

    try {
      const startDate = new Date(influencer.campaignStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + influencer.campaignDays);

      // L'API calcule automatiquement le nombre optimal de posts à récupérer
      const response = await fetch(
        `/api/instagram/posts?username=${encodeURIComponent(influencer.username)}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const data = await response.json();

      // Afficher le warning si la campagne est ancienne
      if (data.warning) {
        alert(data.warning);
      }

      const updatedInfluencers = campaign.influencers.map((i) =>
        i.username === influencer.username
          ? {
              ...i,
              scrapedPosts: data.posts || [],
              lastScrapedAt: new Date().toISOString(),
            }
          : i
      );

      saveCampaign({
        ...campaign,
        influencers: updatedInfluencers,
      });

      // Auto-expand to show results
      setExpandedInfluencers((prev) => new Set([...prev, influencer.username]));
    } catch (error) {
      console.error('Scraping error:', error);
      alert('Erreur lors du scraping des posts');
    } finally {
      setScrapingInfluencer(null);
    }
  };

  // TEST: Récupère les 5 derniers posts sans filtrer par date (à supprimer après)
  const scrapeTestPosts = async (influencer: CampaignInfluencer) => {
    if (!campaign) return;

    setScrapingInfluencer(influencer.username);

    try {
      // Récupère les posts récents (l'API retourne déjà triés par date décroissante)
      const response = await fetch(
        `/api/instagram/posts?username=${encodeURIComponent(influencer.username)}`
      );
      const data = await response.json();

      // Trier par date décroissante (plus récent en premier) et prendre les 5 premiers
      const sortedPosts = (data.posts || []).sort((a: ScrapedPost, b: ScrapedPost) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      const latestPosts = sortedPosts.slice(0, 5);

      const updatedInfluencers = campaign.influencers.map((i) =>
        i.username === influencer.username
          ? {
              ...i,
              scrapedPosts: latestPosts,
              lastScrapedAt: new Date().toISOString(),
            }
          : i
      );

      saveCampaign({
        ...campaign,
        influencers: updatedInfluencers,
      });

      setExpandedInfluencers((prev) => new Set([...prev, influencer.username]));
    } catch (error) {
      console.error('Test scraping error:', error);
      alert('Erreur lors du scraping test');
    } finally {
      setScrapingInfluencer(null);
    }
  };

  const toggleExpand = (username: string) => {
    setExpandedInfluencers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(username)) {
        newSet.delete(username);
      } else {
        newSet.add(username);
      }
      return newSet;
    });
  };

  // Toggle le statut "mentionsProduct" d'un post: null → true → false → null
  const toggleProductMention = (username: string, postId: string) => {
    if (!campaign) return;

    const updatedInfluencers = campaign.influencers.map((influencer) => {
      if (influencer.username !== username) return influencer;

      const updatedPosts = influencer.scrapedPosts?.map((post) => {
        if ((post.id || post.shortCode) !== postId) return post;

        // Cycle: null/undefined → true → false → null
        let newValue: boolean | null;
        if (post.mentionsProduct === null || post.mentionsProduct === undefined) {
          newValue = true;
        } else if (post.mentionsProduct === true) {
          newValue = false;
        } else {
          newValue = null;
        }

        return { ...post, mentionsProduct: newValue };
      });

      return { ...influencer, scrapedPosts: updatedPosts };
    });

    saveCampaign({
      ...campaign,
      influencers: updatedInfluencers,
    });
  };

  const handleDeleteCampaign = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) return;

    const success = await deleteCampaignFromStorage(campaignId);
    if (success) {
      router.push('/campaigns');
    } else {
      alert('Erreur lors de la suppression de la campagne');
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux campagnes
        </Link>
        <Card className="text-center py-12">
          <p className="text-foreground-secondary">Campagne non trouvée</p>
        </Card>
      </div>
    );
  }

  // Reach = somme des followers pour chaque post qui parle du produit
  const productReach = campaign.influencers.reduce((sum, influencer) => {
    const productPosts = influencer.scrapedPosts?.filter(p => p.mentionsProduct === true) || [];
    // Chaque post qui parle du produit = reach potentiel de l'influenceur
    return sum + (productPosts.length * influencer.followersCount);
  }, 0);

  // Nombre de posts qui parlent du produit
  const productPostsCount = campaign.influencers.reduce(
    (sum, i) => sum + (i.scrapedPosts?.filter(p => p.mentionsProduct === true).length || 0),
    0
  );

  // Total de posts scrapés
  const totalPosts = campaign.influencers.reduce(
    (sum, i) => sum + (i.scrapedPosts?.length || 0),
    0
  );

  // Posts en attente d'analyse
  const pendingAnalysisPosts = campaign.influencers.reduce(
    (sum, i) => sum + (i.scrapedPosts?.filter(p => p.mentionsProduct === null || p.mentionsProduct === undefined).length || 0),
    0
  );

  // Total followers (pour le tableau des influenceurs)
  const totalFollowers = campaign.influencers.reduce(
    (sum, i) => sum + i.followersCount,
    0
  );

  const statusColors = {
    active: 'bg-success/10 text-success',
    completed: 'bg-foreground-secondary/10 text-foreground-secondary',
    draft: 'bg-warning/10 text-warning',
  };

  const statusLabels = {
    active: 'Active',
    completed: 'Terminée',
    draft: 'Brouillon',
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
        <Link
          href="/campaigns"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-background-secondary flex items-center justify-center hover:bg-border transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-foreground-secondary" />
        </Link>
        <div className="flex-1 min-w-0">
          {isEditing && !isLocked ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-lg sm:text-xl font-semibold"
                autoFocus
              />
              <Button size="sm" onClick={handleSaveName}>
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  setEditedName(campaign.name);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-lg sm:text-2xl font-semibold text-foreground truncate">
                {campaign.name}
              </h1>
              {!isLocked && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-foreground-secondary hover:text-foreground"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {isLocked && (
                <Badge className="bg-foreground-secondary/10 text-foreground-secondary text-xs">
                  <Lock className="w-3 h-3 mr-1" />
                  Verrouillée
                </Badge>
              )}
              <Badge className={`${statusColors[campaign.status]} text-xs`}>
                {statusLabels[campaign.status]}
              </Badge>
            </div>
          )}
          <p className="text-sm sm:text-base text-foreground-secondary">
            Créée le{' '}
            {new Date(campaign.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
        <Button variant="secondary" onClick={handleDeleteCampaign} className="hidden sm:flex">
          <Trash2 className="w-4 h-4 mr-2" />
          Supprimer
        </Button>
        <Button variant="secondary" onClick={handleDeleteCampaign} className="sm:hidden p-2">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Instagram className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-foreground-secondary">Influenceurs</p>
              <p className="text-xl font-semibold text-foreground">
                {campaign.influencers.length}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-foreground-secondary">Reach produit</p>
              <p className="text-xl font-semibold text-foreground">
                {formatNumber(productReach)}
              </p>
              {pendingAnalysisPosts > 0 && (
                <p className="text-xs text-warning">{pendingAnalysisPosts} posts à analyser</p>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Euro className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-foreground-secondary">Budget total</p>
              <p className="text-xl font-semibold text-foreground">
                {campaign.totalBudget.toLocaleString('fr-FR')} €
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-foreground-secondary">Posts produit</p>
              <p className="text-xl font-semibold text-foreground">
                {productPostsCount} <span className="text-sm font-normal text-foreground-secondary">/ {totalPosts}</span>
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Influenceurs */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Influenceurs ({campaign.influencers.length})</CardTitle>
          {!isLocked && (
            <Button onClick={() => setShowSearch(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          )}
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

              <div className="flex-1 overflow-y-auto space-y-2">
                {searchResults.map((result) => {
                  const isAdded = campaign.influencers.some(
                    (i) => i.username === result.username
                  );
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
                          (e.target as HTMLImageElement).className =
                            'w-10 h-10 rounded-full bg-accent/10';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {result.full_name || result.username}
                        </p>
                        <p className="text-sm text-foreground-secondary">
                          @{result.username} · {formatNumber(result.followers_count)}{' '}
                          followers
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

                {searchResults.length === 0 && searchQuery && !isSearching && (
                  <p className="text-center text-foreground-secondary py-8">
                    Aucun résultat. Essayez un autre username.
                  </p>
                )}

                {!searchQuery && (
                  <p className="text-center text-foreground-secondary py-8">
                    Entrez un username Instagram pour rechercher
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Grille des influenceurs */}
        {campaign.influencers.length > 0 ? (
          <div className="space-y-2">
            {/* Header de la grille - masqué sur mobile */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-foreground-secondary">
              <div className={isLocked ? "col-span-2" : "col-span-3"}>Influenceur</div>
              <div className="col-span-1 text-center">Followers</div>
              <div className="col-span-1 text-center">Budget</div>
              <div className={isLocked ? "col-span-2" : "col-span-2"}>Début</div>
              <div className="col-span-1 text-center">Durée</div>
              {isLocked && <div className="col-span-3 text-center">Lien collab</div>}
              <div className="col-span-2 text-center">Posts</div>
              {!isLocked && <div className="col-span-2"></div>}
            </div>

            {/* Lignes */}
            {campaign.influencers.map((influencer) => {
              const isExpanded = expandedInfluencers.has(influencer.username);
              const isScraping = scrapingInfluencer === influencer.username;
              const postsCount = influencer.scrapedPosts?.length || 0;

              return (
                <div key={influencer.username} className="space-y-0">
                  {/* Ligne principale - Desktop */}
                  <div
                    className={`hidden md:grid grid-cols-12 gap-4 items-center p-4 rounded-lg bg-background-secondary ${
                      isExpanded ? 'rounded-b-none' : ''
                    }`}
                  >
                    {/* Influenceur */}
                    <div className={`${isLocked ? 'col-span-2' : 'col-span-3'} flex items-center gap-3`}>
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden relative">
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
                        {isLocked && influencer.instagramConnected && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
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
                    <div className="col-span-1 text-center">
                      <span className="text-foreground text-sm">
                        {formatNumber(influencer.followersCount)}
                      </span>
                    </div>

                    {/* Budget */}
                    <div className="col-span-1 text-center">
                      {isLocked ? (
                        <span className="text-foreground text-sm font-medium">
                          {influencer.budget.toLocaleString('fr-FR')} €
                        </span>
                      ) : (
                        <div className="relative">
                          <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground-secondary" />
                          <Input
                            type="number"
                            placeholder="0"
                            value={influencer.budget || ''}
                            onChange={(e) =>
                              updateBudget(
                                influencer.username,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="pl-7 text-center text-sm h-8"
                          />
                        </div>
                      )}
                    </div>

                    {/* Date début */}
                    <div className="col-span-2">
                      {isLocked ? (
                        <span className="text-foreground text-sm">
                          {influencer.campaignStartDate ? formatDate(influencer.campaignStartDate) : '-'}
                        </span>
                      ) : (
                        <Input
                          type="date"
                          value={influencer.campaignStartDate || ''}
                          onChange={(e) =>
                            updateCampaignStartDate(influencer.username, e.target.value)
                          }
                          className="text-center text-sm h-8"
                        />
                      )}
                    </div>

                    {/* Durée */}
                    <div className="col-span-1 text-center">
                      {isLocked ? (
                        <span className="text-foreground text-sm">
                          {influencer.campaignDays || 0}j
                        </span>
                      ) : (
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="30"
                            value={influencer.campaignDays || ''}
                            onChange={(e) =>
                              updateCampaignDays(
                                influencer.username,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="text-center text-sm h-8 pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-foreground-secondary">
                            j
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Lien collab (seulement si verrouillé) */}
                    {isLocked && (
                      <div className="col-span-3 flex items-center justify-center gap-2">
                        {influencer.collabToken ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => copyCollabLink(influencer.collabToken!)}
                              className="h-7 text-xs"
                            >
                              {copiedToken === influencer.collabToken ? (
                                <>
                                  <Check className="w-3 h-3 mr-1 text-success" />
                                  Copié !
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copier le lien
                                </>
                              )}
                            </Button>
                            {influencer.collabSigned ? (
                              <Badge className="bg-success/10 text-success text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                Signé
                              </Badge>
                            ) : (
                              <Badge className="bg-warning/10 text-warning text-xs">
                                En attente
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-foreground-secondary">-</span>
                        )}
                      </div>
                    )}

                    {/* Posts & Scrape */}
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => scrapePosts(influencer)}
                        disabled={isScraping}
                        className="h-7 text-xs px-2"
                        title="Scraper les posts de la période"
                      >
                        {isScraping ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                      </Button>
                      {/* TEST BUTTON - À SUPPRIMER */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => scrapeTestPosts(influencer)}
                        disabled={isScraping}
                        className="h-7 text-xs px-2 bg-warning/20 hover:bg-warning/30 text-warning"
                        title="TEST: 5 derniers posts"
                      >
                        Test
                      </Button>
                      {postsCount > 0 && (
                        <button
                          onClick={() => toggleExpand(influencer.username)}
                          className="flex items-center gap-1 text-sm text-accent hover:underline"
                        >
                          {postsCount}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Actions (seulement si non verrouillé) */}
                    {!isLocked && (
                      <div className="col-span-2 flex justify-end">
                        <button
                          onClick={() => removeInfluencer(influencer.username)}
                          className="p-2 text-foreground-secondary hover:text-danger transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Ligne principale - Mobile */}
                  <div
                    className={`md:hidden p-3 rounded-lg bg-background-secondary ${
                      isExpanded ? 'rounded-b-none' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden flex-shrink-0">
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
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {influencer.fullName || influencer.username}
                        </p>
                        <p className="text-xs text-foreground-secondary">@{influencer.username}</p>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                          <span className="text-foreground-secondary">{formatNumber(influencer.followersCount)} followers</span>
                          <span className="text-foreground-secondary">•</span>
                          <span className="text-foreground">{influencer.budget.toLocaleString('fr-FR')} €</span>
                        </div>
                      </div>
                      {!isLocked && (
                        <button
                          onClick={() => removeInfluencer(influencer.username)}
                          className="p-2 text-foreground-secondary hover:text-danger"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => scrapePosts(influencer)}
                          disabled={isScraping}
                          className="h-7 text-xs px-2"
                        >
                          {isScraping ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </Button>
                        {postsCount > 0 && (
                          <button
                            onClick={() => toggleExpand(influencer.username)}
                            className="flex items-center gap-1 text-sm text-accent"
                          >
                            {postsCount} posts
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                      {isLocked && influencer.collabSigned && (
                        <Badge className="bg-success/10 text-success text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          Signé
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Posts expandés - Format tableau */}
                  {isExpanded && influencer.scrapedPosts && influencer.scrapedPosts.length > 0 && (
                    <div className="bg-background-secondary/50 rounded-b-lg p-4 border-t border-border/30">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-foreground-secondary">
                          {influencer.scrapedPosts.length} posts trouvés
                        </p>
                        {influencer.lastScrapedAt && (
                          <p className="text-xs text-foreground-secondary">
                            Scrapé le {formatDate(influencer.lastScrapedAt)}
                          </p>
                        )}
                      </div>

                      {/* Header du tableau - masqué sur mobile */}
                      <div className="hidden sm:grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-foreground-secondary border-b border-border/30 mb-2">
                        <div className="col-span-1">Post</div>
                        <div className="col-span-2">Date</div>
                        <div className="col-span-1 text-center">Type</div>
                        <div className="col-span-1 text-center">Likes</div>
                        <div className="col-span-1 text-center">Comm.</div>
                        <div className="col-span-4">Contenu</div>
                        <div className="col-span-2 text-center">Produit ?</div>
                      </div>

                      {/* Lignes des posts */}
                      <div className="space-y-2">
                        {influencer.scrapedPosts.map((post) => (
                          <React.Fragment key={post.id || post.shortCode}>
                          {/* Desktop row */}
                          <div
                            className="hidden sm:grid grid-cols-12 gap-3 items-center p-3 rounded-lg bg-background hover:bg-background/80 transition-colors"
                          >
                            {/* Thumbnail */}
                            <div className="col-span-1">
                              <a
                                href={post.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-12 h-12 rounded-lg overflow-hidden bg-background-secondary"
                              >
                                {post.displayUrl ? (
                                  <img
                                    src={`/api/proxy-image?url=${encodeURIComponent(post.displayUrl)}`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    {post.type === 'Video' ? (
                                      <Video className="w-5 h-5 text-foreground-secondary" />
                                    ) : (
                                      <ImageIcon className="w-5 h-5 text-foreground-secondary" />
                                    )}
                                  </div>
                                )}
                              </a>
                            </div>

                            {/* Date */}
                            <div className="col-span-2 text-sm text-foreground">
                              {formatDate(post.timestamp)}
                            </div>

                            {/* Type */}
                            <div className="col-span-1 flex justify-center">
                              {post.type === 'Video' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-info/10 text-info text-xs">
                                  <Video className="w-3 h-3" />
                                  Vidéo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/10 text-accent text-xs">
                                  <ImageIcon className="w-3 h-3" />
                                  Image
                                </span>
                              )}
                            </div>

                            {/* Likes */}
                            <div className="col-span-1 text-center">
                              <div className="flex items-center justify-center gap-1 text-sm text-foreground">
                                <Heart className="w-3 h-3 text-danger" />
                                {formatNumber(post.likesCount)}
                              </div>
                            </div>

                            {/* Comments */}
                            <div className="col-span-1 text-center">
                              <div className="flex items-center justify-center gap-1 text-sm text-foreground">
                                <MessageCircle className="w-3 h-3 text-info" />
                                {formatNumber(post.commentsCount)}
                              </div>
                            </div>

                            {/* Caption */}
                            <div className="col-span-4">
                              <p className="text-sm text-foreground-secondary line-clamp-2">
                                {post.caption || <span className="italic">Pas de légende</span>}
                              </p>
                            </div>

                            {/* Produit mention - Cliquable pour toggle */}
                            <div className="col-span-2 flex items-center justify-center">
                              <button
                                onClick={() => toggleProductMention(influencer.username, post.id || post.shortCode)}
                                className="transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent/50 rounded-full"
                                title="Cliquer pour modifier"
                              >
                                {post.mentionsProduct === true ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-xs hover:bg-success/20">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Oui
                                  </span>
                                ) : post.mentionsProduct === false ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-danger/10 text-danger text-xs hover:bg-danger/20">
                                    <XCircle className="w-3 h-3" />
                                    Non
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-foreground-secondary/10 text-foreground-secondary text-xs hover:bg-foreground-secondary/20">
                                    <HelpCircle className="w-3 h-3" />
                                    ?
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Mobile post card */}
                          <div className="sm:hidden p-3 rounded-lg bg-background">
                            <div className="flex gap-3">
                              <a href={post.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                <div className="w-14 h-14 rounded-lg bg-background-secondary overflow-hidden">
                                  {post.displayUrl ? (
                                    <img
                                      src={`/api/proxy-image?url=${encodeURIComponent(post.displayUrl)}`}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      {post.type === 'Video' ? <Video className="w-5 h-5 text-foreground-secondary" /> : <ImageIcon className="w-5 h-5 text-foreground-secondary" />}
                                    </div>
                                  )}
                                </div>
                              </a>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 text-xs text-foreground-secondary mb-1">
                                  <span>{formatDate(post.timestamp)}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{formatNumber(post.likesCount)}</span>
                                  <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{formatNumber(post.commentsCount)}</span>
                                </div>
                                <p className="text-xs text-foreground-secondary line-clamp-2 mb-2">
                                  {post.caption || <span className="italic">Pas de légende</span>}
                                </p>
                                <button
                                  onClick={() => toggleProductMention(influencer.username, post.id || post.shortCode)}
                                  className="text-xs"
                                >
                                  {post.mentionsProduct === true ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success">
                                      <CheckCircle2 className="w-3 h-3" />Produit
                                    </span>
                                  ) : post.mentionsProduct === false ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger/10 text-danger">
                                      <XCircle className="w-3 h-3" />Non
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground-secondary/10 text-foreground-secondary">
                                      <HelpCircle className="w-3 h-3" />?
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                        </React.Fragment>
                        ))}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}

            {/* Total - Desktop */}
            <div className="hidden md:grid grid-cols-12 gap-4 items-center px-4 py-3 border-t border-border mt-2">
              <div className={`${isLocked ? 'col-span-2' : 'col-span-3'} font-medium text-foreground`}>Total</div>
              <div className="col-span-1 text-center font-medium text-foreground">
                {formatNumber(totalFollowers)}
              </div>
              <div className="col-span-1 text-center font-semibold text-foreground">
                {campaign.totalBudget.toLocaleString('fr-FR')} €
              </div>
              <div className={isLocked ? "col-span-6" : "col-span-5"}></div>
              <div className="col-span-2 text-center font-medium text-foreground">
                {totalPosts} posts
              </div>
            </div>
            {/* Total - Mobile */}
            <div className="md:hidden flex items-center justify-between px-3 py-3 border-t border-border mt-2 text-sm">
              <span className="font-medium text-foreground">Total</span>
              <div className="flex items-center gap-4 text-foreground-secondary">
                <span>{formatNumber(totalFollowers)} followers</span>
                <span className="font-semibold text-foreground">{campaign.totalBudget.toLocaleString('fr-FR')} €</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-foreground-secondary">
            <Instagram className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun influenceur dans cette campagne</p>
            <p className="text-sm mt-1">
              Cliquez sur "Ajouter" pour rechercher des influenceurs
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
