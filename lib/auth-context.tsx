'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  companyName?: string;
  phone?: string;
  shopifyStore?: string;
  shopifyAccessToken?: string;
  avatar?: string;
  onboardingCompleted?: boolean;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  // Connexion
  login: (email: string, password: string) => Promise<void>;
  loginWithShopify: (shop: string) => Promise<void>;
  loginAsDemo: () => Promise<void>;
  // Inscription
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsConfirmation: boolean }>;
  // Reset password
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  // Update user
  updateUser: (updatedUser: User) => Promise<void>;
  // Logout
  logout: () => Promise<void>;
  // Errors
  error: string | null;
  setError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Helper pour lire un cookie
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  }
  return null;
}

// Helper pour supprimer un cookie
function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// Traduire les erreurs Supabase en français
function translateSupabaseError(error: string): string {
  const translations: Record<string, string> = {
    'Invalid login credentials': 'Email ou mot de passe incorrect',
    'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter',
    'User already registered': 'Un compte existe déjà avec cet email',
    'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères',
    'Unable to validate email address: invalid format': 'Format d\'email invalide',
    'Email rate limit exceeded': 'Trop de tentatives, veuillez réessayer plus tard',
    'For security purposes, you can only request this once every 60 seconds': 'Veuillez attendre 60 secondes avant de réessayer',
  };
  return translations[error] || error;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Vérifier si Supabase est configuré
  const isSupabaseConfigured = () => {
    return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  };

  // Charger le profil utilisateur depuis Supabase
  const loadUserProfile = async (supabaseUser: SupabaseUser): Promise<User> => {
    const supabase = createClient();

    // Récupérer le profil depuis la table profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: profile?.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || '',
      companyName: profile?.company_name,
      phone: profile?.phone,
      shopifyStore: profile?.shopify_store,
      shopifyAccessToken: profile?.shopify_access_token,
      avatar: supabaseUser.user_metadata?.avatar_url,
      onboardingCompleted: profile?.onboarding_completed || false,
    };
  };

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const initAuth = async () => {
      // Vérifier d'abord si c'est un utilisateur démo (localStorage)
      const storedUser = localStorage.getItem('influence-tracker-user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Si c'est un utilisateur démo, l'utiliser directement
          if (parsedUser.id === 'demo-user') {
            setUser(parsedUser);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error('Error parsing stored user:', e);
        }
      }

      // Vérifier le cookie Shopify OAuth
      const cookieUser = getCookie('influence_tracker_user');
      if (cookieUser) {
        try {
          const userData = JSON.parse(cookieUser);
          setUser(userData);
          localStorage.setItem('influence-tracker-user', cookieUser);
          setIsLoading(false);
          return;
        } catch (e) {
          console.error('Error parsing user cookie:', e);
        }
      }

      // Sinon, vérifier la session Supabase
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const userProfile = await loadUserProfile(session.user);
          setUser(userProfile);
        }

        // Écouter les changements de session
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const userProfile = await loadUserProfile(session.user);
            setUser(userProfile);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            localStorage.removeItem('influence-tracker-user');
          }
        });

        setIsLoading(false);
        return () => subscription.unsubscribe();
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Rediriger si non authentifié ou vers onboarding si nouveau compte
  useEffect(() => {
    let mounted = true;

    const handleRedirects = () => {
      if (!mounted || isLoading) return;

      const publicPaths = ['/login', '/reset-password'];
      const isPublicPath = publicPaths.some(p => pathname === p) || pathname.startsWith('/api/') || pathname.startsWith('/collab/');
      const isOnboardingPath = pathname === '/onboarding';

      if (!user && !isPublicPath && !isOnboardingPath) {
        router.replace('/login');
        return;
      }

      // Rediriger vers onboarding si non complété (sauf si déjà sur onboarding ou page publique)
      if (user && !user.onboardingCompleted && !isOnboardingPath && !isPublicPath && user.id !== 'demo-user') {
        router.replace('/onboarding');
      }
    };

    handleRedirects();

    return () => {
      mounted = false;
    };
  }, [user, isLoading, pathname, router]);

  // Inscription avec Supabase
  const signUp = async (email: string, password: string, fullName: string): Promise<{ needsConfirmation: boolean }> => {
    setIsLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setError('Supabase n\'est pas configuré');
      setIsLoading(false);
      return { needsConfirmation: false };
    }

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      // Si l'email doit être confirmé
      if (data.user && !data.session) {
        setIsLoading(false);
        return { needsConfirmation: true };
      }

      // Si connexion automatique (email confirmation désactivée)
      if (data.user && data.session) {
        const userProfile = await loadUserProfile(data.user);
        setUser(userProfile);
        // Nouveau compte -> onboarding
        router.push('/onboarding');
      }

      setIsLoading(false);
      return { needsConfirmation: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'inscription';
      setError(translateSupabaseError(message));
      setIsLoading(false);
      return { needsConfirmation: false };
    }
  };

  // Connexion avec email/password via Supabase
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      // Fallback : connexion mock si Supabase non configuré
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockUser: User = {
        id: 'user-1',
        email,
        name: email.split('@')[0],
      };
      setUser(mockUser);
      localStorage.setItem('influence-tracker-user', JSON.stringify(mockUser));
      setIsLoading(false);
      router.push('/');
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      if (data.user) {
        const userProfile = await loadUserProfile(data.user);
        setUser(userProfile);
        router.push('/');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(translateSupabaseError(message));
    } finally {
      setIsLoading(false);
    }
  };

  // Connexion mode démo
  const loginAsDemo = async () => {
    setIsLoading(true);
    setError(null);

    await new Promise(resolve => setTimeout(resolve, 500));

    const demoUser: User = {
      id: 'demo-user',
      email: 'demo@influence-tracker.com',
      name: 'Utilisateur Démo',
    };

    setUser(demoUser);
    localStorage.setItem('influence-tracker-user', JSON.stringify(demoUser));
    setIsLoading(false);
    router.push('/');
  };

  // Connexion Shopify OAuth
  const loginWithShopify = async (shop: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/shopify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shop }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la connexion');
      }

      window.location.href = data.authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
      setIsLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    setError(null);

    if (!isSupabaseConfigured()) {
      setError('Supabase n\'est pas configuré');
      return;
    }

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password?type=recovery`,
      });

      if (resetError) {
        throw new Error(resetError.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la réinitialisation';
      setError(translateSupabaseError(message));
      throw err;
    }
  };

  // Update password (après reset)
  const updatePassword = async (newPassword: string) => {
    setError(null);

    if (!isSupabaseConfigured()) {
      setError('Supabase n\'est pas configuré');
      return;
    }

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour du mot de passe';
      setError(translateSupabaseError(message));
      throw err;
    }
  };

  // Update user
  const updateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('influence-tracker-user', JSON.stringify(updatedUser));

    // Si Supabase est configuré, mettre à jour le profil
    if (isSupabaseConfigured() && updatedUser.id !== 'demo-user') {
      try {
        const supabase = createClient();
        await supabase.from('profiles').upsert({
          id: updatedUser.id,
          full_name: updatedUser.name,
          company_name: updatedUser.companyName,
          phone: updatedUser.phone,
          shopify_store: updatedUser.shopifyStore,
          shopify_access_token: updatedUser.shopifyAccessToken,
          onboarding_completed: updatedUser.onboardingCompleted,
        });
      } catch (e) {
        console.error('Error updating profile:', e);
      }
    }
  };

  // Logout
  const logout = async () => {
    // D'abord, nettoyer l'état local et rediriger immédiatement
    setUser(null);
    setError(null);
    localStorage.removeItem('influence-tracker-user');
    deleteCookie('influence_tracker_user');
    router.push('/login');

    // Ensuite, tenter de déconnecter Supabase en arrière-plan (sans bloquer)
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        supabase.auth.signOut().catch(() => {
          // Ignorer les erreurs silencieusement
        });
      } catch (e) {
        // Ignorer les erreurs
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      loginWithShopify,
      loginAsDemo,
      signUp,
      resetPassword,
      updatePassword,
      updateUser,
      logout,
      error,
      setError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
