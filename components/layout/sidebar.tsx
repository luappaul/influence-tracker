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
  const [isExpanded, setIsExpanded] = useState(false);

  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-border/50 bg-card hidden md:flex flex-col transition-all duration-300 ease-in-out',
        isExpanded ? 'w-52' : 'w-16'
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        setIsExpanded(false);
        setShowMenu(false);
      }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border/50 px-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center hover:bg-accent/90 transition-colors flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span
            className={cn(
              'font-semibold text-foreground whitespace-nowrap transition-all duration-300',
              isExpanded ? 'opacity-100' : 'opacity-0 w-0'
            )}
          >
            Datafluence
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col py-4 gap-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'h-10 rounded-lg flex items-center gap-3 px-2.5 transition-all duration-200',
                'hover:bg-background-secondary',
                isActive && 'bg-accent-light text-accent',
                !isActive && 'text-foreground-secondary hover:text-foreground'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span
                className={cn(
                  'text-sm font-medium whitespace-nowrap transition-all duration-300',
                  isExpanded ? 'opacity-100' : 'opacity-0 w-0'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User menu */}
      <div className="p-3 border-t border-border/50 relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={cn(
            'h-10 rounded-lg flex items-center gap-3 px-2.5 transition-all duration-200 w-full',
            'hover:bg-background-secondary text-foreground-secondary hover:text-foreground'
          )}
        >
          <div className="w-8 h-8 rounded-full bg-background-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium">{initials}</span>
          </div>
          <div
            className={cn(
              'flex-1 text-left transition-all duration-300 overflow-hidden',
              isExpanded ? 'opacity-100' : 'opacity-0 w-0'
            )}
          >
            <p className="text-sm font-medium text-foreground truncate">
              {user?.name}
            </p>
          </div>
        </button>

        {/* Menu déroulant */}
        {showMenu && isExpanded && (
          <>
            {/* Overlay pour fermer le menu */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <div className="absolute bottom-16 left-3 z-50 w-46 bg-card border border-border rounded-lg shadow-lg py-2">
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
                onClick={async () => {
                  setShowMenu(false);
                  try {
                    await logout();
                  } catch (e) {
                    console.error('Logout error:', e);
                  }
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
