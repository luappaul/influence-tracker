import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_VERSION = '2024-01';

export async function GET(request: NextRequest) {
  try {
    // Récupérer l'utilisateur depuis le cookie
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('influence_tracker_user');

    if (!userCookie) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);

    if (!user.shopifyStore || !user.shopifyAccessToken) {
      return NextResponse.json(
        { error: 'Boutique Shopify non connectée' },
        { status: 400 }
      );
    }

    // Paramètres de pagination
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '50';

    const response = await fetch(
      `https://${user.shopifyStore}/admin/api/${API_VERSION}/products.json?limit=${limit}`,
      {
        headers: {
          'X-Shopify-Access-Token': user.shopifyAccessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Shopify products error:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des produits' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
