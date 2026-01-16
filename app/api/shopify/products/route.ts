import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_VERSION = '2024-01';

// Générer des produits de démonstration FIXES
function generateDemoProducts() {
  return [
    {
      id: 1001,
      title: 'Sérum Hydratant Intense',
      body_html: '<p>Un sérum hydratant intense pour une peau douce et éclatante.</p>',
      vendor: 'BeautyBrand',
      product_type: 'Skincare',
      created_at: '2024-06-01T10:00:00Z',
      handle: 'serum-hydratant-intense',
      status: 'active',
      images: [{ id: 1, src: 'https://picsum.photos/seed/serum/400/400' }],
      variants: [{ id: 1001, title: 'Default', price: '45.00', inventory_quantity: 150 }],
    },
    {
      id: 1002,
      title: 'Crème Anti-Âge Premium',
      body_html: '<p>Crème anti-âge premium aux ingrédients naturels.</p>',
      vendor: 'BeautyBrand',
      product_type: 'Skincare',
      created_at: '2024-06-15T10:00:00Z',
      handle: 'creme-anti-age-premium',
      status: 'active',
      images: [{ id: 2, src: 'https://picsum.photos/seed/creme/400/400' }],
      variants: [{ id: 1002, title: 'Default', price: '89.00', inventory_quantity: 80 }],
    },
    {
      id: 1003,
      title: 'Huile Visage Éclat',
      body_html: '<p>Huile visage pour un teint éclatant et lumineux.</p>',
      vendor: 'BeautyBrand',
      product_type: 'Skincare',
      created_at: '2024-07-01T10:00:00Z',
      handle: 'huile-visage-eclat',
      status: 'active',
      images: [{ id: 3, src: 'https://picsum.photos/seed/huile/400/400' }],
      variants: [{ id: 1003, title: 'Default', price: '38.00', inventory_quantity: 120 }],
    },
    {
      id: 1004,
      title: 'Masque Purifiant',
      body_html: '<p>Masque purifiant pour une peau nettoyée en profondeur.</p>',
      vendor: 'BeautyBrand',
      product_type: 'Skincare',
      created_at: '2024-07-15T10:00:00Z',
      handle: 'masque-purifiant',
      status: 'active',
      images: [{ id: 4, src: 'https://picsum.photos/seed/masque/400/400' }],
      variants: [{ id: 1004, title: 'Default', price: '29.00', inventory_quantity: 200 }],
    },
    {
      id: 1005,
      title: 'Contour des Yeux',
      body_html: '<p>Soin contour des yeux pour réduire cernes et poches.</p>',
      vendor: 'BeautyBrand',
      product_type: 'Skincare',
      created_at: '2024-08-01T10:00:00Z',
      handle: 'contour-des-yeux',
      status: 'active',
      images: [{ id: 5, src: 'https://picsum.photos/seed/yeux/400/400' }],
      variants: [{ id: 1005, title: 'Default', price: '52.00', inventory_quantity: 90 }],
    },
    {
      id: 1006,
      title: 'Eau Micellaire Bio',
      body_html: '<p>Eau micellaire bio pour un démaquillage tout en douceur.</p>',
      vendor: 'BeautyBrand',
      product_type: 'Skincare',
      created_at: '2024-08-15T10:00:00Z',
      handle: 'eau-micellaire-bio',
      status: 'active',
      images: [{ id: 6, src: 'https://picsum.photos/seed/micellaire/400/400' }],
      variants: [{ id: 1006, title: 'Default', price: '18.00', inventory_quantity: 300 }],
    },
    {
      id: 1007,
      title: 'Coffret Routine Complète',
      body_html: '<p>Coffret comprenant tous les essentiels pour une routine skincare complète.</p>',
      vendor: 'BeautyBrand',
      product_type: 'Coffret',
      created_at: '2024-09-01T10:00:00Z',
      handle: 'coffret-routine-complete',
      status: 'active',
      images: [{ id: 7, src: 'https://picsum.photos/seed/coffret/400/400' }],
      variants: [{ id: 1007, title: 'Default', price: '149.00', inventory_quantity: 50 }],
    },
    {
      id: 1008,
      title: 'Gommage Doux Visage',
      body_html: '<p>Gommage doux pour exfolier en douceur et révéler l\'éclat naturel.</p>',
      vendor: 'BeautyBrand',
      product_type: 'Skincare',
      created_at: '2024-09-15T10:00:00Z',
      handle: 'gommage-doux-visage',
      status: 'active',
      images: [{ id: 8, src: 'https://picsum.photos/seed/gommage/400/400' }],
      variants: [{ id: 1008, title: 'Default', price: '25.00', inventory_quantity: 180 }],
    },
  ];
}

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
    // Paramètres
    const searchParams = request.nextUrl.searchParams;
    const forceDemo = searchParams.get('demo') === 'true';

    // Si mode démo forcé, retourner les données de démo
    if (forceDemo) {
      console.log('Demo mode forced, returning demo products');
      return NextResponse.json({ products: generateDemoProducts(), isDemo: true });
    }

    const credentials = await getShopifyCredentials();

    if (!credentials) {
      // Retourner des données vides si pas de credentials
      console.log('No Shopify credentials, returning empty products');
      return NextResponse.json({ products: [], isDemo: false });
    }

    // Paramètres de pagination
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
