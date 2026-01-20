import { NextRequest, NextResponse } from 'next/server';
import { getInstagramStories, ApifyInstagramStory } from '@/lib/apify';

// Détecte si une story mentionne la marque
function detectMention(story: ApifyInstagramStory, brandUsername: string | null): boolean | null {
  if (!brandUsername) {
    return null; // Pas de marque configurée
  }

  const brandLower = brandUsername.toLowerCase();

  // Vérifier les mentions directes dans la story
  if (story.mentions.some(m => m.toLowerCase() === brandLower)) {
    return true;
  }

  // Vérifier si le lien pointe vers la marque
  if (story.linkUrl && story.linkUrl.toLowerCase().includes(brandLower)) {
    return true;
  }

  return null; // Pas de mention détectée
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  const brandUsername = request.nextUrl.searchParams.get('brandUsername');

  if (!username) {
    return NextResponse.json(
      { error: 'Username requis' },
      { status: 400 }
    );
  }

  try {
    const stories = await getInstagramStories(username);

    // Auto-détecter les mentions de la marque
    const storiesWithMentions = stories.map((story) => ({
      ...story,
      mentionsProduct: detectMention(story, brandUsername),
    }));

    // Note: Les stories expirent après 24h, donc on ne peut récupérer que les actives
    return NextResponse.json({
      stories: storiesWithMentions,
      total: storiesWithMentions.length,
      note: 'Les stories Instagram expirent après 24h. Seules les stories actives sont disponibles.',
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des stories', stories: [] },
      { status: 500 }
    );
  }
}
