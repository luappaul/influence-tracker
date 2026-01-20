import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Récupérer les mentions pour l'utilisateur connecté
export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get('campaign_id');
  const unprocessedOnly = request.nextUrl.searchParams.get('unprocessed') === 'true';

  try {
    const supabase = await createClient();

    // SÉCURITÉ: Toujours filtrer par l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Construire la requête - TOUJOURS filtrer par user_id
    let query = supabase
      .from('instagram_mentions')
      .select('*')
      .eq('user_id', user.id)
      .order('received_at', { ascending: false });

    // Filtrer par campagne si spécifié
    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    // Filtrer les non-traitées si demandé
    if (unprocessedOnly) {
      query = query.eq('processed', false);
    }

    const { data: mentions, error } = await query.limit(100);

    if (error) {
      console.error('[Instagram Mentions] Supabase error:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des mentions', details: error.message },
        { status: 500 }
      );
    }

    // Séparer les stories actives et expirées
    const now = new Date();
    const activeMentions = mentions?.filter(m => {
      if (!m.expires_at) return true; // Posts/reels n'expirent pas
      return new Date(m.expires_at) > now;
    }) || [];

    const expiredMentions = mentions?.filter(m => {
      if (!m.expires_at) return false;
      return new Date(m.expires_at) <= now;
    }) || [];

    return NextResponse.json({
      mentions: activeMentions,
      expiredMentions,
      total: mentions?.length || 0,
      active: activeMentions.length,
      expired: expiredMentions.length,
    });

  } catch (error) {
    console.error('[Instagram Mentions] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des mentions' },
      { status: 500 }
    );
  }
}

// POST: Associer une mention à une campagne
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // SÉCURITÉ: Vérifier l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mentionId, campaignId, influencerUsername, mentionsProduct } = body;

    if (!mentionId) {
      return NextResponse.json(
        { error: 'mentionId requis' },
        { status: 400 }
      );
    }

    const updateData: any = {
      processed: true,
    };

    if (campaignId !== undefined) updateData.campaign_id = campaignId;
    if (influencerUsername !== undefined) updateData.influencer_username = influencerUsername;
    if (mentionsProduct !== undefined) updateData.mentions_product = mentionsProduct;

    // SÉCURITÉ: Ne mettre à jour que les mentions de l'utilisateur connecté
    const { error } = await supabase
      .from('instagram_mentions')
      .update(updateData)
      .eq('id', mentionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Instagram Mentions] Update error:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mention mise à jour',
    });

  } catch (error) {
    console.error('[Instagram Mentions] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la mention' },
      { status: 500 }
    );
  }
}
