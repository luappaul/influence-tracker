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
      `https://datafluence.vercel.app/settings?instagram_error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      'https://datafluence.vercel.app/settings?instagram_error=no_code'
    );
  }

  if (!INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET) {
    return NextResponse.redirect(
      'https://datafluence.vercel.app/settings?instagram_error=config_error'
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
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(
        'https://datafluence.vercel.app/settings?instagram_error=token_exchange_failed'
      );
    }

    const tokenData: TokenResponse = await tokenResponse.json();

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
        'https://datafluence.vercel.app/settings?instagram_error=profile_fetch_failed'
      );
    }

    const userData: InstagramUser = await userResponse.json();

    // Step 4: Save to Supabase (if user is logged in)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Save Instagram connection to user's profile
      await supabase.from('profiles').update({
        instagram_user_id: userData.id,
        instagram_username: userData.username,
        instagram_access_token: accessToken,
        instagram_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        instagram_connected_at: new Date().toISOString(),
      }).eq('id', user.id);

      // Also save to a separate instagram_connections table for more data
      await supabase.from('instagram_connections').upsert({
        user_id: user.id,
        instagram_user_id: userData.id,
        username: userData.username,
        name: userData.name,
        profile_picture_url: userData.profile_picture_url,
        followers_count: userData.followers_count,
        follows_count: userData.follows_count,
        media_count: userData.media_count,
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });
    }

    // Redirect back to settings with success
    return NextResponse.redirect(
      `https://datafluence.vercel.app/settings?instagram_connected=true&instagram_username=${userData.username}`
    );

  } catch (error) {
    console.error('Instagram OAuth callback error:', error);
    return NextResponse.redirect(
      'https://datafluence.vercel.app/settings?instagram_error=unknown_error'
    );
  }
}
