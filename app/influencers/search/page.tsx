'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Loader2,
  UserPlus,
  Instagram,
  Users,
  ImageIcon,
  BadgeCheck,
  ExternalLink,
  ArrowLeft,
  Hash,
  AtSign,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface InstagramProfile {
  id: string;
  username: string;
  full_name: string;
  biography: string;
  profile_pic_url: string;
  followers_count: number;
  following_count: number;
  media_count: number;
  is_verified: boolean;
  is_business: boolean;
  category?: string;
  external_url?: string;
  email?: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export default function SearchInfluencersPage() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'username' | 'hashtag'>('username');
  const [results, setResults] = useState<InstagramProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [source, setSource] = useState<string>('');
  const [addedProfiles, setAddedProfiles] = useState<Set<string>>(new Set());

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/instagram/search?q=${encodeURIComponent(query)}&type=${searchType}`
      );
      const data = await response.json();
      setResults(data.profiles || []);
      setSource(data.source || 'unknown');
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setSource('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInfluencer = (profile: InstagramProfile) => {
    // Pour l'instant, on simule l'ajout (à connecter avec une vraie API plus tard)
    setAddedProfiles((prev) => new Set([...prev, profile.id]));

    // Stocker dans localStorage pour la démo
    const stored = localStorage.getItem('added_influencers');
    const influencers = stored ? JSON.parse(stored) : [];
    influencers.push(profile);
    localStorage.setItem('added_influencers', JSON.stringify(influencers));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/influencers"
          className="w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center hover:bg-border transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground-secondary" />
        </Link>
        <Header
          title="Rechercher des influenceurs"
          description="Trouvez des influenceurs Instagram à ajouter à vos campagnes"
        />
      </div>

      {/* Search bar */}
      <Card>
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Type de recherche */}
          <Tabs defaultValue="username" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger
                value="username"
                className="flex-1"
                onClick={() => setSearchType('username')}
              >
                <AtSign className="w-4 h-4 mr-2" />
                Par username
              </TabsTrigger>
              <TabsTrigger
                value="hashtag"
                className="flex-1"
                onClick={() => setSearchType('hashtag')}
              >
                <Hash className="w-4 h-4 mr-2" />
                Par hashtag
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Input de recherche */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              {searchType === 'username' ? (
                <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
              ) : (
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
              )}
              <Input
                type="text"
                placeholder={
                  searchType === 'username'
                    ? "Username (ex: lenamahfouf, enjoyphoenix)"
                    : "Hashtag (ex: skincare, beauty, mode)"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={isLoading || !query.trim()}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Rechercher
            </Button>
          </div>

          {searchType === 'username' && (
            <p className="text-xs text-foreground-secondary">
              Vous pouvez rechercher plusieurs usernames en les séparant par des virgules
            </p>
          )}
        </form>
      </Card>


      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : hasSearched ? (
        results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                isAdded={addedProfiles.has(profile.id)}
                onAdd={() => handleAddInfluencer(profile)}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <Instagram className="w-12 h-12 text-foreground-secondary mx-auto mb-4" />
            <p className="text-foreground-secondary">
              Aucun résultat trouvé pour "{query}"
            </p>
            <p className="text-sm text-foreground-secondary mt-2">
              Essayez avec un autre terme de recherche
            </p>
          </Card>
        )
      ) : (
        <Card className="text-center py-12">
          <Search className="w-12 h-12 text-foreground-secondary mx-auto mb-4" />
          <p className="text-foreground-secondary">
            Entrez un terme de recherche pour trouver des influenceurs
          </p>
          <p className="text-sm text-foreground-secondary mt-2">
            Vous pouvez rechercher par nom, username ou catégorie (beauty, lifestyle, etc.)
          </p>
        </Card>
      )}

    </div>
  );
}

function ProfileCard({
  profile,
  isAdded,
  onAdd
}: {
  profile: InstagramProfile;
  isAdded: boolean;
  onAdd: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  // Générer des initiales pour le fallback
  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile.username.slice(0, 2).toUpperCase();

  const showFallback = !profile.profile_pic_url || imgError;

  // Utiliser le proxy pour contourner les restrictions CORS
  const proxyImageUrl = profile.profile_pic_url
    ? `/api/proxy-image?url=${encodeURIComponent(profile.profile_pic_url)}`
    : '';

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          {!showFallback ? (
            <img
              src={proxyImageUrl}
              alt={profile.full_name || profile.username}
              className="w-16 h-16 rounded-full object-cover bg-background-secondary"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <span className="text-lg font-semibold text-accent">{initials}</span>
            </div>
          )}
          {profile.is_verified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-info flex items-center justify-center">
              <BadgeCheck className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">{profile.full_name}</h3>
          </div>
          <a
            href={`https://instagram.com/${profile.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            @{profile.username}
            <ExternalLink className="w-3 h-3" />
          </a>
          {profile.category && (
            <Badge variant="default" className="mt-1 text-xs">
              {profile.category}
            </Badge>
          )}
        </div>
      </div>

      {/* Bio */}
      <p className="text-sm text-foreground-secondary mt-3 line-clamp-2">
        {profile.biography || 'Pas de biographie'}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/50">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-foreground-secondary">
            <Users className="w-3 h-3" />
          </div>
          <p className="font-semibold text-foreground">{formatNumber(profile.followers_count)}</p>
          <p className="text-xs text-foreground-secondary">Followers</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-foreground-secondary">
            <Users className="w-3 h-3" />
          </div>
          <p className="font-semibold text-foreground">{formatNumber(profile.following_count)}</p>
          <p className="text-xs text-foreground-secondary">Following</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-foreground-secondary">
            <ImageIcon className="w-3 h-3" />
          </div>
          <p className="font-semibold text-foreground">{formatNumber(profile.media_count)}</p>
          <p className="text-xs text-foreground-secondary">Posts</p>
        </div>
      </div>

      {/* Add button */}
      <Button
        className="w-full mt-4"
        variant={isAdded ? 'secondary' : 'primary'}
        onClick={onAdd}
        disabled={isAdded}
      >
        {isAdded ? (
          <>
            <BadgeCheck className="w-4 h-4 mr-2" />
            Ajouté
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-2" />
            Ajouter à mes influenceurs
          </>
        )}
      </Button>
    </Card>
  );
}
