'use client';

import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          variant === 'default' && 'bg-background-secondary text-foreground-secondary',
          variant === 'success' && 'bg-green-50 text-success',
          variant === 'warning' && 'bg-accent-light text-accent',
          variant === 'danger' && 'bg-red-50 text-danger',
          variant === 'accent' && 'bg-accent text-white',
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Badge pour les types de post
export function PostTypeBadge({ type }: { type: 'reel' | 'post' | 'story' | 'carousel' }) {
  const config = {
    reel: { label: 'Reel', className: 'bg-purple-50 text-purple-700' },
    post: { label: 'Post', className: 'bg-blue-50 text-blue-700' },
    story: { label: 'Story', className: 'bg-pink-50 text-pink-700' },
    carousel: { label: 'Carousel', className: 'bg-indigo-50 text-indigo-700' },
  };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', config[type].className)}>
      {config[type].label}
    </span>
  );
}

// Badge de statut campagne
export function StatusBadge({ status }: { status: 'active' | 'completed' | 'draft' }) {
  const config = {
    active: { label: 'Active', variant: 'success' as const },
    completed: { label: 'Terminée', variant: 'default' as const },
    draft: { label: 'Brouillon', variant: 'warning' as const },
  };

  return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
}
