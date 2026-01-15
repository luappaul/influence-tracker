// Configuration Shopify OAuth
// Implémentation manuelle pour éviter les problèmes de compatibilité avec le SDK

const API_VERSION = '2024-01';

// Générer l'URL d'autorisation OAuth
export function getAuthUrl(shop: string, redirectUri: string, state: string): string {
  const scopes = process.env.SHOPIFY_SCOPES || 'read_orders,read_products';
  const apiKey = process.env.SHOPIFY_API_KEY;

  if (!apiKey) {
    throw new Error('SHOPIFY_API_KEY is not configured');
  }

  const authUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${apiKey}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${state}`;

  return authUrl;
}

// Échanger le code contre un token
export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ access_token: string; scope: string }> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token exchange error:', error);
    throw new Error('Failed to exchange code for token');
  }

  return response.json();
}

// Récupérer les infos de la boutique
export async function getShopInfo(shop: string, accessToken: string) {
  const response = await fetch(`https://${shop}/admin/api/${API_VERSION}/shop.json`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Shop info error:', error);
    throw new Error('Failed to fetch shop info');
  }

  const data = await response.json();
  return data.shop;
}

// Vérifier le HMAC de Shopify
export function verifyHmac(params: URLSearchParams, secret: string): boolean {
  const hmac = params.get('hmac');
  if (!hmac) return false;

  const crypto = require('crypto');

  // Créer une copie des params sans hmac
  const verifyParams = new URLSearchParams(params);
  verifyParams.delete('hmac');
  verifyParams.sort();

  const message = verifyParams.toString();
  const generatedHmac = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  return hmac === generatedHmac;
}
