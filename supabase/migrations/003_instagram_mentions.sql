-- Table pour stocker les mentions Instagram (posts, stories, reels)
-- Les stories expirent après 24h donc on doit sauvegarder les infos

CREATE TABLE IF NOT EXISTS instagram_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Utilisateur Datafluence qui a reçu la mention (la marque)
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL, -- ID Instagram de la marque

  -- Infos sur le média où la mention a eu lieu
  media_id TEXT NOT NULL UNIQUE, -- ID du média Instagram
  media_type TEXT DEFAULT 'story', -- 'story', 'post', 'reel'
  media_url TEXT, -- URL de l'image/vidéo (sauvegardée avant expiration)
  media_thumbnail_url TEXT, -- Thumbnail si vidéo

  -- Infos sur l'influenceur qui a fait la mention
  mentioned_by_user_id TEXT, -- ID Instagram de l'influenceur
  mentioned_by_username TEXT, -- @username de l'influenceur
  mentioned_by_profile_pic TEXT, -- Photo de profil

  -- Contenu (pour les posts/reels)
  caption TEXT,

  -- Timestamps
  media_timestamp TIMESTAMPTZ, -- Quand le média a été créé
  received_at TIMESTAMPTZ DEFAULT NOW(), -- Quand on a reçu le webhook
  expires_at TIMESTAMPTZ, -- Quand le média expire (stories = +24h)

  -- Lien avec une campagne
  campaign_id TEXT, -- ID de la campagne associée (si liée)
  influencer_username TEXT, -- Username de l'influenceur dans la campagne

  -- Statut
  processed BOOLEAN DEFAULT FALSE, -- A été traité/vérifié
  mentions_product BOOLEAN, -- Mentionne le produit (validation manuelle ou auto)

  -- Metadata
  raw_webhook_data JSONB, -- Données brutes du webhook pour debug

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_mentions_user_id ON instagram_mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_media_id ON instagram_mentions(media_id);
CREATE INDEX IF NOT EXISTS idx_mentions_campaign ON instagram_mentions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mentions_received ON instagram_mentions(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentions_unprocessed ON instagram_mentions(processed) WHERE processed = FALSE;

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_mentions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mentions_updated_at
  BEFORE UPDATE ON instagram_mentions
  FOR EACH ROW
  EXECUTE FUNCTION update_mentions_updated_at();

-- RLS (Row Level Security)
ALTER TABLE instagram_mentions ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres mentions
CREATE POLICY "Users can view own mentions"
  ON instagram_mentions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent modifier leurs propres mentions
CREATE POLICY "Users can update own mentions"
  ON instagram_mentions FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Insertion via service role (webhooks)
CREATE POLICY "Service can insert mentions"
  ON instagram_mentions FOR INSERT
  WITH CHECK (true);
