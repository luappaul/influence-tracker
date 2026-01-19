'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: Home, label: 'Accueil' },
  { href: '/campaigns', icon: BarChart3, label: 'Campagnes' },
  { href: '/influencers', icon: Users, label: 'Influenceurs' },
  { href: '/settings', icon: Settings, label: 'Paramètres' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg min-w-[64px] transition-colors',
                isActive
                  ? 'text-accent'
                  : 'text-foreground-secondary active:text-foreground'
              )}
            >
              <item.icon className={cn(
                'w-5 h-5',
                isActive && 'text-accent'
              )} />
              <span className={cn(
                'text-[10px] font-medium',
                isActive && 'text-accent'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
