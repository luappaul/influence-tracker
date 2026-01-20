// Apify Instagram Scraper Integration

const APIFY_API_URL = 'https://api.apify.com/v2';

export interface ApifyInstagramProfile {
  id: string;
  username: string;
  fullName: string;
  biography: string;
  profilePicUrl: string;
  profilePicUrlHD: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  isVerified: boolean;
  isBusinessAccount: boolean;
  businessCategoryName?: string;
  externalUrl?: string;
  contactPhoneNumber?: string;
  publicEmail?: string;
}

export interface ApifyInstagramPost {
  id: string;
  shortCode: string;
  caption: string;
  url: string;
  commentsCount: number;
  likesCount: number;
  timestamp: string;
  type: string;
  displayUrl: string;
  videoUrl?: string;
}

export interface ApifyInstagramComment {
  id: string;
  text: string;
  ownerUsername: string;
  ownerFullName: string;
  ownerProfilePicUrl: string;
  timestamp: string;
  likesCount: number;
}

export interface ApifyInstagramStory {
  id: string;
  pk: string;
  code: string;
  mediaType: 'image' | 'video';
  imageUrl: string;
  videoUrl?: string;
  timestamp: string;
  expiresAt: string;
  username: string;
  mentions: string[]; // @mentions dans la story
  hashtags: string[];
  linkUrl?: string; // Lien swipe-up
}

// Rechercher des profils Instagram par username
export async function searchInstagramProfiles(usernames: string[]): Promise<ApifyInstagramProfile[]> {
  const apiToken = process.env.APIFY_API_TOKEN;

  if (!apiToken) {
    throw new Error('APIFY_API_TOKEN non configuré');
  }

  // Utiliser l'actor Instagram Profile Scraper
  const response = await fetch(
    `${APIFY_API_URL}/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${apiToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernames,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Apify error:', error);
    throw new Error('Erreur lors de la recherche Instagram');
  }

  const data = await response.json();
  return data.map(mapApifyProfile);
}

// Récupérer un profil Instagram par username
export async function getInstagramProfile(username: string): Promise<ApifyInstagramProfile | null> {
  const profiles = await searchInstagramProfiles([username]);
  return profiles[0] || null;
}

// Récupérer les posts d'un profil
export async function getInstagramPosts(username: string, limit: number = 12): Promise<ApifyInstagramPost[]> {
  const apiToken = process.env.APIFY_API_TOKEN;

  if (!apiToken) {
    throw new Error('APIFY_API_TOKEN non configuré');
  }

  // Utiliser l'actor Instagram Scraper pour les posts
  const response = await fetch(
    `${APIFY_API_URL}/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${apiToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: 'posts',
        resultsLimit: limit,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Apify posts error:', error);
    throw new Error('Erreur lors de la récupération des posts');
  }

  const data = await response.json();
  const posts = data.map(mapApifyPost);

  // Trier par date (plus récent en premier)
  posts.sort((a: ApifyInstagramPost, b: ApifyInstagramPost) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });

  return posts;
}

// Recherche par hashtag (pour découvrir des influenceurs)
export async function searchByHashtag(hashtag: string, limit: number = 20): Promise<ApifyInstagramPost[]> {
  const apiToken = process.env.APIFY_API_TOKEN;

  if (!apiToken) {
    throw new Error('APIFY_API_TOKEN non configuré');
  }

  const response = await fetch(
    `${APIFY_API_URL}/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${apiToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/explore/tags/${hashtag}/`],
        resultsType: 'posts',
        resultsLimit: limit,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Apify hashtag error:', error);
    throw new Error('Erreur lors de la recherche par hashtag');
  }

  const data = await response.json();
  return data.map(mapApifyPost);
}

// Mapper les données Apify vers notre format
function mapApifyProfile(data: any): ApifyInstagramProfile {
  // Log pour debug
  console.log('Apify raw data:', JSON.stringify(data, null, 2));

  // Chercher l'URL de la photo de profil dans tous les champs possibles
  const profilePic =
    data.profilePicUrlHD ||
    data.profilePicUrl ||
    data.profile_pic_url_hd ||
    data.profile_pic_url ||
    data.profilePicture ||
    data.profile_picture ||
    data.profileImage ||
    data.avatar ||
    '';

  return {
    id: data.id || data.pk || data.userId || '',
    username: data.username || '',
    fullName: data.fullName || data.full_name || data.name || '',
    biography: data.biography || data.bio || '',
    profilePicUrl: profilePic,
    profilePicUrlHD: profilePic,
    followersCount: data.followersCount || data.followers_count || data.followedByCount || data.followerCount || 0,
    followsCount: data.followsCount || data.follows_count || data.followingCount || data.followCount || 0,
    postsCount: data.postsCount || data.posts_count || data.mediaCount || data.postCount || 0,
    isVerified: data.isVerified || data.is_verified || data.verified || false,
    isBusinessAccount: data.isBusinessAccount || data.is_business_account || data.isBusiness || false,
    businessCategoryName: data.businessCategoryName || data.business_category_name || data.category || '',
    externalUrl: data.externalUrl || data.external_url || data.website || '',
    contactPhoneNumber: data.contactPhoneNumber || data.phone || '',
    publicEmail: data.publicEmail || data.public_email || data.email || '',
  };
}

