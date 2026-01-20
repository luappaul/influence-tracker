import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Token de vérification - doit correspondre à celui configuré dans Facebook App
const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'datafluence_webhook_2024';

// Structure d'un événement de mention Instagram
interface InstagramMentionEvent {
  field: string;
  value: {
    media_id: string;
    comment_id?: string;
    // Pour les stories, on reçoit le media_id de la story
  };
}

interface InstagramWebhookPayload {
  object: string;
  entry: Array<{
    id: string; // Instagram User ID qui reçoit la mention
    time: number;
    changes: InstagramMentionEvent[];
  }>;
}

// GET: Vérification du webhook par Meta
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log('[Instagram Webhook] Verification request:', { mode, token, challenge });

  // Vérifier que c'est une requête de subscription avec le bon token
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Instagram Webhook] Verification successful');
    // Retourner le challenge pour confirmer
    return new NextResponse(challenge, { status: 200 });
  }

  console.log('[Instagram Webhook] Verification failed - invalid token');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST: Réception des événements de mention
export async function POST(request: NextRequest) {
  try {
    const payload: InstagramWebhookPayload = await request.json();

    console.log('[Instagram Webhook] Received event:', JSON.stringify(payload, null, 2));

    // Vérifier que c'est bien un événement Instagram
    if (payload.object !== 'instagram') {
      console.log('[Instagram Webhook] Not an Instagram event, ignoring');
      return NextResponse.json({ received: true });
    }

    // Traiter chaque entrée
    for (const entry of payload.entry) {
      const recipientUserId = entry.id; // L'utilisateur qui a été mentionné
      const timestamp = new Date(entry.time * 1000);

      for (const change of entry.changes) {
        if (change.field === 'mentions') {
          console.log('[Instagram Webhook] Processing mention:', {
            recipientUserId,
            mediaId: change.value.media_id,
            timestamp,
          });

          // Sauvegarder la mention dans Supabase
          await saveMention({
            recipientUserId,
            mediaId: change.value.media_id,
            commentId: change.value.comment_id,
            timestamp,
          });
        }
      }
    }

    // Toujours retourner 200 rapidement pour éviter les retries
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[Instagram Webhook] Error processing event:', error);
    // Retourner 200 même en cas d'erreur pour éviter les retries
    return NextResponse.json({ received: true });
  }
}

// Sauvegarder une mention dans Supabase
async function saveMention(data: {
  recipientUserId: string;
  mediaId: string;
  commentId?: string;
  timestamp: Date;
}) {
  try {
    const supabase = await createClient();

    // Chercher l'utilisateur qui correspond à ce recipientUserId
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, instagram_username')
      .eq('instagram_user_id', data.recipientUserId)
      .single();

    if (!profile) {
      console.log('[Instagram Webhook] No user found for Instagram ID:', data.recipientUserId);
      return;
    }

    // Insérer la mention dans la table instagram_mentions
    const { error } = await supabase.from('instagram_mentions').insert({
      user_id: profile.id,
      instagram_user_id: data.recipientUserId,
      media_id: data.mediaId,
      comment_id: data.commentId || null,
      received_at: data.timestamp.toISOString(),
      processed: false,
    });

    if (error) {
      // Si la table n'existe pas, log l'erreur mais ne pas crasher
      console.log('[Instagram Webhook] Could not save mention (table may not exist):', error.message);
    } else {
      console.log('[Instagram Webhook] Mention saved successfully');
    }

  } catch (error) {
    console.error('[Instagram Webhook] Error saving mention:', error);
  }
}
