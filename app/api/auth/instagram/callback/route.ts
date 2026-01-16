import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = 'https://datafluence.vercel.app/api/auth/instagram/callback';

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
      let errorDetail = 'token_exchange_failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.error_message || errorJson.error?.message || errorDetail;
      } catch {}
      return NextResponse.redirect(
        `https://datafluence.vercel.app/onboarding?instagram_error=${encodeURIComponent(errorDetail)}`
      );
    }

    const tokenData: TokenResponse = await tokenResponse.json();
    console.log('Token exchange successful, user_id:', tokenData.user_id);

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
      return NextResponse.redirect(
        'https://datafluence.vercel.app/onboarding?instagram_error=profile_fetch_failed'
      );
    }

    const userData: InstagramUser = await userResponse.json();

    // Step 4: Try to save to Supabase (if user is logged in)
    // This is optional - the OAuth still succeeds even without saving
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Save Instagram connection to user's profile
        // Note: These columns need to exist in the profiles table
        const { error: updateError } = await supabase.from('profiles').update({
          instagram_user_id: userData.id,
          instagram_username: userData.username,
          instagram_access_token: accessToken,
        }).eq('id', user.id);

        if (updateError) {
          console.log('Could not save Instagram to profile (columns may not exist):', updateError.message);
        }
      }
    } catch (dbError) {
      // Don't fail the OAuth just because DB save failed
      console.log('Database save skipped:', dbError);
    }

    // Redirect back to onboarding with success and Instagram data
    // Include token and user_id so frontend can store in localStorage for non-Supabase users
    const redirectParams = new URLSearchParams({
      instagram_connected: 'true',
      instagram_username: userData.username,
      instagram_user_id: userData.id,
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
