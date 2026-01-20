import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Token de vérification - doit correspondre à celui configuré dans Facebook App
const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'datafluence_webhook_2024';

// Structure d'un message Instagram (pour story mentions)
interface InstagramMessage {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    attachments?: Array<{
      type: string; // 'story_mention', 'image', 'video', etc.
      payload: {
        url?: string; // CDN URL de la story
      };
    }>;
  };
}

// Structure d'un événement de mention classique (caption/comment)
interface InstagramMentionChange {
  field: string;
  value: {
    media_id: string;
    comment_id?: string;
  };
}

interface InstagramWebhookPayload {
  object: string;
  entry: Array<{
    id: string; // Instagram User ID qui reçoit l'événement
    time: number;
    // Pour les webhooks messaging (story mentions)
    messaging?: InstagramMessage[];
    // Pour les webhooks changes (mentions classiques)
    changes?: InstagramMentionChange[];
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
    return new NextResponse(challenge, { status: 200 });
  }

  console.log('[Instagram Webhook] Verification failed - invalid token');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST: Réception des événements
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
      const recipientUserId = entry.id;
      const timestamp = new Date(entry.time * 1000);

      // 1. Traiter les événements messaging (story mentions via DM)
      if (entry.messaging) {
        for (const message of entry.messaging) {
          await processMessagingEvent(message, recipientUserId);
        }
      }

      // 2. Traiter les événements changes (mentions classiques)
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'mentions') {
            await processClassicMention(change, recipientUserId, timestamp);
          }
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

// Traiter un événement messaging (story mention)
async function processMessagingEvent(message: InstagramMessage, recipientUserId: string) {
  const attachments = message.message?.attachments || [];

  for (const attachment of attachments) {
    if (attachment.type === 'story_mention') {
      console.log('[Instagram Webhook] Story mention received:', {
        from: message.sender.id,
        to: recipientUserId,
        cdnUrl: attachment.payload.url,
        messageId: message.message?.mid,
      });

      // Sauvegarder la mention de story
      await saveStoryMention({
        recipientUserId,
        senderId: message.sender.id,
        messageId: message.message?.mid || '',
        cdnUrl: attachment.payload.url || '',
        timestamp: new Date(message.timestamp),
      });
    }
  }
}

// Traiter une mention classique (caption/comment)
async function processClassicMention(
  change: InstagramMentionChange,
  recipientUserId: string,
  timestamp: Date
) {
  console.log('[Instagram Webhook] Classic mention:', {
    recipientUserId,
    mediaId: change.value.media_id,
    timestamp,
  });

  await saveMention({
    recipientUserId,
    mediaId: change.value.media_id,
    commentId: change.value.comment_id,
    timestamp,
    rawData: change,
  });
}

