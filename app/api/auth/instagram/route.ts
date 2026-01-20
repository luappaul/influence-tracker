import { NextResponse } from 'next/server';

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? 'https://datafluence.vercel.app/api/auth/instagram/callback'
  : 'https://datafluence.vercel.app/api/auth/instagram/callback'; // Use production URL for testing

// Only request the scopes we actually need
// Note: These must be approved by Meta for non-testers
const SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_insights',
  'instagram_business_manage_comments', // Requis pour mentions
  'instagram_business_manage_messages', // Requis pour recevoir les story mentions via webhook
].join(',');

export async function GET() {
  if (!INSTAGRAM_APP_ID) {
    return NextResponse.json(
      { error: 'Instagram App ID not configured' },
      { status: 500 }
    );
  }

  const authUrl = new URL('https://www.instagram.com/oauth/authorize');
  authUrl.searchParams.set('client_id', INSTAGRAM_APP_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);

  return NextResponse.redirect(authUrl.toString());
}
