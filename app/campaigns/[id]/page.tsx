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
  Lock,
  Circle,
  Clock,
  AtSign,
  Hash
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

interface ScrapedStory {
  id: string;
  pk: string;
  code: string;
  mediaType: 'image' | 'video';
  imageUrl: string;
  videoUrl?: string;
  timestamp: string;
  expiresAt: string;
  username: string;
  mentions: string[];
  hashtags: string[];
  linkUrl?: string;
  mentionsProduct?: boolean | null;
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
  scrapedStories?: ScrapedStory[];
  lastScrapedAt?: string;
  lastStoriesScrapedAt?: string;
  roi?: number | null;
  revenue?: number;
  collabToken?: string;
  instagramConnected?: boolean;
  collabSigned?: boolean;
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

interface StoryMention {
  id: string;
  media_id: string;
  media_type: string;
  media_url: string;
  mentioned_by_username: string | null;
  mentioned_by_user_id: string | null;
  received_at: string;
  expires_at: string | null;
  processed: boolean;
  campaign_id: string | null;
  influencer_username: string | null;
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
  const [mentions, setMentions] = useState<StoryMention[]>([]);
  const [mentionsLoading, setMentionsLoading] = useState(false);

  const isLocked = campaign?.locked ?? false;

  // Récupérer les mentions depuis l'API
  const fetchMentions = async () => {
    setMentionsLoading(true);
    try {
      const response = await fetch(`/api/instagram/mentions?campaign_id=${campaignId}`);
      const data = await response.json();
      // Inclure aussi les mentions non assignées
      const allMentionsResponse = await fetch('/api/instagram/mentions?unprocessed=true');
      const allMentionsData = await allMentionsResponse.json();

      // Combiner les mentions de cette campagne + les mentions non traitées
      const combinedMentions = [
        ...(data.mentions || []),
        ...(allMentionsData.mentions || []).filter(
          (m: StoryMention) => !data.mentions?.some((cm: StoryMention) => cm.id === m.id)
        ),
      ];
      setMentions(combinedMentions);
    } catch (error) {
      console.error('Error fetching mentions:', error);
    } finally {
      setMentionsLoading(false);
    }
  };

  // Associer une mention à un influenceur de la campagne
  const assignMentionToInfluencer = async (mentionId: string, influencerUsername: string) => {
    try {
      const response = await fetch('/api/instagram/mentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentionId,
          campaignId,
          influencerUsername,
          mentionsProduct: true,
        }),
      });

