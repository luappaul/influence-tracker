'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, Users, Settings, Sparkles, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { href: '/', icon: Home, label: 'Accueil' },
  { href: '/campaigns', icon: BarChart3, label: 'Campagnes' },
  { href: '/influencers', icon: Users, label: 'Influenceurs' },
  { href: '/settings', icon: Settings, label: 'Paramètres' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-16 border-r border-border/50 bg-card flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-border/50">
        <Link href="/">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center hover:bg-accent/90 transition-colors">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center py-4 gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200',
                'hover:bg-background-secondary',
                isActive && 'bg-accent-light text-accent',
                !isActive && 'text-foreground-secondary hover:text-foreground'
              )}
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>

      {/* User menu */}
      <div className="p-3 border-t border-border/50 relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-10 h-10 rounded-full bg-background-secondary flex items-center justify-center hover:bg-border transition-colors"
          title={user?.name || 'Menu utilisateur'}
        >
          <span className="text-sm font-medium text-foreground-secondary">{initials}</span>
        </button>

        {/* Menu déroulant */}
        {showMenu && (
          <>
            {/* Overlay pour fermer le menu */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <div className="absolute bottom-16 left-3 z-50 w-48 bg-card border border-border rounded-lg shadow-lg py-2">
              <div className="px-3 py-2 border-b border-border/50">
                <p className="font-medium text-foreground text-sm truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-foreground-secondary truncate">
                  {user?.email}
                </p>
                {user?.shopifyStore && (
                  <p className="text-xs text-accent mt-1 truncate">
                    {user.shopifyStore}
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  setShowMenu(false);
                  logout();
                }}
                className="w-full px-3 py-2 text-left text-sm text-danger hover:bg-background-secondary flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
