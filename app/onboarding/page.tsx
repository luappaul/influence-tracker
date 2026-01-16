'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import {
  ShoppingBag,
  Instagram,
  ArrowRight,
  Check,
  Sparkles,
  SkipForward,
  ExternalLink,
} from 'lucide-react';

type OnboardingStep = 'welcome' | 'shopify' | 'social' | 'complete';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isConnectingShopify, setIsConnectingShopify] = useState(false);

  const handleShopifyConnect = () => {
    setIsConnectingShopify(true);
    // Redirect to Shopify OAuth
    window.location.href = '/api/auth/shopify';
  };

  const handleSkipShopify = () => {
    setCurrentStep('social');
  };

  const handleSkipSocial = () => {
    completeOnboarding();
  };

  const handleSocialConnect = (platform: string) => {
    // TODO: Implement social OAuth
    alert(`La connexion ${platform} sera disponible prochainement !`);
  };

  const completeOnboarding = async () => {
    // Mark onboarding as completed
    if (user) {
      await updateUser({ ...user, onboardingCompleted: true });
    }
    // Redirect to new campaign page
    router.push('/campaigns/new');
  };

  const steps = [
    { id: 'welcome', label: 'Bienvenue' },
    { id: 'shopify', label: 'Shopify' },
    { id: 'social', label: 'Réseaux' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background-secondary flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        {currentStep !== 'complete' && (
          <div className="mb-8">
            <div className="flex items-center">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  {/* Step circle and label */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                        index < currentStepIndex
                          ? 'bg-accent text-white'
                          : index === currentStepIndex
                          ? 'bg-accent text-white ring-4 ring-accent/20'
                          : 'bg-background-secondary text-foreground-secondary'
                      }`}
                    >
                      {index < currentStepIndex ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${
                      index <= currentStepIndex ? 'text-foreground' : 'text-foreground-secondary'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-3 h-0.5 rounded-full bg-background-secondary relative">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full bg-accent transition-all duration-300 ${
                          index < currentStepIndex ? 'w-full' : 'w-0'
                        }`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Welcome step */}
        {currentStep === 'welcome' && (
          <Card className="text-center py-12">
            <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Bienvenue sur Datafluence !
            </h1>
            <p className="text-foreground-secondary max-w-md mx-auto mb-8">
              Configurons votre compte en quelques étapes pour commencer à suivre l'impact de vos campagnes d'influence.
            </p>
            <Button onClick={() => setCurrentStep('shopify')} size="lg">
              Commencer la configuration
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>
        )}

        {/* Shopify step */}
        {currentStep === 'shopify' && (
          <Card className="py-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-xl bg-[#95BF47]/10 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-[#95BF47]" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Connectez votre boutique Shopify
              </h2>
              <p className="text-foreground-secondary max-w-md mx-auto">
                Synchronisez vos ventes pour mesurer l'impact réel de vos campagnes d'influence.
              </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              <div className="p-4 rounded-lg bg-background-secondary">
                <h3 className="font-medium text-foreground mb-2">Ce que nous récupérons :</h3>
                <ul className="space-y-2 text-sm text-foreground-secondary">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    Commandes et revenus
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    Liste des produits
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    Données clients anonymisées
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleShopifyConnect}
                disabled={isConnectingShopify}
                className="w-full bg-[#95BF47] hover:bg-[#7EA93B]"
                size="lg"
              >
                {isConnectingShopify ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connexion...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    Connecter Shopify
                    <ExternalLink className="w-4 h-4" />
                  </span>
                )}
              </Button>

              <button
                onClick={handleSkipShopify}
                className="w-full text-sm text-foreground-secondary hover:text-foreground flex items-center justify-center gap-1 py-2"
              >
                <SkipForward className="w-4 h-4" />
                Passer cette étape
              </button>
            </div>
          </Card>
        )}

        {/* Social networks step */}
        {currentStep === 'social' && (
          <Card className="py-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] flex items-center justify-center mx-auto mb-4">
                <Instagram className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Connectez vos réseaux sociaux
              </h2>
              <p className="text-foreground-secondary max-w-md mx-auto">
                Suivez la croissance de vos followers et l'engagement généré par vos campagnes.
              </p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              {/* Instagram */}
              <button
                onClick={() => handleSocialConnect('Instagram')}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-accent/50 hover:bg-accent/5 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] flex items-center justify-center">
                  <Instagram className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">Instagram</p>
                  <p className="text-sm text-foreground-secondary">Followers, likes, commentaires</p>
                </div>
                <ArrowRight className="w-5 h-5 text-foreground-secondary" />
              </button>

              {/* TikTok */}
              <button
                onClick={() => handleSocialConnect('TikTok')}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-accent/50 hover:bg-accent/5 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">TikTok</p>
                  <p className="text-sm text-foreground-secondary">Vues, followers, engagement</p>
                </div>
                <ArrowRight className="w-5 h-5 text-foreground-secondary" />
              </button>

              {/* LinkedIn */}
              <button
                onClick={() => handleSocialConnect('LinkedIn')}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-accent/50 hover:bg-accent/5 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-[#0A66C2] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">LinkedIn</p>
                  <p className="text-sm text-foreground-secondary">Connexions, impressions</p>
                </div>
                <ArrowRight className="w-5 h-5 text-foreground-secondary" />
              </button>

              <div className="pt-4 flex flex-col gap-2">
                <Button onClick={completeOnboarding} size="lg" className="w-full">
                  Terminer la configuration
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <button
                  onClick={handleSkipSocial}
                  className="w-full text-sm text-foreground-secondary hover:text-foreground flex items-center justify-center gap-1 py-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Configurer plus tard
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
