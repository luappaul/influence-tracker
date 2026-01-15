'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Post, Influencer } from '@/lib/types';
import { Avatar } from '@/components/ui/avatar';
import { PostTypeBadge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';

interface PostWithImpact extends Post {
  influencer?: Influencer;
  impactOrders: number;
}

interface PostDetectionFeedProps {
  posts: PostWithImpact[];
  showImpact?: boolean;
}

export function PostDetectionFeed({ posts, showImpact = true }: PostDetectionFeedProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-foreground-secondary">Aucun post détecté récemment</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostFeedItem key={post.id} post={post} showImpact={showImpact} />
      ))}
    </div>
  );
}

interface PostFeedItemProps {
  post: PostWithImpact;
  showImpact?: boolean;
}

function PostFeedItem({ post, showImpact = true }: PostFeedItemProps) {
  return (
    <Link
      href={`/influencers/${post.influencerId}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-secondary transition-colors group"
    >
      <Avatar
        src={post.influencer?.avatarUrl}
        alt={post.influencer?.displayName}
        fallback={post.influencer?.username}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            @{post.influencer?.username}
          </span>
          <span className="text-foreground-secondary text-sm">·</span>
          <span className="text-sm text-foreground-secondary">
            {formatRelativeTime(post.timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <PostTypeBadge type={post.type} />
          {post.views && (
            <span className="text-xs text-foreground-secondary">
              {(post.views / 1000).toFixed(0)}K vues
            </span>
          )}
        </div>
      </div>

      {showImpact && post.impactOrders > 0 && (
        <div className="text-right">
          <span className="text-sm font-medium text-success">
            +{post.impactOrders} cmd
          </span>
        </div>
      )}

      <ExternalLink className="w-4 h-4 text-foreground-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
