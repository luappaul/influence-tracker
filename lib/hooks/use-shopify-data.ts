'use client';

import { useState, useEffect } from 'react';

export interface ShopifyOrder {
  id: number;
  order_number: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    orders_count: number;
    total_spent: string;
  } | null;
  line_items: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
    product_id: number;
    variant_id: number;
  }>;
  shipping_address?: {
    city: string;
    country: string;
  };
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  handle: string;
  status: string;
  images: Array<{
    id: number;
    src: string;
  }>;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    inventory_quantity: number;
  }>;
}

export interface DailyMetrics {
  date: string;
  followers: number;
  visitors: number;
}

interface UseShopifyDataReturn {
  orders: ShopifyOrder[];
  products: ShopifyProduct[];
  dailyMetrics: DailyMetrics[];
  isLoading: boolean;
  error: string | null;
  isDemo: boolean;
  refetch: () => Promise<void>;
  stats: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    totalProducts: number;
  };
}

// Données de démonstration
function generateDemoData(): { orders: ShopifyOrder[]; products: ShopifyProduct[]; dailyMetrics: DailyMetrics[] } {
  const now = new Date();
  const products: ShopifyProduct[] = [
    { id: 1, title: 'Sérum Vitamine C', body_html: '', vendor: 'BeautyCo', product_type: 'Skincare', created_at: '2024-01-01', handle: 'serum-vitamine-c', status: 'active', images: [], variants: [{ id: 1, title: 'Default', price: '45.00', inventory_quantity: 150 }] },
    { id: 2, title: 'Crème Hydratante', body_html: '', vendor: 'BeautyCo', product_type: 'Skincare', created_at: '2024-01-01', handle: 'creme-hydratante', status: 'active', images: [], variants: [{ id: 2, title: 'Default', price: '38.00', inventory_quantity: 200 }] },
    { id: 3, title: 'Huile de Rose', body_html: '', vendor: 'BeautyCo', product_type: 'Skincare', created_at: '2024-01-01', handle: 'huile-rose', status: 'active', images: [], variants: [{ id: 3, title: 'Default', price: '52.00', inventory_quantity: 80 }] },
    { id: 4, title: 'Masque Purifiant', body_html: '', vendor: 'BeautyCo', product_type: 'Skincare', created_at: '2024-01-01', handle: 'masque-purifiant', status: 'active', images: [], variants: [{ id: 4, title: 'Default', price: '28.00', inventory_quantity: 120 }] },
    { id: 5, title: 'Contour des Yeux', body_html: '', vendor: 'BeautyCo', product_type: 'Skincare', created_at: '2024-01-01', handle: 'contour-yeux', status: 'active', images: [], variants: [{ id: 5, title: 'Default', price: '42.00', inventory_quantity: 90 }] },
    { id: 6, title: 'Eau Micellaire Bio', body_html: '', vendor: 'BeautyCo', product_type: 'Skincare', created_at: '2024-01-01', handle: 'eau-micellaire-bio', status: 'active', images: [], variants: [{ id: 6, title: 'Default', price: '18.00', inventory_quantity: 300 }] },
    { id: 7, title: 'Coffret Routine Complète', body_html: '', vendor: 'BeautyCo', product_type: 'Coffret', created_at: '2024-01-01', handle: 'coffret-routine-complete', status: 'active', images: [], variants: [{ id: 7, title: 'Default', price: '149.00', inventory_quantity: 50 }] },
    { id: 8, title: 'Gommage Doux Visage', body_html: '', vendor: 'BeautyCo', product_type: 'Skincare', created_at: '2024-01-01', handle: 'gommage-doux-visage', status: 'active', images: [], variants: [{ id: 8, title: 'Default', price: '25.00', inventory_quantity: 180 }] },
    { id: 9, title: 'Brume Hydratante', body_html: '', vendor: 'BeautyCo', product_type: 'Skincare', created_at: '2024-01-01', handle: 'brume-hydratante', status: 'active', images: [], variants: [{ id: 9, title: 'Default', price: '22.00', inventory_quantity: 220 }] },
    { id: 10, title: 'Baume Lèvres Nourrissant', body_html: '', vendor: 'BeautyCo', product_type: 'Skincare', created_at: '2024-01-01', handle: 'baume-levres', status: 'active', images: [], variants: [{ id: 10, title: 'Default', price: '12.00', inventory_quantity: 400 }] },
  ];

  const firstNames = ['Marie', 'Sophie', 'Emma', 'Léa', 'Camille', 'Chloé', 'Julie', 'Laura', 'Sarah', 'Alice'];
  const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau'];

  const orders: ShopifyOrder[] = [];
  for (let i = 0; i < 85; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - daysAgo);
    orderDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    const numItems = Math.floor(Math.random() * 3) + 1;
    const lineItems = [];
    let total = 0;

    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 2) + 1;
      const price = parseFloat(product.variants[0].price);
      total += price * qty;
      lineItems.push({
        id: i * 10 + j,
        title: product.title,
        quantity: qty,
        price: product.variants[0].price,
        product_id: product.id,
        variant_id: product.variants[0].id,
      });
    }

    orders.push({
      id: 1000 + i,
      order_number: 1000 + i,
      name: `#${1000 + i}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      created_at: orderDate.toISOString(),
      updated_at: orderDate.toISOString(),
      total_price: total.toFixed(2),
      subtotal_price: total.toFixed(2),
      total_tax: '0.00',
      currency: 'EUR',
      financial_status: Math.random() > 0.1 ? 'paid' : 'pending',
      fulfillment_status: Math.random() > 0.3 ? 'fulfilled' : null,
      customer: {
        id: 100 + i,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        first_name: firstName,
        last_name: lastName,
        orders_count: Math.floor(Math.random() * 5) + 1,
        total_spent: (total * (Math.random() * 3 + 1)).toFixed(2),
      },
      line_items: lineItems,
    });
  }

  // Ajouter des commandes de test spécifiques pour le matching
  const testOrders: ShopifyOrder[] = [
    {
      id: 9999,
      order_number: 9999,
      name: '#9999',
      email: 'cyprien.clermontel@email.com',
      created_at: '2026-01-15T14:30:00.000Z',
      updated_at: '2026-01-15T14:30:00.000Z',
      total_price: '89.00',
      subtotal_price: '89.00',
      total_tax: '0.00',
      currency: 'EUR',
      financial_status: 'paid',
      fulfillment_status: 'fulfilled',
      customer: {
        id: 9999,
        email: 'cyprien.clermontel@email.com',
        first_name: 'Cyprien',
        last_name: 'Clermontel',
        orders_count: 1,
        total_spent: '89.00',
      },
      line_items: [
        {
          id: 99990,
          title: 'Sérum Vitamine C',
          quantity: 1,
          price: '45.00',
          product_id: 1,
          variant_id: 1,
        },
        {
          id: 99991,
          title: 'Crème Hydratante',
          quantity: 1,
          price: '44.00',
          product_id: 2,
          variant_id: 2,
        },
      ],
    },
  ];

  // Ajouter les commandes de test
  orders.push(...testOrders);

  // Trier par date décroissante
  orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Générer les métriques quotidiennes (followers gagnés et visiteurs)
  // avec des pics réalistes simulant l'effet des posts influenceurs
  const dailyMetrics: DailyMetrics[] = [];
  const baseVisitors = 320; // Visiteurs de base par jour

  // Jours avec pics (simule les jours après un post d'influenceur)
  const peakDays = [3, 4, 8, 9, 15, 16, 22, 23]; // Indices des jours avec pics

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayIndex = 30 - i;

    // Est-ce un jour de pic ?
    const isPeakDay = peakDays.includes(dayIndex);
    const isPostPeak = peakDays.includes(dayIndex - 1); // Jour après un pic

    let multiplier = 1;
    if (isPeakDay) {
      multiplier = 2.5 + Math.random() * 1.5; // Pic fort (x2.5 à x4)
    } else if (isPostPeak) {
      multiplier = 1.5 + Math.random() * 0.8; // Retombée (x1.5 à x2.3)
    } else {
      multiplier = 0.8 + Math.random() * 0.4; // Jour normal (x0.8 à x1.2)
    }

    // Followers gagnés ce jour (entre 15 et 200+ en pic)
    const baseFollowersGained = 25;
    const followersGained = Math.round(baseFollowersGained * multiplier + Math.random() * 15);

    // Visiteurs du site (plus variable, 200-1500)
    const visitors = Math.round(baseVisitors * multiplier + Math.random() * 80);

    dailyMetrics.push({
      date: dateStr,
      followers: followersGained,
      visitors: visitors,
    });
  }

  return { orders, products, dailyMetrics };
}

// Helper pour détecter si l'utilisateur est en mode démo
function isDemoUser(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const storedUser = localStorage.getItem('influence-tracker-user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.id === 'demo-user';
    }
  } catch (e) {
    console.error('Error checking demo user:', e);
  }
  return false;
}

// Helper pour vérifier si l'utilisateur a Shopify configuré
function hasShopifyConfigured(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const storedUser = localStorage.getItem('influence-tracker-user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return !!(user.shopifyStore && user.shopifyAccessToken);
    }
  } catch (e) {
    console.error('Error checking Shopify config:', e);
  }
  return false;
}

export function useShopifyData(): UseShopifyDataReturn {
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  // Fetch Instagram follower data
  const fetchInstagramData = async (): Promise<DailyMetrics[]> => {
    try {
      // Check localStorage for Instagram credentials
      let apiUrl = '/api/instagram/insights';
      const instagramConnection = localStorage.getItem('instagram-connection');

      if (instagramConnection) {
        try {
          const connection = JSON.parse(instagramConnection);
          if (connection.access_token && connection.user_id) {
            // Pass token via URL params for non-Supabase users
            apiUrl += `?token=${encodeURIComponent(connection.access_token)}&user_id=${encodeURIComponent(connection.user_id)}`;
          }
        } catch (e) {
          console.log('Error parsing Instagram connection:', e);
        }
      }

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!data.connected && !data.currentFollowers) {
        console.log('Instagram not connected');
        return [];
      }

      // If we have daily followers data from the Insights API
      if (data.dailyFollowers && data.dailyFollowers.length > 0) {
        return data.dailyFollowers.map((d: { date: string; followers: number }) => ({
          date: d.date,
          followers: d.followers,
          visitors: 0,
        }));
      }

      // Fallback: just use current follower count for today
      if (data.currentFollowers) {
        const today = new Date().toISOString().split('T')[0];
        return [{
          date: today,
          followers: data.currentFollowers,
          visitors: 0,
        }];
      }

      return [];
    } catch (err) {
      console.log('Error fetching Instagram data:', err);
      return [];
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    setIsDemo(false);

    // Vérifier si on est en mode démo
    const demoMode = isDemoUser();

    // Si c'est un utilisateur démo, charger les données démo
    if (demoMode) {
      const demoData = generateDemoData();
      setOrders(demoData.orders);
      setProducts(demoData.products);
      setDailyMetrics(demoData.dailyMetrics);
      setIsDemo(true);
      setIsLoading(false);
      return;
    }

    // Pour les utilisateurs réels, toujours essayer de récupérer les données Instagram
    const instagramMetrics = await fetchInstagramData();

    // Si l'utilisateur n'a pas Shopify configuré
    if (!hasShopifyConfigured()) {
      setOrders([]);
      setProducts([]);
      // Utiliser les métriques Instagram si disponibles
      if (instagramMetrics.length > 0) {
        setDailyMetrics(instagramMetrics);
      } else {
        setDailyMetrics([]);
      }
      setIsDemo(false);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch orders and products in parallel (utilisateur réel avec Shopify)
      const [ordersRes, productsRes] = await Promise.all([
        fetch('/api/shopify/orders?limit=250'),
        fetch('/api/shopify/products?limit=250'),
      ]);

      if (!ordersRes.ok || !productsRes.ok) {
        console.log('Shopify API failed');
        setError('Erreur de connexion à Shopify');
        setOrders([]);
        setProducts([]);
        // Utiliser quand même les données Instagram si disponibles
        if (instagramMetrics.length > 0) {
          setDailyMetrics(instagramMetrics);
        }
        return;
      }

      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();

      setOrders(ordersData.orders || []);
      setProducts(productsData.products || []);

      // Merge Instagram metrics with any Shopify visitor data
      // For now, just use Instagram followers data
      if (instagramMetrics.length > 0) {
        setDailyMetrics(instagramMetrics);
      }
    } catch (err) {
      console.log('Error fetching Shopify data:', err);
      setError('Erreur de connexion à Shopify');
      setOrders([]);
      setProducts([]);
      // Utiliser quand même les données Instagram si disponibles
      if (instagramMetrics.length > 0) {
        setDailyMetrics(instagramMetrics);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate stats
  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalProducts = products.length;

  return {
    orders,
    products,
    dailyMetrics,
    isLoading,
    error,
    isDemo,
    refetch: fetchData,
    stats: {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalProducts,
    },
  };
}
