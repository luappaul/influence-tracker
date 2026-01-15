import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/shopify';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Vérifier que les credentials Shopify sont configurés
    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
      console.error('Shopify credentials not configured');
      return NextResponse.json(
        { error: 'Les credentials Shopify ne sont pas configurés. Veuillez configurer SHOPIFY_API_KEY et SHOPIFY_API_SECRET dans .env.local' },
        { status: 500 }
      );
    }

    const { shop } = await request.json();

    if (!shop) {
      return NextResponse.json(
        { error: 'Le nom de la boutique est requis' },
        { status: 400 }
      );
    }

    // Normaliser le nom de la boutique
    let shopDomain = shop.trim().toLowerCase();

    // Ajouter .myshopify.com si nécessaire
    if (!shopDomain.includes('.myshopify.com')) {
      shopDomain = `${shopDomain}.myshopify.com`;
    }

    // Générer un state pour la sécurité CSRF
    const state = crypto.randomBytes(16).toString('hex');

    // URL de callback
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/shopify/callback`;

    // Générer l'URL d'autorisation
    const authUrl = getAuthUrl(shopDomain, redirectUri, state);

    // Stocker le state dans un cookie pour vérification
    const response = NextResponse.json({ authUrl, state });

    response.cookies.set('shopify_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    response.cookies.set('shopify_shop', shopDomain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Shopify auth error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'initialisation de l\'authentification' },
      { status: 500 }
    );
  }
}
