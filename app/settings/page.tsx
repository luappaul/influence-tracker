'use client';

import { useState, useEffect } from 'react';
import { Check, ShoppingBag, Instagram, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';

interface InstagramConnection {
  user_id: string;
  username: string;
  access_token: string;
  followers_count: number;
  connected_at: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [conversionWindow, setConversionWindow] = useState(48);
  const [minConfidence, setMinConfidence] = useState(60);
  const [instagramConnection, setInstagramConnection] = useState<InstagramConnection | null>(null);

  // Vérifier si l'utilisateur a Shopify connecté
  const shopifyConnected = !!(user?.shopifyStore && user?.shopifyAccessToken);

  // Charger la connexion Instagram depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem('instagram-connection');
    if (stored) {
      try {
        setInstagramConnection(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing Instagram connection:', e);
      }
    }
  }, []);

  const handleInstagramConnect = () => {
    window.location.href = '/api/auth/instagram';
  };

  const handleInstagramDisconnect = () => {
    localStorage.removeItem('instagram-connection');
    setInstagramConnection(null);
  };

  return (
    <div className="space-y-8">
      <Header
        title="Paramètres"
        description="Configurez vos intégrations et préférences d'attribution"
      />

      {/* Connexions */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Connexions</h2>

        <div className="space-y-4">
          {/* Shopify */}
          <Card>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#96BF48] flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Shopify</CardTitle>
                  <CardDescription>
                    Synchronisez vos commandes pour l'attribution automatique
                  </CardDescription>
                </div>
              </div>

              {shopifyConnected ? (
                <div className="flex items-center gap-3">
                  <Badge variant="success">
                    <Check className="w-3 h-3 mr-1" />
                    Connecté
                  </Badge>
                  <Button variant="ghost" size="sm">
                    Déconnecter
                  </Button>
                </div>
              ) : (
                <Button>Connecter Shopify</Button>
              )}
            </div>

            {shopifyConnected && user?.shopifyStore && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="text-sm">
                  <p className="text-foreground-secondary">Boutique</p>
                  <p className="font-medium text-foreground">{user.shopifyStore}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Instagram */}
          <Card>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] flex items-center justify-center">
                  <Instagram className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Instagram</CardTitle>
                  <CardDescription>
                    Connectez votre compte pour détecter automatiquement les mentions
                  </CardDescription>
                </div>
              </div>

              {instagramConnection ? (
                <div className="flex items-center gap-3">
                  <Badge variant="success">
                    <Check className="w-3 h-3 mr-1" />
                    Connecté
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={handleInstagramDisconnect}>
                    Déconnecter
                  </Button>
                </div>
              ) : (
                <Button onClick={handleInstagramConnect}>
                  <Instagram className="w-4 h-4 mr-2" />
                  Connecter
                </Button>
              )}
            </div>

            {instagramConnection && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-foreground-secondary">Compte</p>
                    <p className="font-medium text-foreground">@{instagramConnection.username}</p>
                  </div>
                  <div>
                    <p className="text-foreground-secondary">Followers</p>
                    <p className="font-medium text-foreground">
                      {instagramConnection.followers_count.toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-foreground-secondary">Connecté le</p>
                    <p className="font-medium text-foreground">
                      {new Date(instagramConnection.connected_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleInstagramConnect}>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reconnecter
                  </Button>
                  <span className="text-xs text-foreground-secondary">
                    Token valide ~60 jours
                  </span>
                </div>
              </div>
            )}

            {!instagramConnection && (
              <div className="mt-3 p-3 rounded-lg bg-background-secondary">
                <p className="text-sm text-foreground-secondary">
                  La connexion Instagram permet de détecter automatiquement quand des influenceurs
                  vous mentionnent dans leurs posts et stories.
                </p>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Paramètres d'attribution */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Paramètres d'attribution
        </h2>

        <div className="space-y-4">
          {/* Fenêtre de conversion */}
          <Card>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent-light flex items-center justify-center">
                <Clock className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <CardTitle>Fenêtre de conversion</CardTitle>
                <CardDescription>
                  Durée pendant laquelle une vente peut être attribuée à un post
                </CardDescription>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground-secondary">12h</span>
                    <span className="text-lg font-semibold text-foreground">{conversionWindow}h</span>
                    <span className="text-sm text-foreground-secondary">72h</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={72}
                    step={6}
                    value={conversionWindow}
                    onChange={(e) => setConversionWindow(Number(e.target.value))}
                    className="w-full h-2 bg-background-secondary rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <p className="mt-2 text-xs text-foreground-secondary">
                    Recommandé: 48h pour les produits beauté et lifestyle
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Seuil de confiance */}
          <Card>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent-light flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <CardTitle>Seuil de confiance minimum</CardTitle>
                <CardDescription>
                  Score minimum pour afficher une attribution dans les rapports
                </CardDescription>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground-secondary">30%</span>
                    <span className="text-lg font-semibold text-foreground">{minConfidence}%</span>
                    <span className="text-sm text-foreground-secondary">90%</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={90}
                    step={10}
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(Number(e.target.value))}
                    className="w-full h-2 bg-background-secondary rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <p className="mt-2 text-xs text-foreground-secondary">
                    Un seuil plus élevé donne des résultats plus fiables mais moins nombreux
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
        <Button variant="secondary">Annuler</Button>
        <Button>Enregistrer les modifications</Button>
      </div>
    </div>
  );
}
