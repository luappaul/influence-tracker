import { NextRequest, NextResponse } from 'next/server';
import { getInstagramPosts, ApifyInstagramPost } from '@/lib/apify';

// Détecte si un post mentionne la marque
function detectMention(post: ApifyInstagramPost, brandUsername: string | null, brandName: string | null): boolean | null {
  if (!brandUsername && !brandName) {
    return null; // Pas de marque configurée, on ne peut pas détecter
  }

  const caption = (post.caption || '').toLowerCase();

  // Vérifier @mention
  if (brandUsername) {
    const mentionPattern = new RegExp(`@${brandUsername.toLowerCase()}\\b`, 'i');
    if (mentionPattern.test(caption)) {
      return true;
    }
  }

  // Vérifier le nom de la marque (mots de 4+ caractères)
  if (brandName) {
    const brandWords = brandName.toLowerCase().split(/\s+/).filter(w => w.length >= 4);
    for (const word of brandWords) {
      if (caption.includes(word)) {
        return true;
      }
    }
  }

  return null; // Pas de mention détectée, mais pourrait être positif manuellement
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  const startDateParam = request.nextUrl.searchParams.get('startDate');
  const endDateParam = request.nextUrl.searchParams.get('endDate');
  const brandUsername = request.nextUrl.searchParams.get('brandUsername'); // Instagram de la marque
  const brandName = request.nextUrl.searchParams.get('brandName'); // Nom de la marque

  if (!username) {
    return NextResponse.json(
      { error: 'Username requis' },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    let smartLimit = 12;
    let warning = null;

    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      const campaignDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Instagram retourne les posts du plus récent au plus ancien
      // Donc on doit calculer combien de posts récupérer pour atteindre la date de début

      // Jours écoulés depuis la fin de la campagne jusqu'à maintenant
      const daysSinceEndDate = Math.max(0, Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Total de jours à couvrir = jours depuis fin campagne + durée campagne
      const totalDaysToFetch = daysSinceEndDate + campaignDays;

      // Estimation: 2 posts par jour en moyenne (raisonnable pour un influenceur actif)
      // + buffer de 5 posts pour être sûr
      smartLimit = Math.min(totalDaysToFetch * 2 + 5, 100);

      // Si la campagne est trop ancienne, on limite et on prévient
      if (daysSinceEndDate > 60) {
        smartLimit = 50; // Max raisonnable pour ne pas trop payer
        warning = `La campagne date de plus de 60 jours. Seuls les 50 derniers posts seront analysés pour limiter les coûts.`;
      }

      console.log(`Campaign: ${campaignDays} days, ended ${daysSinceEndDate} days ago -> fetching ${smartLimit} posts`);
    }

    const posts = await getInstagramPosts(username, smartLimit);

    // Filtrer par date
    let filteredPosts = posts;
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      filteredPosts = posts.filter((post) => {
        const postDate = new Date(post.timestamp);
        return postDate >= startDate && postDate <= endDate;
      });
    }

    // Auto-détecter les mentions de la marque
    const postsWithMentions = filteredPosts.map((post) => ({
      ...post,
      mentionsProduct: detectMention(post, brandUsername, brandName),
    }));

    return NextResponse.json({
      posts: postsWithMentions,
      total: postsWithMentions.length,
      fetched: posts.length,
      limit: smartLimit,
      warning,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des posts', posts: [] },
      { status: 500 }
    );
  }
}
