'use client';

import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
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
          <h1 className="text-2xl font-bold text-foreground mb-6">Conditions Générales d'Utilisation</h1>

          <p className="text-foreground-secondary mb-4">
            Dernière mise à jour : Janvier 2026
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">1. Objet</h2>
          <p className="text-foreground-secondary mb-4">
            Les présentes conditions générales régissent l'utilisation de la plateforme Datafluence,
            un outil de suivi et d'analyse des campagnes de marketing d'influence.
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">2. Accès au service</h2>
          <p className="text-foreground-secondary mb-4">
            L'accès à Datafluence nécessite la création d'un compte. Vous êtes responsable de
            la confidentialité de vos identifiants de connexion.
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">3. Utilisation du service</h2>
          <p className="text-foreground-secondary mb-4">
            Vous vous engagez à utiliser Datafluence de manière conforme aux lois en vigueur et
            aux conditions d'utilisation des plateformes tierces (Instagram, TikTok, LinkedIn, Shopify).
          </p>
          <p className="text-foreground-secondary mb-4">
            Il est interdit de :
          </p>
          <ul className="list-disc pl-6 text-foreground-secondary mb-4">
            <li>Utiliser le service à des fins illégales</li>
            <li>Tenter de contourner les limitations des APIs tierces</li>
            <li>Collecter des données d'utilisateurs sans leur consentement</li>
            <li>Revendre l'accès au service</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">4. Données et confidentialité</h2>
          <p className="text-foreground-secondary mb-4">
            L'utilisation de vos données est régie par notre{' '}
            <Link href="/privacy" className="text-accent hover:underline">
              Politique de Confidentialité
            </Link>.
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">5. Propriété intellectuelle</h2>
          <p className="text-foreground-secondary mb-4">
            Datafluence et son contenu (code, design, textes) sont protégés par le droit d'auteur.
            Toute reproduction non autorisée est interdite.
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">6. Limitation de responsabilité</h2>
          <p className="text-foreground-secondary mb-4">
            Datafluence est fourni "tel quel". Nous ne garantissons pas l'exactitude des données
            provenant des plateformes tierces. Notre responsabilité est limitée au montant des
            sommes versées pour l'utilisation du service.
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">7. Résiliation</h2>
          <p className="text-foreground-secondary mb-4">
            Vous pouvez résilier votre compte à tout moment depuis les paramètres. Nous nous
            réservons le droit de suspendre ou supprimer un compte en cas de violation des présentes conditions.
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">8. Modifications</h2>
          <p className="text-foreground-secondary mb-4">
            Nous pouvons modifier ces conditions à tout moment. Les utilisateurs seront informés
            des changements significatifs par email.
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">9. Contact</h2>
          <p className="text-foreground-secondary mb-4">
            Pour toute question concernant ces conditions :<br />
            Email : contact@datafluence.app
          </p>
        </Card>
      </div>
    </div>
  );
}