function mapApifyPost(data: any): ApifyInstagramPost {
  return {
    id: data.id || '',
    shortCode: data.shortCode || data.code || '',
    caption: data.caption || '',
    url: data.url || `https://www.instagram.com/p/${data.shortCode || data.code}/`,
    commentsCount: data.commentsCount || data.comments_count || 0,
    likesCount: data.likesCount || data.likes_count || 0,
    timestamp: data.timestamp || data.taken_at_timestamp || '',
    type: data.type || 'Image',
    displayUrl: data.displayUrl || data.display_url || '',
    videoUrl: data.videoUrl || data.video_url || '',
  };
}

// Récupérer les commentaires d'un post
export async function getPostComments(postUrl: string, limit: number = 500): Promise<ApifyInstagramComment[]> {
  const apiToken = process.env.APIFY_API_TOKEN;

  if (!apiToken) {
    throw new Error('APIFY_API_TOKEN non configuré');
  }

  // Utiliser l'actor Instagram Comment Scraper
  // Documentation: https://apify.com/apify/instagram-comment-scraper
  const response = await fetch(
    `${APIFY_API_URL}/acts/apify~instagram-comment-scraper/run-sync-get-dataset-items?token=${apiToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        directUrls: [postUrl],
        resultsLimit: limit,
        maxComments: limit, // Certains actors utilisent ce paramètre
        commentsLimit: limit, // Alternative
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Apify comments error:', error);
    throw new Error('Erreur lors de la récupération des commentaires');
  }

  const data = await response.json();
  console.log(`Apify returned ${data.length} comments for ${postUrl}`);
  return data.map(mapApifyComment);
}

function mapApifyComment(data: any): ApifyInstagramComment {
  return {
    id: data.id || data.pk || '',
    text: data.text || data.comment || '',
    ownerUsername: data.ownerUsername || data.owner?.username || data.username || '',
    ownerFullName: data.ownerFullName || data.owner?.full_name || data.fullName || data.full_name || '',
    ownerProfilePicUrl: data.ownerProfilePicUrl || data.owner?.profile_pic_url || data.profilePicUrl || '',
    timestamp: data.timestamp || data.created_at || '',
    likesCount: data.likesCount || data.like_count || 0,
  };
}

// Récupérer les stories d'un profil
export async function getInstagramStories(username: string): Promise<ApifyInstagramStory[]> {
  const apiToken = process.env.APIFY_API_TOKEN;

  if (!apiToken) {
    throw new Error('APIFY_API_TOKEN non configuré');
  }

  // Utiliser l'actor datavoyantlab/advanced-instagram-stories-scraper
  const response = await fetch(
    `${APIFY_API_URL}/acts/datavoyantlab~advanced-instagram-stories-scraper/run-sync-get-dataset-items?token=${apiToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernames: [username],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Apify stories error:', error);
    throw new Error('Erreur lors de la récupération des stories');
  }

  const data = await response.json();
  console.log(`Apify returned ${data.length} stories for ${username}`);
  return data.map(mapApifyStory);
}

function mapApifyStory(data: any): ApifyInstagramStory {
  // Extraire l'URL de l'image depuis image_versions2
  let imageUrl = '';
  if (data.image_versions2?.candidates?.length > 0) {
    // Prendre la plus grande image
    const candidates = data.image_versions2.candidates;
    const largest = candidates.reduce((prev: any, curr: any) =>
      (curr.width > prev.width) ? curr : prev
    );
    imageUrl = largest.url || '';
  }

  // Extraire les mentions depuis les stickers ou le texte
  const mentions: string[] = [];
  if (data.reel_mentions) {
    data.reel_mentions.forEach((m: any) => {
      if (m.user?.username) mentions.push(m.user.username);
    });
  }
  if (data.story_bloks_stickers) {
    data.story_bloks_stickers.forEach((s: any) => {
      if (s.bloks_sticker?.sticker_data?.ig_mention?.username) {
        mentions.push(s.bloks_sticker.sticker_data.ig_mention.username);
      }
    });
  }

  // Extraire les hashtags
  const hashtags: string[] = [];
  if (data.story_hashtags) {
    data.story_hashtags.forEach((h: any) => {
      if (h.hashtag?.name) hashtags.push(h.hashtag.name);
    });
  }

  // Extraire le lien swipe-up
  let linkUrl = '';
  if (data.story_link_stickers?.length > 0) {
    linkUrl = data.story_link_stickers[0].story_link?.url || '';
  } else if (data.story_cta?.length > 0) {
    linkUrl = data.story_cta[0].links?.[0]?.webUri || '';
  }

  // Timestamp
  const timestamp = data.taken_at
    ? new Date(data.taken_at * 1000).toISOString()
    : '';
  const expiresAt = data.expiring_at
    ? new Date(data.expiring_at * 1000).toISOString()
    : '';

  return {
    id: data.id || data.pk || '',
    pk: data.pk || data.id || '',
    code: data.code || '',
    mediaType: data.media_type === 2 ? 'video' : 'image',
    imageUrl,
    videoUrl: data.video_versions?.[0]?.url || '',
    timestamp,
    expiresAt,
    username: data.user?.username || '',
    mentions,
    hashtags,
    linkUrl,
  };
}
