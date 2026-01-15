import { NextRequest, NextResponse } from 'next/server';
import type { InstagramProfile } from '../../search/route';

// Mock data pour un profil spécifique
function getMockProfile(username: string): InstagramProfile | null {
  const mockProfiles: Record<string, InstagramProfile> = {
    'emma.beaute': {
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
    'julie.lifestyle': {
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
    'sophie.skincare': {
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
  };

  return mockProfiles[username] || null;
}

// Récupérer un profil via RapidAPI
async function getProfileViaRapidAPI(username: string): Promise<InstagramProfile | null> {
  const apiKey = process.env.RAPIDAPI_KEY;
  const host = process.env.INSTAGRAM_SCRAPER_HOST || 'instagram-scraper-api2.p.rapidapi.com';

  if (!apiKey) {
    throw new Error('RAPIDAPI_KEY not configured');
  }

  const response = await fetch(
    `https://${host}/v1/info?username_or_id_or_url=${encodeURIComponent(username)}`,
    {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': host,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram profile');
  }

  const data = await response.json();
  const user = data.data;

  if (!user) return null;

  return {
    id: user.pk || user.id,
    username: user.username,
    full_name: user.full_name || '',
    biography: user.biography || '',
    profile_pic_url: user.profile_pic_url_hd || user.profile_pic_url || '',
    followers_count: user.follower_count || 0,
    following_count: user.following_count || 0,
    media_count: user.media_count || 0,
    is_verified: user.is_verified || false,
    is_business: user.is_business || false,
    category: user.category || '',
    external_url: user.external_url || '',
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider') || 'mock';

    let profile: InstagramProfile | null = null;

    switch (provider) {
      case 'rapidapi':
        try {
          profile = await getProfileViaRapidAPI(username);
        } catch (error) {
          console.error('RapidAPI profile fetch failed, falling back to mock:', error);
          profile = getMockProfile(username);
        }
        break;

      case 'mock':
      default:
        profile = getMockProfile(username);
        break;
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profil non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile, provider });
  } catch (error) {
    console.error('Instagram profile error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
}
