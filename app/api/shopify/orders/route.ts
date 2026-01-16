import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_VERSION = '2024-01';

// Générer des données de démonstration FIXES pour 2025-2026
function generateDemoOrders() {
  const firstNames = ['Marie', 'Sophie', 'Emma', 'Léa', 'Camille', 'Chloé', 'Julie', 'Laura', 'Sarah', 'Alice', 'Manon', 'Lucie', 'Charlotte', 'Pauline', 'Anaïs', 'Clara', 'Inès', 'Jade', 'Louise', 'Zoé'];
  const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel'];

  const products = [
    { id: 1001, title: 'Sérum Hydratant Intense', price: 45.00 },
    { id: 1002, title: 'Crème Anti-Âge Premium', price: 89.00 },
    { id: 1003, title: 'Huile Visage Éclat', price: 38.00 },
    { id: 1004, title: 'Masque Purifiant', price: 29.00 },
    { id: 1005, title: 'Contour des Yeux', price: 52.00 },
    { id: 1006, title: 'Eau Micellaire Bio', price: 18.00 },
    { id: 1007, title: 'Coffret Routine Complète', price: 149.00 },
    { id: 1008, title: 'Gommage Doux Visage', price: 25.00 },
  ];

  // Seed fixe pour données reproductibles
  let seed = 42;
  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const orders = [];
  let orderId = 1001;

  // Générer des commandes de janvier 2025 à aujourd'hui
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2026-01-16');

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();

    // Base: 4-8 commandes par jour, moins le weekend
    let baseOrders = dayOfWeek === 0 || dayOfWeek === 6 ? 3 : 6;

    // Variation aléatoire mais déterministe
    baseOrders += Math.floor(seededRandom() * 4) - 1;
    if (baseOrders < 2) baseOrders = 2;

    for (let i = 0; i < baseOrders; i++) {
      const hour = 8 + Math.floor(seededRandom() * 14); // 8h-22h
      const minute = Math.floor(seededRandom() * 60);
      const orderDate = new Date(d);
      orderDate.setHours(hour, minute, 0, 0);

      const firstName = firstNames[Math.floor(seededRandom() * firstNames.length)];
      const lastName = lastNames[Math.floor(seededRandom() * lastNames.length)];

      // 1 à 3 produits par commande
      const numProducts = Math.floor(seededRandom() * 3) + 1;
      const lineItems = [];
      let total = 0;

      for (let p = 0; p < numProducts; p++) {
        const product = products[Math.floor(seededRandom() * products.length)];
        const quantity = seededRandom() > 0.8 ? 2 : 1;
        lineItems.push({
          product_id: product.id,
          title: product.title,
          quantity,
          price: product.price.toFixed(2),
        });
        total += product.price * quantity;
      }

      orders.push({
        id: orderId,
        order_number: orderId,
        name: `#${orderId}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(seededRandom() * 100)}@email.com`,
        created_at: orderDate.toISOString(),
        total_price: total.toFixed(2),
        currency: 'EUR',
        financial_status: 'paid',
        customer: {
          id: orderId + 10000,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(seededRandom() * 100)}@email.com`,
          first_name: firstName,
          last_name: lastName,
        },
        line_items: lineItems,
      });

      orderId++;
    }
  }

  return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    // Paramètres de pagination et filtrage
    const searchParams = request.nextUrl.searchParams;
    const forceDemo = searchParams.get('demo') === 'true';

    // Si mode démo forcé, retourner les données de démo
    if (forceDemo) {
      console.log('Demo mode forced, returning demo orders');
      return NextResponse.json({ orders: generateDemoOrders(), isDemo: true });
    }

    const credentials = await getShopifyCredentials();

    if (!credentials) {
      // Retourner des données vides si pas de credentials (pas de démo par défaut)
      console.log('No Shopify credentials, returning empty orders');
      return NextResponse.json({ orders: [], isDemo: false });
    }

    const limit = searchParams.get('limit') || '50';
    const status = searchParams.get('status') || 'any';
    const createdAtMin = searchParams.get('created_at_min') || '';
    const createdAtMax = searchParams.get('created_at_max') || '';

    // Construire l'URL de l'API Shopify
    let url = `https://${credentials.store}/admin/api/${API_VERSION}/orders.json?limit=${limit}&status=${status}`;

    if (createdAtMin) {
      url += `&created_at_min=${createdAtMin}`;
    }
    if (createdAtMax) {
      url += `&created_at_max=${createdAtMax}`;
    }

    console.log('Fetching orders from Shopify:', credentials.store);

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': credentials.accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Shopify orders error:', response.status, error);
      // Retourner une erreur, pas de données démo par défaut
      return NextResponse.json({ orders: [], error: `Shopify API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    console.log(`Successfully fetched ${data.orders?.length || 0} orders from Shopify`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json({ orders: [], error: 'Server error' }, { status: 500 });
  }
}
