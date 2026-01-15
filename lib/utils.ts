import { format, formatDistanceToNow, differenceInDays, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace('.0', '') + 'K';
  }
  return num.toString();
}

export function formatPercentage(value: number, showSign = true): string {
  const formatted = Math.round(value).toString();
  if (showSign && value > 0) {
    return `+${formatted}%`;
  }
  return `${formatted}%`;
}

export function formatDate(date: Date): string {
  return format(date, 'd MMM yyyy', { locale: fr });
}

export function formatDateTime(date: Date): string {
  return format(date, 'd MMM yyyy à HH:mm', { locale: fr });
}

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

export function formatHour(date: Date): string {
  return format(date, 'HH:mm', { locale: fr });
}

export function getDaysRemaining(endDate: Date): number {
  return Math.max(0, differenceInDays(endDate, new Date()));
}

export function getDaysSinceStart(startDate: Date): number {
  return differenceInDays(new Date(), startDate);
}

export function getHoursSince(date: Date): number {
  return differenceInHours(new Date(), date);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getConfidenceLevel(confidence: 'high' | 'medium' | 'low'): {
  label: string;
  dots: number;
  color: string;
} {
  switch (confidence) {
    case 'high':
      return { label: 'Élevée', dots: 4, color: 'text-success' };
    case 'medium':
      return { label: 'Moyenne', dots: 3, color: 'text-accent' };
    case 'low':
      return { label: 'Faible', dots: 2, color: 'text-foreground-secondary' };
  }
}

export function getPerformanceBadge(roas: number): {
  emoji: string;
  label: string;
  color: string;
} {
  if (roas >= 2.5) {
    return { emoji: '🥇', label: 'Top performer', color: 'bg-accent-light text-accent' };
  }
  if (roas >= 1.5) {
    return { emoji: '🥈', label: 'Bon performer', color: 'bg-green-50 text-success' };
  }
  if (roas >= 1.0) {
    return { emoji: '🥉', label: 'Performer moyen', color: 'bg-gray-100 text-foreground-secondary' };
  }
  return { emoji: '⚠️', label: 'Sous-performer', color: 'bg-red-50 text-danger' };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
