import { NextRequest, NextResponse } from 'next/server';

// Structure d'un média mentionné
interface MentionedMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'STORY';
  media_url?: string;
  thumbnail_url?: string;
  caption?: string;
  timestamp: string;
  permalink?: string;
  username?: string; // Qui a fait la mention
  owner?: {
    id: string;
    username: string;
  };
}

// GET: Récupérer les médias où l'utilisateur est mentionné
export async function GET(request: NextRequest) {
  const accessToken = request.nextUrl.searchParams.get('access_token');
  const userId = request.nextUrl.searchParams.get('user_id');

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Access token requis' },
      { status: 400 }
    );
  }

  try {
    // D'abord récupérer l'ID utilisateur et vérifier les permissions
    let igUserId = userId;
    const meResponse = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username,account_type,media_count&access_token=${accessToken}`
    );

    if (meResponse.ok) {
      const meData = await meResponse.json();
      igUserId = igUserId || meData.id;
      console.log('[Mentioned Media] User info:', JSON.stringify(meData, null, 2));
    } else {
      const meError = await meResponse.text();
      console.error('[Mentioned Media] Failed to get user info:', meError);
    }

    if (!igUserId) {
      return NextResponse.json(
        { error: 'Impossible de récupérer l\'ID utilisateur Instagram' },
        { status: 400 }
      );
    }

    // Essayer d'abord avec graph.facebook.com (API traditionnelle)
    // puis fallback sur graph.instagram.com
    const endpoints = [
      `https://graph.facebook.com/v21.0/${igUserId}/mentioned_media?fields=id,media_type,caption,timestamp,permalink&access_token=${accessToken}`,
      `https://graph.instagram.com/v21.0/${igUserId}/mentioned_media?fields=id,media_type,caption,timestamp,permalink&access_token=${accessToken}`,
    ];

    let response: Response | null = null;
    let lastError = '';

    for (const endpoint of endpoints) {
      console.log('[Mentioned Media] Trying endpoint:', endpoint.split('?')[0]);
      response = await fetch(endpoint);

      if (response.ok) {
        console.log('[Mentioned Media] Success with endpoint:', endpoint.split('?')[0]);
        break;
      } else {
        lastError = await response.text();
        console.log('[Mentioned Media] Failed:', lastError);
        response = null;
      }
    }

    if (!response) {
      // Si aucun endpoint n'a fonctionné, retourner l'erreur détaillée
      return NextResponse.json(
        {
          error: 'mentioned_media non disponible',
          details: lastError,
          hint: 'Cette fonctionnalité nécessite un compte Instagram Business/Creator connecté à une Page Facebook, et la permission instagram_manage_comments.',
          userId: igUserId,
        },
        { status: 400 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Mentioned Media] Instagram API error:', response.status, errorText);

      // Parser l'erreur pour un message plus clair
      let errorMessage = 'Erreur lors de la récupération des mentions';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {}

      return NextResponse.json(
        { error: errorMessage, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Mentioned Media] Raw response:', JSON.stringify(data, null, 2));

    // Mapper les données
    const mentions: MentionedMedia[] = (data.data || []).map((media: any) => ({
      id: media.id,
      media_type: media.media_type,
      media_url: media.media_url,
      thumbnail_url: media.thumbnail_url,
      caption: media.caption,
      timestamp: media.timestamp,
      permalink: media.permalink,
      username: media.username || media.owner?.username,
      owner: media.owner,
    }));

    // Séparer par type
    const stories = mentions.filter(m => m.media_type === 'STORY');
    const posts = mentions.filter(m => m.media_type !== 'STORY');

    return NextResponse.json({
      mentions,
      stories,
      posts,
      total: mentions.length,
      storiesCount: stories.length,
      postsCount: posts.length,
    });

  } catch (error) {
    console.error('[Mentioned Media] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des mentions' },
      { status: 500 }
    );
  }
}
