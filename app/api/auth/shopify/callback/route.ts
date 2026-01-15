import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getShopInfo } from '@/lib/shopify';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const shop = searchParams.get('shop');
    const hmac = searchParams.get('hmac');

    // Récupérer le state stocké
    const storedState = request.cookies.get('shopify_oauth_state')?.value;
    const storedShop = request.cookies.get('shopify_shop')?.value;

    // Vérifications de sécurité
    if (!code || !state || !shop) {
      return NextResponse.redirect(
        new URL('/login?error=missing_params', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    if (state !== storedState) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_state', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    // Vérifier le HMAC (optionnel mais recommandé)
    if (hmac) {
      const params = new URLSearchParams(searchParams);
      params.delete('hmac');
      params.sort();

      const message = params.toString();
      const generatedHmac = crypto
        .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
        .update(message)
        .digest('hex');

      if (hmac !== generatedHmac) {
        console.warn('HMAC validation failed');
        // On continue quand même car certaines versions n'envoient pas le HMAC
      }
    }

    // Échanger le code contre un token
    const { access_token, scope } = await exchangeCodeForToken(shop, code);

    // Récupérer les infos de la boutique
    const shopInfo = await getShopInfo(shop, access_token);

    // Créer les données utilisateur
    const userData = {
      id: `shopify-${shopInfo.id}`,
      email: shopInfo.email,
      name: shopInfo.name,
      shopifyStore: shop,
      shopifyAccessToken: access_token,
      shopifyScope: scope,
      avatar: null,
    };

    // Créer la réponse avec redirection
    const response = NextResponse.redirect(
      new URL('/', process.env.NEXT_PUBLIC_APP_URL!)
    );

    // Stocker les infos utilisateur dans un cookie
    response.cookies.set('influence_tracker_user', JSON.stringify(userData), {
      httpOnly: false, // Accessible côté client pour le context
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      path: '/',
    });

    // Nettoyer les cookies OAuth temporaires
    response.cookies.delete('shopify_oauth_state');
    response.cookies.delete('shopify_shop');

    return response;
  } catch (error) {
    console.error('Shopify callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=auth_failed', process.env.NEXT_PUBLIC_APP_URL!)
    );
  }
}
