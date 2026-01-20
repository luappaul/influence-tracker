import { NextRequest, NextResponse } from 'next/server';

// Structure d'une mention stockée localement (pour le mode sans Supabase)
interface StoredMention {
  id: string;
  mediaId: string;
  mentionedBy?: string; // Username de l'influenceur qui a fait la mention
  mediaType?: 'story' | 'post' | 'reel';
  mediaUrl?: string;
  timestamp: string;
  processed: boolean;
}

// GET: Récupérer les mentions pour l'utilisateur connecté
export async function GET(request: NextRequest) {
  const accessToken = request.nextUrl.searchParams.get('access_token');

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Access token requis' },
      { status: 400 }
    );
  }

  try {
    // Récupérer les médias où l'utilisateur est tagué via l'API Instagram
    // Note: Ceci récupère les posts/reels taggés, pas les story mentions
    const response = await fetch(
      `https://graph.instagram.com/v21.0/me/tags?fields=id,media_type,media_url,timestamp,username,caption&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Instagram Mentions] API error:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des mentions', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Mapper les données
    const mentions = (data.data || []).map((media: any) => ({
      id: media.id,
      mediaId: media.id,
      mentionedBy: media.username,
      mediaType: media.media_type?.toLowerCase() || 'post',
      mediaUrl: media.media_url,
      caption: media.caption,
      timestamp: media.timestamp,
    }));

    return NextResponse.json({
      mentions,
      total: mentions.length,
      note: 'Ceci inclut les posts/reels où vous êtes tagué. Les mentions de stories arrivent via webhook.',
    });

  } catch (error) {
    console.error('[Instagram Mentions] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des mentions' },
      { status: 500 }
    );
  }
}

// POST: Marquer une mention comme traitée ou l'associer à une campagne
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mentionId, campaignId, influencerUsername } = body;

    // Pour l'instant, on stocke en localStorage côté client
    // TODO: Implémenter le stockage Supabase

    return NextResponse.json({
      success: true,
      message: 'Mention associée à la campagne',
    });

  } catch (error) {
    console.error('[Instagram Mentions] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la mention' },
      { status: 500 }
    );
  }
}
