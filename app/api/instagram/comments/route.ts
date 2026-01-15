import { NextRequest, NextResponse } from 'next/server';
import { getPostComments } from '@/lib/apify';

export async function GET(request: NextRequest) {
  const postUrl = request.nextUrl.searchParams.get('postUrl');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '500');

  if (!postUrl) {
    return NextResponse.json(
      { error: 'postUrl requis' },
      { status: 400 }
    );
  }

  try {
    console.log(`Fetching comments for ${postUrl} with limit ${limit}`);
    const comments = await getPostComments(postUrl, limit);

    console.log(`Got ${comments.length} comments`);
    return NextResponse.json({
      comments,
      total: comments.length,
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commentaires', comments: [] },
      { status: 500 }
    );
  }
}
