import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface InsightValue {
  value: number;
  end_time: string;
}

interface InsightData {
  name: string;
  period: string;
  values: InsightValue[];
  title: string;
  description: string;
  id: string;
}

interface InstagramInsightsResponse {
  data: InsightData[];
}

interface InstagramUserResponse {
  id: string;
  username: string;
  followers_count: number;
  media_count: number;
}

export async function GET() {
  try {
    // Get the current user's Instagram access token from Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get the Instagram access token from the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('instagram_access_token, instagram_user_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.instagram_access_token) {
      return NextResponse.json(
        { error: 'Instagram not connected', connected: false },
        { status: 400 }
      );
    }

    const accessToken = profile.instagram_access_token;
    const instagramUserId = profile.instagram_user_id;

    // First, get current user info (including current followers count)
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

    // Try to get follower insights (requires instagram_business_manage_insights)
    // This gives us follower_count over time
    let dailyFollowers: Array<{ date: string; followers: number }> = [];

    try {
      // Get follower count insights for the last 30 days
      const insightsResponse = await fetch(
        `https://graph.instagram.com/v21.0/${instagramUserId}/insights?metric=follower_count&period=day&access_token=${accessToken}`
      );

      if (insightsResponse.ok) {
        const insightsData: InstagramInsightsResponse = await insightsResponse.json();

        if (insightsData.data && insightsData.data.length > 0) {
          const followerInsight = insightsData.data.find(d => d.name === 'follower_count');

          if (followerInsight && followerInsight.values) {
            dailyFollowers = followerInsight.values.map(v => ({
              date: v.end_time.split('T')[0],
              followers: v.value,
            }));
          }
        }
      } else {
        // Insights API might not be available for all accounts
        // Generate estimated data based on current follower count
        console.log('Insights API not available, using current count only');
      }
    } catch (insightError) {
      console.log('Could not fetch insights, using current count:', insightError);
    }

    // If we don't have daily data, create a simple response with just current count
    if (dailyFollowers.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      dailyFollowers = [{ date: today, followers: userData.followers_count }];
    }

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
