import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for cron job (can access all users)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  try {
    // Verify cron secret (Vercel sends this header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with Instagram connected
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, instagram_user_id, instagram_access_token')
      .not('instagram_access_token', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: 'No Instagram accounts to update', updated: 0 });
    }

    let updated = 0;
    let errors = 0;

    // For each user, fetch Instagram followers and save
    for (const profile of profiles) {
      try {
        // Fetch current follower count from Instagram
        const response = await fetch(
          `https://graph.instagram.com/v21.0/me?fields=followers_count&access_token=${profile.instagram_access_token}`
        );

        if (!response.ok) {
          console.error(`Instagram API error for user ${profile.id}:`, await response.text());
          errors++;
          continue;
        }

        const data = await response.json();
        const followersCount = data.followers_count;

        if (typeof followersCount !== 'number') {
          console.error(`Invalid followers count for user ${profile.id}`);
          errors++;
          continue;
        }

        // Save to instagram_metrics table
        const { error: insertError } = await supabase
          .from('instagram_metrics')
          .insert({
            user_id: profile.id,
            instagram_user_id: profile.instagram_user_id,
            followers_count: followersCount,
          });

        if (insertError) {
          console.error(`Error saving metrics for user ${profile.id}:`, insertError);
          errors++;
          continue;
        }

        updated++;
        console.log(`Updated metrics for user ${profile.id}: ${followersCount} followers`);

      } catch (err) {
        console.error(`Error processing user ${profile.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      message: 'Instagram metrics updated',
      updated,
      errors,
      total: profiles.length,
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
