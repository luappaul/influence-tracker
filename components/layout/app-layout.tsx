'use client';

import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  // Pages publiques - pas de sidebar, pas d'auth requise
  const isPublicPage =
    pathname === '/login' ||
    pathname === '/reset-password' ||
    pathname === '/onboarding' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname.startsWith('/collab/');

  if (isPublicPage) {
    return <>{children}</>;
  }

  // Chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-foreground-secondary">Chargement...</p>
        </div>
      </div>
    );
  }

  // Non authentifié - le AuthProvider redirigera vers /login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  // Authentifié - afficher le layout complet
  return (
    <>
      <Sidebar />
      <MobileNav />
      <main className="md:ml-16 min-h-screen pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {children}
        </div>
      </main>
    </>
  );
}