// Sauvegarder une mention de story (via messaging)
async function saveStoryMention(data: {
  recipientUserId: string;
  senderId: string;
  messageId: string;
  cdnUrl: string;
  timestamp: Date;
}) {
  console.log('[Instagram Webhook] saveStoryMention called with:', {
    recipientUserId: data.recipientUserId,
    senderId: data.senderId,
    messageId: data.messageId?.substring(0, 20) + '...',
  });

  try {
    const supabase = await createClient();

    // Chercher l'utilisateur qui correspond à ce recipientUserId
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, instagram_username, instagram_access_token')
      .eq('instagram_user_id', data.recipientUserId)
      .single();

    console.log('[Instagram Webhook] Profile lookup result:', {
      found: !!profile,
      error: profileError?.message,
      recipientUserId: data.recipientUserId,
    });

    // Même si on ne trouve pas le profil, on sauvegarde la mention
    let userId = profile?.id || null;
    let senderUsername: string | null = null;

    // Récupérer les infos du sender (qui a fait la story)
    if (profile?.instagram_access_token) {
      try {
        const response = await fetch(
          `https://graph.instagram.com/v21.0/${data.senderId}?fields=username&access_token=${profile.instagram_access_token}`
        );
        if (response.ok) {
          const senderData = await response.json();
          senderUsername = senderData.username;
          console.log('[Instagram Webhook] Sender username:', senderUsername);
        } else {
          console.log('[Instagram Webhook] Could not fetch sender, status:', response.status);
        }
      } catch (e) {
        console.log('[Instagram Webhook] Could not fetch sender info:', e);
      }
    }

    // Calculer l'expiration (stories = 24h)
    const expiresAt = new Date(data.timestamp.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const insertData = {
      user_id: userId,
      instagram_user_id: data.recipientUserId,
      media_id: data.messageId,
      media_type: 'story',
      media_url: data.cdnUrl,
      mentioned_by_user_id: data.senderId,
      mentioned_by_username: senderUsername,
      received_at: data.timestamp.toISOString(),
      expires_at: expiresAt,
      processed: false,
      raw_webhook_data: {
        type: 'story_mention',
        senderId: data.senderId,
        messageId: data.messageId,
        cdnUrl: data.cdnUrl,
      },
    };

    console.log('[Instagram Webhook] Inserting mention:', JSON.stringify(insertData, null, 2));

    // Insérer la mention
    const { error } = await supabase.from('instagram_mentions').insert(insertData);

    if (error) {
      console.error('[Instagram Webhook] INSERT ERROR:', error.message, error.details, error.hint);
    } else {
      console.log('[Instagram Webhook] Story mention saved successfully!');
    }

  } catch (error) {
    console.error('[Instagram Webhook] Error saving story mention:', error);
  }
}

// Sauvegarder une mention classique (caption/comment)
async function saveMention(data: {
  recipientUserId: string;
  mediaId: string;
  commentId?: string;
  timestamp: Date;
  rawData?: any;
}) {
  try {
    const supabase = await createClient();

    // Chercher l'utilisateur qui correspond à ce recipientUserId
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, instagram_username, instagram_access_token')
      .eq('instagram_user_id', data.recipientUserId)
      .single();

    if (!profile) {
      console.log('[Instagram Webhook] No user found for Instagram ID:', data.recipientUserId);
      return;
    }

    // Récupérer les détails du média
    let mediaDetails: any = null;
    if (profile.instagram_access_token) {
      try {
        const response = await fetch(
          `https://graph.instagram.com/v21.0/${data.mediaId}?fields=id,media_type,media_url,thumbnail_url,timestamp,username,caption,owner{id,username}&access_token=${profile.instagram_access_token}`
        );
        if (response.ok) {
          mediaDetails = await response.json();
          console.log('[Instagram Webhook] Media details:', mediaDetails);
        }
      } catch (e) {
        console.log('[Instagram Webhook] Could not fetch media details');
      }
    }

    // Calculer l'expiration si c'est une story
    let expiresAt: string | null = null;
    if (mediaDetails?.media_type?.toLowerCase() === 'story') {
      const mediaTime = new Date(mediaDetails.timestamp);
      expiresAt = new Date(mediaTime.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }

    // Insérer la mention
    const { error } = await supabase.from('instagram_mentions').insert({
      user_id: profile.id,
      instagram_user_id: data.recipientUserId,
      media_id: data.mediaId,
      media_type: mediaDetails?.media_type?.toLowerCase() || 'post',
      media_url: mediaDetails?.media_url || null,
      media_thumbnail_url: mediaDetails?.thumbnail_url || null,
      mentioned_by_user_id: mediaDetails?.owner?.id || null,
      mentioned_by_username: mediaDetails?.owner?.username || mediaDetails?.username || null,
      caption: mediaDetails?.caption || null,
      media_timestamp: mediaDetails?.timestamp || null,
      received_at: data.timestamp.toISOString(),
      expires_at: expiresAt,
      processed: false,
      raw_webhook_data: data.rawData || null,
    });

    if (error) {
      console.log('[Instagram Webhook] Could not save mention:', error.message);
    } else {
      console.log('[Instagram Webhook] Mention saved successfully');
    }

  } catch (error) {
    console.error('[Instagram Webhook] Error saving mention:', error);
  }
}
