'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Instagram,
  CheckCircle2,
  Shield,
  Clock,
  Eye,
  Lock,
  Sparkles,
  Calendar,
  Euro,
  Users,
  ArrowRight
} from 'lucide-react';

export default function CollabPage() {
  const params = useParams();
  const token = params.token as string;
  const [isConnecting, setIsConnecting] = useState(false);

  // TODO: Récupérer les données de la collaboration depuis Supabase avec le token
  // Pour le MVP, on affiche une page d'exemple
  const collabData = {
    brandName: 'Votre marque partenaire',
    campaignName: 'Campagne de collaboration',
    influencerName: 'Influenceur',
    budget: 500,
    startDate: new Date().toISOString(),
    duration: 30,
  };

  const handleInstagramConnect = () => {
    setIsConnecting(true);
    // TODO: Implémenter l'OAuth Instagram
    setTimeout(() => {
      alert('La connexion Instagram sera disponible prochainement !');
      setIsConnecting(false);
    }, 1000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background-secondary">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-foreground text-lg">Datafluence</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        {/* Welcome Card */}
        <Card className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Instagram className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Bienvenue dans votre espace collaboration !
          </h1>
          <p className="text-foreground-secondary max-w-md mx-auto">
            Connectez votre compte Instagram pour permettre le suivi des performances de votre collaboration.
          </p>
        </Card>

        {/* Contract Details */}
        <Card>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            Détails de la collaboration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-background-secondary">
              <p className="text-sm text-foreground-secondary mb-1">Budget</p>
              <p className="text-xl font-semibold text-foreground flex items-center gap-1">
                <Euro className="w-5 h-5 text-success" />
                {collabData.budget.toLocaleString('fr-FR')} €
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background-secondary">
              <p className="text-sm text-foreground-secondary mb-1">Date de début</p>
              <p className="text-xl font-semibold text-foreground">
                {formatDate(collabData.startDate)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background-secondary">
              <p className="text-sm text-foreground-secondary mb-1">Durée</p>
              <p className="text-xl font-semibold text-foreground">
                {collabData.duration} jours
              </p>
            </div>
          </div>
        </Card>

        {/* Instagram Connection */}
        <Card className="border-2 border-accent/20">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] flex items-center justify-center">
                <Instagram className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Connectez votre compte Instagram
              </h3>
              <p className="text-foreground-secondary text-sm mb-4">
                En connectant votre compte, vous autorisez le suivi de vos publications pendant la durée de la collaboration uniquement.
              </p>
              <Button
                onClick={handleInstagramConnect}
                disabled={isConnecting}
                className="bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] hover:opacity-90"
              >
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connexion...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    Connecter Instagram
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Trust Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border/50">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm">Données sécurisées</h4>
              <p className="text-xs text-foreground-secondary mt-1">
                Vos informations sont chiffrées et protégées
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border/50">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-info" />
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm">Accès temporaire</h4>
              <p className="text-xs text-foreground-secondary mt-1">
                Limité à la durée de la collaboration
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border/50">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Eye className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm">Lecture seule</h4>
              <p className="text-xs text-foreground-secondary mt-1">
                Nous ne publions jamais en votre nom
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <Card>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-foreground text-sm mb-1">
                Quelles données sont collectées ?
              </h4>
              <p className="text-sm text-foreground-secondary">
                Uniquement vos publications publiques (images, likes, commentaires) pendant la période de collaboration. Nous n'accédons pas à vos messages privés ni à vos stories.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm mb-1">
                Puis-je révoquer l'accès ?
              </h4>
              <p className="text-sm text-foreground-secondary">
                Oui, vous pouvez révoquer l'accès à tout moment depuis les paramètres de votre compte Instagram ou en nous contactant directement.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm mb-1">
                Que se passe-t-il après la collaboration ?
              </h4>
              <p className="text-sm text-foreground-secondary">
                L'accès est automatiquement révoqué à la fin de la période de collaboration. Vous n'avez rien à faire.
              </p>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-foreground-secondary pt-8 border-t border-border/50">
          <p>
            Propulsé par <span className="font-medium text-foreground">Datafluence</span>
          </p>
          <p className="mt-1">
            Une question ? Contactez la marque partenaire directement.
          </p>
        </div>
      </main>
    </div>
  );
}
