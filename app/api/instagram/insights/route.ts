import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface InstagramUserResponse {
  id: string;
  username: string;
  followers_count: number;
  media_count: number;
}

export async function GET(request: Request) {
  try {
    let accessToken: string | null = null;
    let instagramUserId: string | null = null;
    let userId: string | null = null;

    const supabase = await createClient();

    // Try to get Instagram token from Supabase first
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        userId = user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('instagram_access_token, instagram_user_id')
          .eq('id', user.id)
          .single();

        if (profile?.instagram_access_token) {
          accessToken = profile.instagram_access_token;
          instagramUserId = profile.instagram_user_id;
        }
      }
    } catch (supabaseError) {
      console.log('Supabase auth check failed, trying URL params:', supabaseError);
    }

    // If no token from Supabase, check URL params (for testing or localStorage-based users)
    if (!accessToken) {
      const { searchParams } = new URL(request.url);
      accessToken = searchParams.get('token');
      instagramUserId = searchParams.get('user_id');
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Instagram not connected', connected: false },
        { status: 200 }
      );
    }

    // Get current user info from Instagram
    const userResponse = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username,followers_count,media_count&access_token=${accessToken}`
    );

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Instagram user fetch failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch Instagram user data' },
        { status: 500 }
      );
    }

    const userData: InstagramUserResponse = await userResponse.json();

    // Get historical data from our database (last 30 days)
    let dailyFollowers: Array<{ date: string; followers: number }> = [];

    if (userId) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: metrics } = await supabase
        .from('instagram_metrics')
        .select('followers_count, recorded_at')
        .eq('user_id', userId)
        .gte('recorded_at', thirtyDaysAgo.toISOString())
        .order('recorded_at', { ascending: true });

      if (metrics && metrics.length > 0) {
        // Group by day (take latest value per day)
        const byDay: Record<string, number> = {};
        metrics.forEach((m: { followers_count: number; recorded_at: string }) => {
          const date = m.recorded_at.split('T')[0];
          byDay[date] = m.followers_count;
        });

        dailyFollowers = Object.entries(byDay).map(([date, followers]) => ({
          date,
          followers,
        }));
      }
    }

    // Add today's current count if not already present
    const today = new Date().toISOString().split('T')[0];
    const hasToday = dailyFollowers.some(d => d.date === today);
    if (!hasToday) {
      dailyFollowers.push({ date: today, followers: userData.followers_count });
    }

    // Sort by date
    dailyFollowers.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      connected: true,
      username: userData.username,
      currentFollowers: userData.followers_count,
      mediaCount: userData.media_count,
      dailyFollowers,
    });

  } catch (error) {
    console.error('Instagram insights error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
