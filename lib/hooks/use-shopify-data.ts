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

interface UseShopifyDataReturn {
  orders: ShopifyOrder[];
  products: ShopifyProduct[];
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
function generateDemoData(): { orders: ShopifyOrder[]; products: ShopifyProduct[] } {
  const now = new Date();
  const products: ShopifyProduct[] = [
    { id: 1, title: 'Sérum Vitamine C', body_html: '', vendor: 'BeautyCo', product_type: 'Skincare', created_at: '2024-01-01', handle: 'serum-vitamine-c', status: 'active', images: [], variants: [{ id: 1, title: 'Default', price: '45.00', inventory_quantity: 150 }] },
    { id: 2, title: 'Crème Hydratante', body_html: '', vendor: 'BeautyCo', product_type: 'Skincare', created_at: '2024-01-01', handle: 'creme-hydratante', status: 'active', images: [], variants: [{ id: 2, title: 'Default', price: '38.00', inventory_quantity: 200 }] },
    { id: 3, title: 'Huile de Rose', body_html: '', vendor: 'BeautyCo', product_type: 'Skincare', created_at: '2024-01-01', handle: 'huile-rose', status: 'active', images: [], variants: [{ id: 3, title: 'Default', price: '52.00', inventory_quantity: 80 }] },
    { id: 4, title: 'Masque Purifiant', body_html: '', vendor: 'BeautyCo', product_type: 'Skincare', created_at: '2024-01-01', handle: 'masque-purifiant', status: 'active', images: [], variants: [{ id: 4, title: 'Default', price: '28.00', inventory_quantity: 120 }] },
    { id: 5, title: 'Contour des Yeux', body_html: '', vendor: 'BeautyCo', product_type: 'Skincare', created_at: '2024-01-01', handle: 'contour-yeux', status: 'active', images: [], variants: [{ id: 5, title: 'Default', price: '42.00', inventory_quantity: 90 }] },
  ];

  const firstNames = ['Marie', 'Sophie', 'Emma', 'Léa', 'Camille', 'Chloé', 'Julie', 'Laura', 'Sarah', 'Alice'];
  const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau'];

  const orders: ShopifyOrder[] = [];
  for (let i = 0; i < 47; i++) {
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

  return { orders, products };
}

export function useShopifyData(): UseShopifyDataReturn {
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    setIsDemo(false);

    try {
      // Fetch orders and products in parallel
      const [ordersRes, productsRes] = await Promise.all([
        fetch('/api/shopify/orders?limit=250'),
        fetch('/api/shopify/products?limit=250'),
      ]);

      if (!ordersRes.ok || !productsRes.ok) {
        // Fallback to demo data
        console.log('Shopify API failed, using demo data');
        const demoData = generateDemoData();
        setOrders(demoData.orders);
        setProducts(demoData.products);
        setIsDemo(true);
        return;
      }

      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();

      setOrders(ordersData.orders || []);
      setProducts(productsData.products || []);
    } catch (err) {
      // Fallback to demo data on any error
      console.log('Error fetching Shopify data, using demo data:', err);
      const demoData = generateDemoData();
      setOrders(demoData.orders);
      setProducts(demoData.products);
      setIsDemo(true);
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
