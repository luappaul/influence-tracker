'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  shopifyStore?: string;
  shopifyAccessToken?: string;
  avatar?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithShopify: (shop: string) => Promise<void>;
  logout: () => void;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Vérifier l'authentification au chargement
  useEffect(() => {
    // D'abord vérifier le cookie (pour le retour OAuth)
    const cookieUser = getCookie('influence_tracker_user');
    if (cookieUser) {
      try {
        const userData = JSON.parse(cookieUser);
        setUser(userData);
        localStorage.setItem('influence-tracker-user', cookieUser);
      } catch (e) {
        console.error('Error parsing user cookie:', e);
      }
    } else {
      // Sinon vérifier localStorage
      const storedUser = localStorage.getItem('influence-tracker-user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Error parsing stored user:', e);
        }
      }
    }
    setIsLoading(false);
  }, []);

  // Rediriger si non authentifié
  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    // Simulation d'une requête API
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock user
    const mockUser: User = {
      id: 'user-1',
      email,
      name: email.split('@')[0],
    };

    setUser(mockUser);
    localStorage.setItem('influence-tracker-user', JSON.stringify(mockUser));
    setIsLoading(false);
    router.push('/');
  };

  const loginWithShopify = async (shop: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Appeler l'API pour obtenir l'URL d'autorisation
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

      // Rediriger vers Shopify pour l'autorisation
      window.location.href = data.authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
    localStorage.removeItem('influence-tracker-user');
    deleteCookie('influence_tracker_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithShopify, logout, error, setError }}>
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
