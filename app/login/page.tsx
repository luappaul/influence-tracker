'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ShoppingBag, Mail, Lock, ArrowRight, Loader2, Store, User, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type AuthMode = 'login' | 'signup';

function LoginForm() {
  const { login, signUp, loginWithShopify, loginAsDemo, isLoading, error: authError, setError: setAuthError } = useAuth();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [error, setError] = useState('');
  const [isShopifyLoading, setIsShopifyLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [showShopifyForm, setShowShopifyForm] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  // Gérer les erreurs OAuth dans l'URL
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        missing_params: 'Paramètres manquants dans la réponse Shopify',
        invalid_state: 'Session expirée, veuillez réessayer',
        auth_failed: 'Échec de l\'authentification Shopify',
      };
      setAuthError(errorMessages[errorParam] || 'Erreur d\'authentification');
    }
  }, [searchParams, setAuthError]);

  const displayError = error || authError;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setError('');
    setAuthError(null);
    setSignUpSuccess(false);
  };

  const switchMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setIsEmailLoading(true);
      await login(email, password);
    } catch (err) {
      // Error is handled by auth context
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !fullName) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      setIsEmailLoading(true);
      const result = await signUp(email, password, fullName);
      if (result.needsConfirmation) {
        setSignUpSuccess(true);
      }
    } catch (err) {
      // Error is handled by auth context
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleShopifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!shopName.trim()) {
      setError('Veuillez entrer le nom de votre boutique');
      return;
    }

    try {
      setIsShopifyLoading(true);
      await loginWithShopify(shopName.trim());
    } catch (err) {
      setError('Erreur de connexion avec Shopify');
      setIsShopifyLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setIsDemoLoading(true);
      await loginAsDemo();
    } catch (err) {
      setError('Erreur de connexion');
      setIsDemoLoading(false);
    }
  };

  // Affichage du succès d'inscription
  if (signUpSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Vérifiez votre email</h2>
          <p className="text-foreground-secondary">
            Nous avons envoyé un lien de confirmation à <strong>{email}</strong>.
            Cliquez sur le lien pour activer votre compte.
          </p>
          <div className="pt-4">
            <Button variant="secondary" onClick={() => switchMode('login')}>
              Retour à la connexion
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-foreground">Datafluence</span>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>
        </div>

        {/* Erreur globale */}
        {displayError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-danger text-center">{displayError}</p>
          </div>
        )}

        {/* Section Shopify - seulement en mode login */}
        {mode === 'login' && (
          <>
            {!showShopifyForm ? (
              <button
                onClick={() => setShowShopifyForm(true)}
                disabled={isShopifyLoading || isEmailLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#96BF48] text-white rounded-lg font-medium hover:bg-[#7EA73E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingBag className="w-5 h-5" />
                Continuer avec Shopify
              </button>
            ) : (
              <form onSubmit={handleShopifyLogin} className="space-y-4">
                <div className="p-4 bg-[#96BF48]/10 rounded-lg border border-[#96BF48]/30">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="w-5 h-5 text-[#96BF48]" />
                    <span className="font-medium text-foreground">Connexion Shopify</span>
                  </div>

                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                    <Input
                      type="text"
                      placeholder="nom-de-votre-boutique"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="pl-10 pr-32"
                      disabled={isShopifyLoading}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-foreground-secondary">
                      .myshopify.com
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowShopifyForm(false)}
                    disabled={isShopifyLoading}
                  >
                    Retour
                  </Button>
                  <button
                    type="submit"
                    disabled={isShopifyLoading || !shopName.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#96BF48] text-white rounded-lg font-medium hover:bg-[#7EA73E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isShopifyLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    Connexion
                  </button>
                </div>
              </form>
            )}

            {/* Bouton Mode Démo */}
            <button
              onClick={handleDemoLogin}
              disabled={isDemoLoading || isShopifyLoading || isEmailLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDemoLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              Accéder à la démo
            </button>

            {/* Séparateur */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background text-foreground-secondary">
                  ou avec votre email
                </span>
              </div>
            </div>
          </>
        )}

        {/* Formulaire email - Connexion */}
        {mode === 'login' && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isEmailLoading || isShopifyLoading}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                <Input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isEmailLoading || isShopifyLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isEmailLoading || isShopifyLoading}
            >
              {isEmailLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              Se connecter
            </Button>
          </form>
        )}

        {/* Formulaire email - Inscription */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                <Input
                  type="text"
                  placeholder="Nom complet"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  disabled={isEmailLoading}
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isEmailLoading}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                <Input
                  type="password"
                  placeholder="Mot de passe (min. 6 caractères)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isEmailLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isEmailLoading}
            >
              {isEmailLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              Créer mon compte
            </Button>
          </form>
        )}

        {/* Lien mot de passe oublié */}
        {mode === 'login' && (
          <div className="text-center">
            <Link
              href="/reset-password"
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        )}

        {/* Toggle connexion/inscription */}
        <div className="text-center pt-4 border-t border-border/50">
          {mode === 'login' ? (
            <p className="text-sm text-foreground-secondary">
              Pas encore de compte ?{' '}
              <button
                onClick={() => switchMode('signup')}
                className="text-accent hover:underline font-medium"
              >
                Créer un compte
              </button>
            </p>
          ) : (
            <p className="text-sm text-foreground-secondary">
              Déjà un compte ?{' '}
              <button
                onClick={() => switchMode('login')}
                className="text-accent hover:underline font-medium"
              >
                Se connecter
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
