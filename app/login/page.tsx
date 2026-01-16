'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, ShoppingBag, Mail, Lock, ArrowRight, Loader2, Store } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function LoginForm() {
  const { login, loginWithShopify, loginAsDemo, isLoading, error: authError, setError: setAuthError } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [error, setError] = useState('');
  const [isShopifyLoading, setIsShopifyLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [showShopifyForm, setShowShopifyForm] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

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
      setError('Identifiants incorrects');
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Panneau gauche - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-accent/10 via-background to-background p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-foreground">Influence Tracker</span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-semibold text-foreground leading-tight">
            Mesurez l'impact réel de vos campagnes d'influence
          </h1>
          <p className="text-lg text-foreground-secondary">
            Attribution de ventes sans codes promo ni liens trackés.
            Corrélation temporelle entre posts Instagram et pics de ventes Shopify.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-6">
            <div className="p-4 bg-card rounded-xl border border-border/50">
              <p className="text-2xl font-semibold text-foreground">+145%</p>
              <p className="text-sm text-foreground-secondary">Lift moyen détecté</p>
            </div>
            <div className="p-4 bg-card rounded-xl border border-border/50">
              <p className="text-2xl font-semibold text-foreground">1.8x</p>
              <p className="text-sm text-foreground-secondary">ROAS moyen</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-foreground-secondary">
          Utilisé par plus de 500 e-commerçants
        </p>
      </div>

      {/* Panneau droit - Formulaire */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-foreground">Influence Tracker</span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-semibold text-foreground">Connexion</h2>
            <p className="text-foreground-secondary mt-2">
              Connectez-vous pour accéder à votre tableau de bord
            </p>
          </div>

          {/* Erreur globale */}
          {displayError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-danger text-center">{displayError}</p>
            </div>
          )}

          {/* Section Shopify */}
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

                <p className="text-xs text-foreground-secondary mt-2">
                  Entrez le nom de votre boutique Shopify (ex: ma-boutique)
                </p>
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
                  {isShopifyLoading ? 'Connexion...' : 'Connexion'}
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
            {isDemoLoading ? 'Connexion...' : 'Accéder à la démo'}
          </button>

          <p className="text-xs text-foreground-secondary text-center">
            Shopify pré-configuré avec votre boutique test
          </p>

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

          {/* Formulaire email */}
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
              {isEmailLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          {/* Lien mot de passe oublié */}
          <div className="text-center">
            <button className="text-sm text-foreground-secondary hover:text-foreground transition-colors">
              Mot de passe oublié ?
            </button>
          </div>

          {/* Lien inscription */}
          <div className="text-center pt-4 border-t border-border/50">
            <p className="text-sm text-foreground-secondary">
              Pas encore de compte ?{' '}
              <button className="text-accent hover:underline font-medium">
                Créer un compte
              </button>
            </p>
          </div>

          {/* Note Shopify */}
          <div className="bg-background-secondary rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ShoppingBag className="w-5 h-5 text-[#96BF48] mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Recommandé : Connexion Shopify</p>
                <p className="text-foreground-secondary mt-1">
                  Connectez directement votre boutique Shopify pour synchroniser
                  automatiquement vos commandes et produits.
                </p>
              </div>
            </div>
          </div>
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