      if (response.ok) {
        // Refresh mentions
        fetchMentions();
      }
    } catch (error) {
      console.error('Error assigning mention:', error);
    }
  };

  // Charger les mentions au montage
  useEffect(() => {
    if (campaignId) {
      fetchMentions();
    }
  }, [campaignId]);

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

  // Récupérer les infos Instagram de la marque depuis localStorage
  const getBrandInfo = (): { brandUsername: string | null; brandName: string | null } => {
    try {
      const instagramData = localStorage.getItem('instagram-connection');
      if (instagramData) {
        const parsed = JSON.parse(instagramData);
        return {
          brandUsername: parsed.username || null,
          brandName: null // On pourrait aussi utiliser le companyName de l'user
        };
      }
    } catch (e) {
      console.error('Error reading Instagram data:', e);
    }
    return { brandUsername: null, brandName: null };
  };

  const scrapePosts = async (influencer: CampaignInfluencer) => {
    if (!campaign || !influencer.campaignStartDate || !influencer.campaignDays) return;

    setScrapingInfluencer(influencer.username);

    try {
      const startDate = new Date(influencer.campaignStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + influencer.campaignDays);

      // Récupérer les infos de la marque pour la détection automatique
      const { brandUsername, brandName } = getBrandInfo();

      // Construire l'URL avec les paramètres de détection de mention
      let url = `/api/instagram/posts?username=${encodeURIComponent(influencer.username)}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      if (brandUsername) url += `&brandUsername=${encodeURIComponent(brandUsername)}`;
      if (brandName) url += `&brandName=${encodeURIComponent(brandName)}`;

      const response = await fetch(url);
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

  // Scraper les stories (ne récupère que les stories actives - 24h)
  const scrapeStories = async (influencer: CampaignInfluencer) => {
    if (!campaign) return;

    setScrapingInfluencer(influencer.username);

    try {
      const { brandUsername } = getBrandInfo();

      let url = `/api/instagram/stories?username=${encodeURIComponent(influencer.username)}`;
      if (brandUsername) url += `&brandUsername=${encodeURIComponent(brandUsername)}`;

      const response = await fetch(url);
      const data = await response.json();

      const updatedInfluencers = campaign.influencers.map((i) =>
        i.username === influencer.username
          ? {
              ...i,
              scrapedStories: data.stories || [],
              lastStoriesScrapedAt: new Date().toISOString(),
            }
          : i
      );

      saveCampaign({
        ...campaign,
        influencers: updatedInfluencers,
      });

      setExpandedInfluencers((prev) => new Set([...prev, influencer.username]));
    } catch (error) {
      console.error('Stories scraping error:', error);
      alert('Erreur lors du scraping des stories');
    } finally {
      setScrapingInfluencer(null);
    }
  };

  // Scraper posts + stories en même temps
  const scrapeAll = async (influencer: CampaignInfluencer) => {
    if (!campaign) return;

    setScrapingInfluencer(influencer.username);

    try {
      const { brandUsername, brandName } = getBrandInfo();

      // Fetch posts and stories in parallel
      const startDate = influencer.campaignStartDate ? new Date(influencer.campaignStartDate) : new Date();
      const endDate = new Date(startDate);
      if (influencer.campaignDays) {
        endDate.setDate(endDate.getDate() + influencer.campaignDays);
      }

      let postsUrl = `/api/instagram/posts?username=${encodeURIComponent(influencer.username)}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      if (brandUsername) postsUrl += `&brandUsername=${encodeURIComponent(brandUsername)}`;
      if (brandName) postsUrl += `&brandName=${encodeURIComponent(brandName)}`;

      let storiesUrl = `/api/instagram/stories?username=${encodeURIComponent(influencer.username)}`;
      if (brandUsername) storiesUrl += `&brandUsername=${encodeURIComponent(brandUsername)}`;

      const [postsRes, storiesRes] = await Promise.all([
        fetch(postsUrl),
        fetch(storiesUrl),
      ]);

      const postsData = await postsRes.json();
      const storiesData = await storiesRes.json();

      if (postsData.warning) {
        alert(postsData.warning);
      }

      const updatedInfluencers = campaign.influencers.map((i) =>
        i.username === influencer.username
          ? {
              ...i,
              scrapedPosts: postsData.posts || [],
              scrapedStories: storiesData.stories || [],
              lastScrapedAt: new Date().toISOString(),
              lastStoriesScrapedAt: new Date().toISOString(),
            }
          : i
      );

      saveCampaign({
        ...campaign,
        influencers: updatedInfluencers,
      });

      setExpandedInfluencers((prev) => new Set([...prev, influencer.username]));
    } catch (error) {
      console.error('Scraping error:', error);
      alert('Erreur lors du scraping');
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

  // Toggle le statut "mentionsProduct" d'une story
  const toggleStoryProductMention = (username: string, storyId: string) => {
    if (!campaign) return;

    const updatedInfluencers = campaign.influencers.map((influencer) => {
      if (influencer.username !== username) return influencer;

      const updatedStories = influencer.scrapedStories?.map((story) => {
        if (story.id !== storyId) return story;

        let newValue: boolean | null;
        if (story.mentionsProduct === null || story.mentionsProduct === undefined) {
          newValue = true;
        } else if (story.mentionsProduct === true) {
          newValue = false;
        } else {
          newValue = null;
        }

        return { ...story, mentionsProduct: newValue };
      });

      return { ...influencer, scrapedStories: updatedStories };
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

      {/* Mentions reçues (Stories) */}
      {mentions.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CardTitle>Mentions reçues</CardTitle>
              <Badge className="bg-accent/10 text-accent">{mentions.length}</Badge>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchMentions}
              disabled={mentionsLoading}
            >
              {mentionsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {mentions.map((mention) => {
              const isExpired = mention.expires_at && new Date(mention.expires_at) < new Date();
              const hoursLeft = mention.expires_at
                ? Math.max(0, Math.round((new Date(mention.expires_at).getTime() - Date.now()) / (1000 * 60 * 60)))
                : null;

              return (
                <div
                  key={mention.id}
                  className={`relative rounded-lg overflow-hidden bg-background-secondary ${
                    isExpired ? 'opacity-50' : ''
                  }`}
                >
                  {/* Story image */}
                  <div className="aspect-[9/16] relative">
                    {mention.media_url ? (
                      <img
                        src={mention.media_url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-accent/20 to-accent/5">
                        <Circle className="w-8 h-8 text-accent" />
                      </div>
                    )}

                    {/* Overlay info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Username */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs font-medium truncate">
                        @{mention.mentioned_by_username || 'inconnu'}
                      </p>
                      <p className="text-white/70 text-[10px]">
                        {new Date(mention.received_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Expiration badge */}
                    {hoursLeft !== null && !isExpired && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {hoursLeft}h
                      </div>
                    )}

                    {isExpired && (
                      <div className="absolute top-2 right-2 bg-danger/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                        Expirée
                      </div>
                    )}

                    {/* Assigned badge */}
                    {mention.influencer_username && (
                      <div className="absolute top-2 left-2 bg-success/80 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        {mention.influencer_username}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!mention.influencer_username && campaign.influencers.length > 0 && (
                    <div className="p-2">
                      <select
                        className="w-full text-xs bg-background border border-border rounded px-2 py-1"
                        onChange={(e) => {
                          if (e.target.value) {
                            assignMentionToInfluencer(mention.id, e.target.value);
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">Associer à...</option>
                        {campaign.influencers.map((inf) => (
                          <option key={inf.username} value={inf.username}>
                            @{inf.username}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {mentions.length === 0 && !mentionsLoading && (
            <p className="text-sm text-foreground-secondary text-center py-4">
              Aucune mention reçue pour le moment
            </p>
          )}
        </Card>
      )}

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
              <div className="col-span-2">Influenceur</div>
              <div className="col-span-1 text-center">Followers</div>
              <div className="col-span-2 text-center">Budget</div>
              <div className="col-span-2">Début</div>
              <div className="col-span-1 text-center">Durée</div>
              {isLocked && <div className="col-span-2 text-center">Lien collab</div>}
              <div className="col-span-2 text-center">Contenu</div>
              {!isLocked && <div className="col-span-2"></div>}
            </div>

            {/* Lignes */}
            {campaign.influencers.map((influencer) => {
              const isExpanded = expandedInfluencers.has(influencer.username);
              const isScraping = scrapingInfluencer === influencer.username;
              const postsCount = influencer.scrapedPosts?.length || 0;
              const storiesCount = influencer.scrapedStories?.length || 0;
              // Mentions assignées à cet influenceur
              const influencerMentions = mentions.filter(
                m => m.influencer_username?.toLowerCase() === influencer.username.toLowerCase()
              );
              const mentionsCount = influencerMentions.length;
              const totalContentCount = postsCount + storiesCount + mentionsCount;

              return (
                <div key={influencer.username} className="space-y-0">
                  {/* Ligne principale - Desktop */}
                  <div
                    className={`hidden md:grid grid-cols-12 gap-4 items-center p-4 rounded-lg bg-background-secondary ${
                      isExpanded ? 'rounded-b-none' : ''
                    }`}
                  >
                    {/* Influenceur */}
                    <div className="col-span-2 flex items-center gap-3">
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
                    <div className="col-span-2 text-center">
                      {isLocked ? (
                        <span className="text-foreground text-sm font-medium">
                          {influencer.budget.toLocaleString('fr-FR')} €
                        </span>
                      ) : (
                        <div className="relative max-w-[120px] mx-auto">
                          <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-secondary" />
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
                            className="pl-8 text-center text-sm h-9"
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
                      <div className="col-span-2 flex items-center justify-center gap-2">
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

                    {/* Contenu & Refresh */}
                    <div className="col-span-2 flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => scrapePosts(influencer)}
                        disabled={isScraping}
                        className="h-7 w-7 p-0"
                        title="Actualiser les posts"
                      >
                        {isScraping ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      {totalContentCount > 0 ? (
                        <button
                          onClick={() => toggleExpand(influencer.username)}
                          className="flex items-center gap-1 text-sm text-accent hover:underline cursor-pointer"
                        >
                          <span className="font-medium">{postsCount}</span>
                          {storiesCount > 0 && (
                            <span className="text-xs text-info">+{storiesCount}s</span>
                          )}
                          {mentionsCount > 0 && (
                            <span className="text-xs text-success">+{mentionsCount}m</span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-foreground-secondary italic">
                          Aucun post
                        </span>
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
                        {postsCount > 0 ? (
                          <button
                            onClick={() => toggleExpand(influencer.username)}
                            className="flex items-center gap-1 text-sm text-accent"
                          >
                            {postsCount} posts
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        ) : (
                          <span className="text-xs text-foreground-secondary italic">Aucun post</span>
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

                  {/* Contenu expandé - Posts + Stories + Mentions */}
                  {isExpanded && (postsCount > 0 || storiesCount > 0 || mentionsCount > 0) && (
                    <div className="bg-background-secondary/50 rounded-b-lg p-4 border-t border-border/30">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-foreground-secondary">
                          {postsCount} posts{storiesCount > 0 && ` + ${storiesCount} stories`}{mentionsCount > 0 && ` + ${mentionsCount} mentions`}
                        </p>
                        {influencer.lastScrapedAt && (
                          <p className="text-xs text-foreground-secondary">
                            Scrapé le {formatDate(influencer.lastScrapedAt)}
                          </p>
                        )}
                      </div>

                      {/* Section Mentions (stories reçues via webhook) */}
                      {mentionsCount > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-success mb-2 flex items-center gap-1">
                            <AtSign className="w-3 h-3" /> Mentions reçues ({mentionsCount})
                          </p>
                          <div className="flex gap-3 overflow-x-auto pb-2">
                            {influencerMentions.map((mention) => {
                              const isExpired = mention.expires_at && new Date(mention.expires_at) < new Date();
                              const hoursLeft = mention.expires_at
                                ? Math.max(0, Math.round((new Date(mention.expires_at).getTime() - Date.now()) / (1000 * 60 * 60)))
                                : null;

                              return (
                                <div key={mention.id} className="flex-shrink-0 w-20">
                                  <div className={`relative w-20 h-28 rounded-lg overflow-hidden bg-background border-2 border-success/30 ${isExpired ? 'opacity-50' : ''}`}>
                                    {mention.media_url ? (
                                      <img
                                        src={mention.media_url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-success/20 to-success/5">
                                        <AtSign className="w-6 h-6 text-success" />
                                      </div>
                                    )}
                                    {/* Badge "mention" */}
                                    <div className="absolute top-1 left-1">
                                      <span className="w-4 h-4 bg-success rounded-full flex items-center justify-center">
                                        <AtSign className="w-2.5 h-2.5 text-white" />
                                      </span>
                                    </div>
                                    {/* Expiration countdown */}
                                    {hoursLeft !== null && !isExpired && (
                                      <div className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/60 rounded px-1 py-0.5 flex items-center gap-0.5 justify-center">
                                        <Clock className="w-2.5 h-2.5" />
                                        {hoursLeft}h
                                      </div>
                                    )}
                                    {isExpired && (
                                      <div className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-danger/80 rounded px-1 py-0.5 text-center">
                                        Expirée
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-foreground-secondary text-center mt-1 truncate">
                                    {new Date(mention.received_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Section Stories (si présentes) */}
                      {storiesCount > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-info mb-2 flex items-center gap-1">
                            <Circle className="w-3 h-3" /> Stories actives ({storiesCount})
                          </p>
                          <div className="flex gap-3 overflow-x-auto pb-2">
                            {influencer.scrapedStories?.map((story) => (
                              <div key={story.id} className="flex-shrink-0 w-20">
                                <div className="relative w-20 h-28 rounded-lg overflow-hidden bg-background border-2 border-info/30">
                                  {story.imageUrl ? (
                                    <img
                                      src={`/api/proxy-image?url=${encodeURIComponent(story.imageUrl)}`}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-info/20 to-info/5">
                                      {story.mediaType === 'video' ? (
                                        <Video className="w-6 h-6 text-info" />
                                      ) : (
                                        <Circle className="w-6 h-6 text-info" />
                                      )}
                                    </div>
                                  )}
                                  {/* Badge mentions/hashtags */}
                                  <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                                    {story.mentions.length > 0 && (
                                      <span className="w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                                        <AtSign className="w-2.5 h-2.5 text-white" />
                                      </span>
                                    )}
                                    {story.hashtags.length > 0 && (
                                      <span className="w-4 h-4 bg-info rounded-full flex items-center justify-center">
                                        <Hash className="w-2.5 h-2.5 text-white" />
                                      </span>
                                    )}
                                    {story.linkUrl && (
                                      <span className="w-4 h-4 bg-success rounded-full flex items-center justify-center">
                                        <Link2 className="w-2.5 h-2.5 text-white" />
                                      </span>
                                    )}
                                  </div>
                                  {/* Expiration countdown */}
                                  {story.expiresAt && (
                                    <div className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/60 rounded px-1 py-0.5 flex items-center gap-0.5 justify-center">
                                      <Clock className="w-2.5 h-2.5" />
                                      {Math.max(0, Math.round((new Date(story.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))}h
                                    </div>
                                  )}
                                </div>
                                {/* Toggle mention produit */}
                                <button
                                  onClick={() => toggleStoryProductMention(influencer.username, story.id)}
                                  className="w-full mt-1 text-[10px]"
                                >
                                  {story.mentionsProduct === true ? (
                                    <span className="flex items-center justify-center gap-0.5 px-1 py-0.5 rounded bg-success/10 text-success">
                                      <CheckCircle2 className="w-2.5 h-2.5" />Oui
                                    </span>
                                  ) : story.mentionsProduct === false ? (
                                    <span className="flex items-center justify-center gap-0.5 px-1 py-0.5 rounded bg-danger/10 text-danger">
                                      <XCircle className="w-2.5 h-2.5" />Non
                                    </span>
                                  ) : (
                                    <span className="flex items-center justify-center gap-0.5 px-1 py-0.5 rounded bg-foreground-secondary/10 text-foreground-secondary">
                                      <HelpCircle className="w-2.5 h-2.5" />?
                                    </span>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section Posts */}
                      {postsCount > 0 && (
                        <>
                          {storiesCount > 0 && (
                            <p className="text-xs font-medium text-foreground-secondary mb-2 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> Posts ({postsCount})
                            </p>
                          )}

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
                        {influencer.scrapedPosts?.map((post) => (
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
                        </>
                      )}

                    </div>
                  )}
                </div>
              );
            })}

            {/* Total - Desktop */}
            <div className="hidden md:grid grid-cols-12 gap-4 items-center px-4 py-3 border-t border-border mt-2">
              <div className="col-span-2 font-medium text-foreground">Total</div>
              <div className="col-span-1 text-center font-medium text-foreground">
                {formatNumber(totalFollowers)}
              </div>
              <div className="col-span-2 text-center font-semibold text-foreground">
                {campaign.totalBudget.toLocaleString('fr-FR')} €
              </div>
              <div className={isLocked ? "col-span-5" : "col-span-5"}></div>
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
