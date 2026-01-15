import { NextRequest, NextResponse } from 'next/server';
import { searchInstagramProfiles, searchByHashtag, ApifyInstagramProfile } from '@/lib/apify';

export interface InstagramProfile {
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

// Données de démo
function getMockProfiles(query: string): InstagramProfile[] {
  const mockInfluencers: InstagramProfile[] = [
    {
      id: '1',
      username: 'emma.beaute',
      full_name: 'Emma Martin',
      biography: 'Beauty & Skincare Enthusiast 💄✨ | Paris | Partnerships: emma@contact.com',
      profile_pic_url: 'https://i.pravatar.cc/150?u=emma',
      followers_count: 125000,
      following_count: 892,
      media_count: 456,
      is_verified: false,
      is_business: true,
      category: 'Beauty',
    },
    {
      id: '2',
      username: 'julie.lifestyle',
      full_name: 'Julie Dubois',
      biography: 'Lifestyle | Mode | Voyages ✈️ | Maman de 2 👶 | Collab: contact@julielifestyle.com',
      profile_pic_url: 'https://i.pravatar.cc/150?u=julie',
      followers_count: 89000,
      following_count: 654,
      media_count: 892,
      is_verified: true,
      is_business: true,
      category: 'Lifestyle',
    },
    {
      id: '3',
      username: 'sophie.skincare',
      full_name: 'Sophie Laurent',
      biography: 'Dermatologue 👩‍⚕️ | Conseils skincare | Routine du matin & soir',
      profile_pic_url: 'https://i.pravatar.cc/150?u=sophie',
      followers_count: 234000,
      following_count: 312,
      media_count: 678,
      is_verified: true,
      is_business: true,
      category: 'Health & Beauty',
    },
    {
      id: '4',
      username: 'lea.mode',
      full_name: 'Léa Bernard',
      biography: 'Fashion Blogger | Lyon 📍 | Les tendances mode du moment',
      profile_pic_url: 'https://i.pravatar.cc/150?u=lea',
      followers_count: 67000,
      following_count: 445,
      media_count: 1234,
      is_verified: false,
      is_business: true,
      category: 'Fashion',
    },
    {
      id: '5',
      username: 'marie.wellness',
      full_name: 'Marie Petit',
      biography: 'Yoga Teacher 🧘‍♀️ | Nutrition | Bien-être holistique',
      profile_pic_url: 'https://i.pravatar.cc/150?u=marie',
      followers_count: 156000,
      following_count: 523,
      media_count: 567,
      is_verified: false,
      is_business: true,
      category: 'Health & Wellness',
    },
    {
      id: '6',
      username: 'chloe.makeup',
      full_name: 'Chloé Richard',
      biography: 'MUA 💋 | Tutoriels makeup | Produits testés et approuvés',
      profile_pic_url: 'https://i.pravatar.cc/150?u=chloe',
      followers_count: 98000,
      following_count: 789,
      media_count: 345,
      is_verified: false,
      is_business: true,
      category: 'Beauty',
    },
    {
      id: '7',
      username: 'camille.green',
      full_name: 'Camille Moreau',
      biography: 'Éco-responsable 🌱 | Cosmétiques naturels | Zero waste',
      profile_pic_url: 'https://i.pravatar.cc/150?u=camille',
      followers_count: 45000,
      following_count: 234,
      media_count: 234,
      is_verified: false,
      is_business: true,
      category: 'Sustainability',
    },
    {
      id: '8',
      username: 'laura.hair',
      full_name: 'Laura Thomas',
      biography: 'Coiffeuse | Conseils cheveux | Transformations capillaires 💇‍♀️',
      profile_pic_url: 'https://i.pravatar.cc/150?u=laura',
      followers_count: 78000,
      following_count: 567,
      media_count: 890,
      is_verified: false,
      is_business: true,
      category: 'Beauty',
    },
  ];

  if (!query) return mockInfluencers;

  const lowerQuery = query.toLowerCase();
  return mockInfluencers.filter(
    (p) =>
      p.username.toLowerCase().includes(lowerQuery) ||
      p.full_name.toLowerCase().includes(lowerQuery) ||
      p.biography.toLowerCase().includes(lowerQuery) ||
      p.category?.toLowerCase().includes(lowerQuery)
  );
}

// Convertir le format Apify vers notre format
function convertApifyProfile(profile: ApifyInstagramProfile): InstagramProfile {
  return {
    id: profile.id,
    username: profile.username,
    full_name: profile.fullName,
    biography: profile.biography,
    profile_pic_url: profile.profilePicUrlHD || profile.profilePicUrl,
    followers_count: profile.followersCount,
    following_count: profile.followsCount,
    media_count: profile.postsCount,
    is_verified: profile.isVerified,
    is_business: profile.isBusinessAccount,
    category: profile.businessCategoryName,
    external_url: profile.externalUrl,
    email: profile.publicEmail,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'username'; // username ou hashtag

    // Vérifier si Apify est configuré
    const hasApify = !!process.env.APIFY_API_TOKEN;

    if (!hasApify || !query) {
      // Fallback vers les données de démo
      return NextResponse.json({
        profiles: getMockProfiles(query),
        source: 'demo',
      });
    }

    let profiles: InstagramProfile[] = [];

    if (type === 'hashtag') {
      // Recherche par hashtag - retourne les posts, on extrait les auteurs
      const posts = await searchByHashtag(query.replace('#', ''), 30);

      // Extraire les usernames uniques des posts
      const uniqueUsernames = [...new Set(posts.map((p: any) => p.ownerUsername).filter(Boolean))];

      if (uniqueUsernames.length > 0) {
        // Récupérer les profils des auteurs
        const apifyProfiles = await searchInstagramProfiles(uniqueUsernames.slice(0, 10));
        profiles = apifyProfiles.map(convertApifyProfile);
      }
    } else {
      // Recherche par username direct
      const usernames = query.split(',').map((u) => u.trim().replace('@', ''));
      const apifyProfiles = await searchInstagramProfiles(usernames);
      profiles = apifyProfiles.map(convertApifyProfile);
    }

    return NextResponse.json({
      profiles,
      source: 'apify',
    });
  } catch (error) {
    console.error('Instagram search error:', error);

    // Fallback vers les données de démo en cas d'erreur
    const query = request.nextUrl.searchParams.get('q') || '';
    return NextResponse.json({
      profiles: getMockProfiles(query),
      source: 'demo',
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
}
