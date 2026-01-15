import { NextRequest, NextResponse } from 'next/server';

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  timestamp: string;
  permalink: string;
  like_count?: number;
  comments_count?: number;
  media_url?: string;
  thumbnail_url?: string;
}

export interface InstagramAccount {
  id: string;
  username: string;
  account_type: string;
  media_count: number;
}

// Récupérer le profil de l'utilisateur connecté
export async function GET(request: NextRequest) {
  try {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'INSTAGRAM_ACCESS_TOKEN non configuré' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const includeMedia = searchParams.get('media') === 'true';

    // Récupérer les infos du compte
    const accountResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`
    );

    if (!accountResponse.ok) {
      const error = await accountResponse.json();
      console.error('Instagram account error:', error);
      return NextResponse.json(
        { error: error.error?.message || 'Erreur lors de la récupération du compte' },
        { status: accountResponse.status }
      );
    }

    const account: InstagramAccount = await accountResponse.json();

    let media: InstagramMedia[] = [];

    if (includeMedia) {
      // Récupérer les médias
      const mediaResponse = await fetch(
        `https://graph.instagram.com/me/media?fields=id,caption,media_type,timestamp,permalink,like_count,comments_count,media_url,thumbnail_url&limit=50&access_token=${accessToken}`
      );

      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        media = mediaData.data || [];
      }
    }

    return NextResponse.json({
      account,
      media,
    });
  } catch (error) {
    console.error('Instagram me error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
