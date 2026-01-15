// Utilitaires pour le matching commentateurs Instagram ↔ acheteurs Shopify

interface Commenter {
  username: string;
  fullName: string;
}

interface Buyer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  orderId: string;
  orderTotal: number;
  orderDate: string;
}

interface MatchResult {
  commenterUsername: string;
  commenterFullName: string;
  buyerId: string;
  buyerName: string;
  orderId: string;
  orderTotal: number;
  orderDate: string;
  matchScore: number; // 0-100, plus c'est haut plus c'est sûr
  matchType: 'exact' | 'fuzzy' | 'partial';
}

// Normaliser un nom pour la comparaison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/[^a-z0-9\s]/g, '') // Enlever la ponctuation
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .trim();
}

// Calculer la similarité entre deux strings (Levenshtein-based)
function similarity(str1: string, str2: string): number {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);

  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Vérifier si l'un contient l'autre
  if (s1.includes(s2) || s2.includes(s1)) {
    return 80;
  }

  // Vérifier les mots communs
  const words1 = s1.split(' ').filter(w => w.length > 2);
  const words2 = s2.split(' ').filter(w => w.length > 2);

  const commonWords = words1.filter(w => words2.includes(w));
  if (commonWords.length > 0) {
    return 60 + (commonWords.length * 15);
  }

  // Distance de Levenshtein simplifiée
  const maxLen = Math.max(s1.length, s2.length);
  let distance = 0;
  for (let i = 0; i < maxLen; i++) {
    if (s1[i] !== s2[i]) distance++;
  }

  const levenshteinScore = Math.max(0, 100 - (distance / maxLen) * 100);
  return Math.round(levenshteinScore);
}

// Essayer de matcher un commentateur avec un acheteur
export function matchCommenterWithBuyers(
  commenter: Commenter,
  buyers: Buyer[],
  minScore: number = 60
): MatchResult | null {
  let bestMatch: MatchResult | null = null;
  let bestScore = 0;

  for (const buyer of buyers) {
    const buyerFullName = `${buyer.firstName} ${buyer.lastName}`;

    // Score basé sur le nom complet Instagram vs nom acheteur
    const fullNameScore = similarity(commenter.fullName, buyerFullName);

    // Score basé sur le username (parfois les gens utilisent leur nom)
    const usernameScore = Math.max(
      similarity(commenter.username, buyer.firstName),
      similarity(commenter.username, buyer.lastName),
      similarity(commenter.username, buyerFullName.replace(/\s/g, ''))
    );

    // Score basé sur le prénom dans le email (ex: marie.dupont@gmail.com)
    const emailPrefix = buyer.email.split('@')[0].replace(/[._]/g, ' ');
    const emailScore = similarity(commenter.fullName, emailPrefix);

    // Prendre le meilleur score
    const finalScore = Math.max(fullNameScore, usernameScore * 0.8, emailScore * 0.7);

    if (finalScore > bestScore && finalScore >= minScore) {
      bestScore = finalScore;
      bestMatch = {
        commenterUsername: commenter.username,
        commenterFullName: commenter.fullName,
        buyerId: buyer.id,
        buyerName: buyerFullName,
        orderId: buyer.orderId,
        orderTotal: buyer.orderTotal,
        orderDate: buyer.orderDate,
        matchScore: Math.round(finalScore),
        matchType: finalScore >= 90 ? 'exact' : finalScore >= 70 ? 'fuzzy' : 'partial',
      };
    }
  }

  return bestMatch;
}

// Matcher tous les commentateurs d'un post avec les acheteurs
export function matchAllCommenters(
  commenters: Commenter[],
  buyers: Buyer[],
  minScore: number = 60
): {
  matches: MatchResult[];
  totalCommenters: number;
  matchedCount: number;
  totalMatchedRevenue: number;
} {
  const matches: MatchResult[] = [];
  const matchedOrderIds = new Set<string>();

  for (const commenter of commenters) {
    // Filtrer les acheteurs déjà matchés pour éviter les doublons
    const availableBuyers = buyers.filter(b => !matchedOrderIds.has(b.orderId));
    const match = matchCommenterWithBuyers(commenter, availableBuyers, minScore);

    if (match) {
      matches.push(match);
      matchedOrderIds.add(match.orderId);
    }
  }

  const totalMatchedRevenue = matches.reduce((sum, m) => sum + m.orderTotal, 0);

  return {
    matches,
    totalCommenters: commenters.length,
    matchedCount: matches.length,
    totalMatchedRevenue,
  };
}

// Extraire les acheteurs depuis les commandes Shopify
export function extractBuyersFromOrders(orders: any[]): Buyer[] {
  return orders.map(order => ({
    id: order.customer?.id?.toString() || order.id.toString(),
    firstName: order.customer?.first_name || order.billing_address?.first_name || '',
    lastName: order.customer?.last_name || order.billing_address?.last_name || '',
    email: order.customer?.email || order.email || '',
    orderId: order.id.toString(),
    orderTotal: parseFloat(order.total_price || '0'),
    orderDate: order.created_at,
  })).filter(b => b.firstName || b.lastName); // Exclure les anonymes
}
