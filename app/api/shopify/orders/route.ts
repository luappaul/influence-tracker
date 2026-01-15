import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_VERSION = '2024-01';

// Générer des données de démonstration
function generateDemoOrders() {
  const now = new Date();
  const firstNames = ['Marie', 'Sophie', 'Emma', 'Léa', 'Camille', 'Chloé', 'Julie', 'Laura', 'Sarah', 'Alice'];
  const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau'];

  const orders = [];
  for (let i = 0; i < 47; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - daysAgo);

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const total = (Math.random() * 150 + 30).toFixed(2);

    orders.push({
      id: 1000 + i,
      order_number: 1000 + i,
      name: `#${1000 + i}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      created_at: orderDate.toISOString(),
      total_price: total,
      currency: 'EUR',
      financial_status: 'paid',
      customer: {
        id: 100 + i,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        first_name: firstName,
        last_name: lastName,
      },
      line_items: [],
    });
  }

  // Ajouter Cyprien Clermontel pour les tests de matching
  orders.push({
    id: 9999,
    order_number: 9999,
    name: '#9999',
    email: 'cyprien.clermontel@email.com',
    created_at: '2026-01-15T14:30:00.000Z',
    total_price: '89.00',
    currency: 'EUR',
    financial_status: 'paid',
    customer: {
      id: 9999,
      email: 'cyprien.clermontel@email.com',
      first_name: 'Cyprien',
      last_name: 'Clermontel',
    },
    line_items: [],
  });

  return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function GET(request: NextRequest) {
  try {
    // Récupérer l'utilisateur depuis le cookie
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('influence_tracker_user');

    if (!userCookie) {
      // Retourner les données de démo si pas authentifié
      console.log('No auth cookie, returning demo orders');
      return NextResponse.json({ orders: generateDemoOrders(), isDemo: true });
    }

    const user = JSON.parse(userCookie.value);

    if (!user.shopifyStore || !user.shopifyAccessToken) {
      // Retourner les données de démo si Shopify pas connecté
      console.log('No Shopify connection, returning demo orders');
      return NextResponse.json({ orders: generateDemoOrders(), isDemo: true });
    }

    // Paramètres de pagination et filtrage
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '50';
    const status = searchParams.get('status') || 'any';
    const createdAtMin = searchParams.get('created_at_min') || '';
    const createdAtMax = searchParams.get('created_at_max') || '';

    // Construire l'URL de l'API Shopify
    let url = `https://${user.shopifyStore}/admin/api/${API_VERSION}/orders.json?limit=${limit}&status=${status}`;

    if (createdAtMin) {
      url += `&created_at_min=${createdAtMin}`;
    }
    if (createdAtMax) {
      url += `&created_at_max=${createdAtMax}`;
    }

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': user.shopifyAccessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Shopify orders error:', error);
      // Retourner les données de démo en cas d'erreur Shopify
      console.log('Shopify API error, returning demo orders');
      return NextResponse.json({ orders: generateDemoOrders(), isDemo: true });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Orders API error:', error);
    // Retourner les données de démo en cas d'erreur
    return NextResponse.json({ orders: generateDemoOrders(), isDemo: true });
  }
}
