'use client';

import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>

        <Card className="prose prose-sm max-w-none">
          <h1 className="text-2xl font-bold text-foreground mb-6">Politique de Confidentialité</h1>

          <p className="text-foreground-secondary mb-4">
            Dernière mise à jour : Janvier 2026
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">1. Collecte des données</h2>
          <p className="text-foreground-secondary mb-4">
            Datafluence collecte les données suivantes lorsque vous utilisez notre service :
          </p>
          <ul className="list-disc pl-6 text-foreground-secondary mb-4">
            <li>Informations de compte (email, nom)</li>
            <li>Données de connexion aux réseaux sociaux (Instagram, TikTok, LinkedIn)</li>
            <li>Données de votre boutique Shopify (commandes, produits)</li>
            <li>Statistiques de vos campagnes d'influence</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">2. Utilisation des données</h2>
          <p className="text-foreground-secondary mb-4">
            Vos données sont utilisées exclusivement pour :
          </p>
          <ul className="list-disc pl-6 text-foreground-secondary mb-4">
            <li>Fournir les fonctionnalités de suivi de campagnes</li>
            <li>Analyser l'impact de vos campagnes d'influence</li>
            <li>Améliorer nos services</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">3. Partage des données</h2>
          <p className="text-foreground-secondary mb-4">
            Nous ne vendons jamais vos données. Elles peuvent être partagées uniquement avec :
          </p>
          <ul className="list-disc pl-6 text-foreground-secondary mb-4">
            <li>Les services tiers nécessaires au fonctionnement (Supabase, Vercel)</li>
            <li>Les APIs des plateformes que vous connectez (Meta, Shopify)</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">4. Sécurité</h2>
          <p className="text-foreground-secondary mb-4">
            Vos données sont chiffrées et stockées de manière sécurisée. Les tokens d'accès aux
            plateformes tierces sont stockés de manière chiffrée.
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">5. Vos droits</h2>
          <p className="text-foreground-secondary mb-4">
            Conformément au RGPD, vous pouvez :
          </p>
          <ul className="list-disc pl-6 text-foreground-secondary mb-4">
            <li>Accéder à vos données</li>
            <li>Rectifier vos données</li>
            <li>Supprimer vos données</li>
            <li>Exporter vos données</li>
          </ul>
          <p className="text-foreground-secondary mb-4">
            Pour exercer ces droits, contactez-nous à : contact@datafluence.app
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">6. Contact</h2>
          <p className="text-foreground-secondary mb-4">
            Pour toute question concernant cette politique de confidentialité :<br />
            Email : contact@datafluence.app
          </p>
        </Card>
      </div>
    </div>
  );
}
