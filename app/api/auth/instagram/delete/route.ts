import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;

// Parse signed request from Meta
function parseSignedRequest(signedRequest: string, secret: string): any | null {
  const [encodedSig, payload] = signedRequest.split('.');

  if (!encodedSig || !payload) {
    return null;
  }

  // Decode the signature
  const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

  // Decode the payload
  const data = JSON.parse(
    Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
  );

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest();

  if (!crypto.timingSafeEqual(sig, expectedSig)) {
    return null;
  }

  return data;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const signedRequest = formData.get('signed_request') as string;

    if (!signedRequest || !INSTAGRAM_APP_SECRET) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const data = parseSignedRequest(signedRequest, INSTAGRAM_APP_SECRET);

    if (!data) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const userId = data.user_id;

    if (userId) {
      // Delete user's Instagram data from our database
      const supabase = await createClient();

      // Delete from instagram_connections
      await supabase
        .from('instagram_connections')
        .delete()
        .eq('instagram_user_id', userId.toString());

      // Clear Instagram fields from profiles
      await supabase
        .from('profiles')
        .update({
          instagram_user_id: null,
          instagram_username: null,
          instagram_access_token: null,
          instagram_token_expires_at: null,
          instagram_connected_at: null,
        })
        .eq('instagram_user_id', userId.toString());
    }

    // Generate confirmation code for Meta
    const confirmationCode = crypto.randomBytes(16).toString('hex');

    // Return the response format Meta expects
    return NextResponse.json({
      url: `https://datafluence.vercel.app/api/auth/instagram/delete/status?id=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });

  } catch (error) {
    console.error('Instagram data deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Status endpoint for users to check deletion status
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Missing confirmation ID' },
      { status: 400 }
    );
  }

  // In a production app, you'd track deletion requests in a database
  // For now, we just confirm the deletion was processed
  return NextResponse.json({
    id,
    status: 'deleted',
    message: 'Your Instagram data has been deleted from Datafluence.',
  });
}
