import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = 'https://datafluence.vercel.app/api/auth/instagram/callback';

// Messages d'erreur explicites pour l'utilisateur
const ERROR_MESSAGES: Record<string, string> = {
  'not_business_account': 'Votre compte Instagram doit être un compte Professionnel (Créateur ou Business). Allez dans Paramètres Instagram → Compte → Passer à un compte professionnel.',
  'permissions_denied': 'Vous devez accepter toutes les permissions demandées pour connecter votre compte.',
  'token_exchange_failed': 'Échec de connexion. Veuillez réessayer.',
  'profile_fetch_failed': 'Impossible de récupérer votre profil Instagram. Vérifiez que votre compte est bien professionnel.',
  'invalid_token': 'Token invalide. Veuillez reconnecter votre compte Instagram.',
  'rate_limited': 'Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.',
};

// Analyser les erreurs Instagram API pour donner un message clair
function parseInstagramError(errorData: any): { code: string; message: string } {
  try {
    const error = typeof errorData === 'string' ? JSON.parse(errorData) : errorData;

    // Erreur de type OAuthException ou IGApiException
    if (error.error?.type === 'OAuthException' || error.error?.type === 'IGApiException') {
      const code = error.error?.code;
      const message = error.error?.message || '';

      // Code 190 = Invalid token (souvent compte non-business)
      if (code === 190) {
        if (message.includes('business') || message.includes('creator') || message.includes('professional')) {
          return { code: 'not_business_account', message: ERROR_MESSAGES.not_business_account };
        }
        return { code: 'invalid_token', message: ERROR_MESSAGES.invalid_token };
      }

      // Code 10 = Permission denied
      if (code === 10) {
        return { code: 'permissions_denied', message: ERROR_MESSAGES.permissions_denied };
      }

      // Code 4 = Rate limited
      if (code === 4) {
        return { code: 'rate_limited', message: ERROR_MESSAGES.rate_limited };
      }

      // Code 100 = Invalid parameter ou Unsupported request (souvent compte personnel)
      if (code === 100) {
        // "Unsupported request" = compte personnel qui essaie d'utiliser l'API Graph
        if (message.toLowerCase().includes('unsupported')) {
          return { code: 'not_business_account', message: ERROR_MESSAGES.not_business_account };
        }
        if (message.includes('user')) {
          return { code: 'not_business_account', message: ERROR_MESSAGES.not_business_account };
        }
      }
    }

    // Erreur générique avec message
    if (error.error_message) {
      if (error.error_message.includes('business') || error.error_message.includes('creator')) {
        return { code: 'not_business_account', message: ERROR_MESSAGES.not_business_account };
      }
      return { code: 'unknown', message: error.error_message };
    }

    return { code: 'unknown', message: JSON.stringify(error) };
  } catch {
    return { code: 'unknown', message: String(errorData) };
  }
}

interface TokenResponse {
  access_token: string;
  user_id: number;
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface InstagramUser {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorReason = searchParams.get('error_reason');
  const errorDescription = searchParams.get('error_description');

  // Handle errors from Instagram
  if (error) {
    console.error('Instagram OAuth error:', { error, errorReason, errorDescription });
    return NextResponse.redirect(
      `https://datafluence.vercel.app/onboarding?instagram_error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      'https://datafluence.vercel.app/onboarding?instagram_error=no_code'
    );
  }

  if (!INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET) {
    return NextResponse.redirect(
      'https://datafluence.vercel.app/onboarding?instagram_error=config_error'
    );
  }

  try {
    // Step 1: Exchange code for short-lived access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);

      const parsedError = parseInstagramError(errorText);
      console.error('[Instagram OAuth] Parsed error:', parsedError);

      return NextResponse.redirect(
        `https://datafluence.vercel.app/onboarding?instagram_error=${encodeURIComponent(parsedError.message)}&instagram_error_code=${parsedError.code}`
      );
    }

    const tokenData: TokenResponse = await tokenResponse.json();
    console.log('[Instagram OAuth] Token exchange user_id:', tokenData.user_id);

    // Step 2: Exchange short-lived token for long-lived token (60 days)
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${tokenData.access_token}`
    );

    let accessToken = tokenData.access_token;
    let expiresIn = 3600; // 1 hour default for short-lived

    if (longLivedResponse.ok) {
      const longLivedData: LongLivedTokenResponse = await longLivedResponse.json();
      accessToken = longLivedData.access_token;
      expiresIn = longLivedData.expires_in; // ~60 days
    }

    // Step 3: Get user profile information
    const userResponse = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count&access_token=${accessToken}`
    );

    if (!userResponse.ok) {
      const errorData = await userResponse.text();
      console.error('Failed to get user profile:', errorData);

      const parsedError = parseInstagramError(errorData);
      console.error('[Instagram OAuth] Profile fetch error:', parsedError);

      // Si c'est une erreur de compte non-business, on donne un message clair
      const errorMessage = parsedError.code === 'not_business_account'
        ? parsedError.message
        : ERROR_MESSAGES.profile_fetch_failed;

      return NextResponse.redirect(
        `https://datafluence.vercel.app/onboarding?instagram_error=${encodeURIComponent(errorMessage)}&instagram_error_code=${parsedError.code}`
      );
    }

    const userData: InstagramUser = await userResponse.json();

    // Log both IDs to understand which one matches webhooks
    console.log('[Instagram OAuth] Comparing IDs:', {
      tokenUserId: tokenData.user_id,
      meEndpointId: userData.id,
      areEqual: String(tokenData.user_id) === userData.id,
    });

    // Le webhook utilise l'ID du token exchange, pas celui de /me
    // On sauvegarde l'ID du token car c'est celui utilisé par les webhooks
    const instagramUserId = String(tokenData.user_id);

    // Step 4: Try to save to Supabase (if user is logged in)
    // This is optional - the OAuth still succeeds even without saving
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Save Instagram connection to user's profile
        // Note: These columns need to exist in the profiles table
        const { error: updateError } = await supabase.from('profiles').update({
          instagram_user_id: instagramUserId, // Utiliser l'ID du token, pas de /me
          instagram_username: userData.username,
          instagram_access_token: accessToken,
        }).eq('id', user.id);

        if (updateError) {
          console.log('[Instagram OAuth] Could not save to profile:', updateError.message);
        } else {
          console.log('[Instagram OAuth] Saved to profile with instagram_user_id:', instagramUserId);
        }
      }
    } catch (dbError) {
      // Don't fail the OAuth just because DB save failed
      console.log('[Instagram OAuth] Database save skipped:', dbError);
    }

    // Redirect back to onboarding with success and Instagram data
    // Include token and user_id so frontend can store in localStorage for non-Supabase users
    const redirectParams = new URLSearchParams({
      instagram_connected: 'true',
      instagram_username: userData.username,
      instagram_user_id: instagramUserId, // Utiliser l'ID du token pour cohérence avec webhooks
      instagram_token: accessToken,
      instagram_followers: String(userData.followers_count || 0),
    });

    return NextResponse.redirect(
      `https://datafluence.vercel.app/onboarding?${redirectParams.toString()}`
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown_error';
    console.error('Instagram OAuth callback error:', errorMessage, error);
    return NextResponse.redirect(
      `https://datafluence.vercel.app/onboarding?instagram_error=${encodeURIComponent(errorMessage)}`
    );
  }
}
