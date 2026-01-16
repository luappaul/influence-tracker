import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_VERSION = '2024-01';

// Récupérer les credentials Shopify (env vars ou cookie)
async function getShopifyCredentials(): Promise<{ store: string; accessToken: string } | null> {
  // 1. D'abord essayer les variables d'environnement (legacy app / direct token)
  const envStore = process.env.SHOPIFY_STORE_DOMAIN;
  const envToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (envStore && envToken) {
    console.log('Using Shopify credentials from environment variables');
    return { store: envStore, accessToken: envToken };
  }

  // 2. Sinon, essayer le cookie utilisateur (OAuth flow)
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('influence_tracker_user');

  if (userCookie) {
    try {
      const user = JSON.parse(userCookie.value);
      if (user.shopifyStore && user.shopifyAccessToken) {
        console.log('Using Shopify credentials from user cookie');
        return { store: user.shopifyStore, accessToken: user.shopifyAccessToken };
      }
    } catch {
      // Cookie invalide
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const credentials = await getShopifyCredentials();

    if (!credentials) {
      return NextResponse.json(
        { error: 'Non authentifié - Shopify non configuré' },
        { status: 401 }
      );
    }

    // Paramètres de pagination
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '50';

    console.log('Fetching products from Shopify:', credentials.store);

    const response = await fetch(
      `https://${credentials.store}/admin/api/${API_VERSION}/products.json?limit=${limit}`,
      {
        headers: {
          'X-Shopify-Access-Token': credentials.accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Shopify products error:', response.status, error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des produits', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`Successfully fetched ${data.products?.length || 0} products from Shopify`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
