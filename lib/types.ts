export interface Campaign {
  id: string;
  name: string;
  product: string;
  sku: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'completed' | 'draft';
  budget: number;
  influencers: string[];
}

export interface Influencer {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  followers: number;
  avgEngagement: number;
  category: string;
  posts: Post[];
  attribution: AttributionData;
}

export interface Post {
  id: string;
  influencerId: string;
  timestamp: Date;
  type: 'reel' | 'post' | 'story' | 'carousel';
  caption: string;
  likes: number;
  comments: number;
  views?: number;
  url: string;
}

export interface Order {
  id: string;
  timestamp: Date;
  amount: number;
  items: string[];
  city: string;
  region: string;
}

export interface AttributionData {
  influencerId: string;
  postId: string;
  ordersAttributed: number;
  revenueAttributed: number;
  liftPercentage: number;
  confidence: 'high' | 'medium' | 'low';
  conversionWindow: number;
}

export interface HourlyMetric {
  hour: Date;
  orders: number;
  revenue: number;
  baseline: number;
  postEvent?: {
    influencerId: string;
    postId: string;
  };
}

export interface DashboardStats {
  totalRevenue: number;
  totalSales: number;
  avgLift: number;
  roas: number;
}

export interface CampaignInsight {
  id: string;
  type: 'performance' | 'timing' | 'content' | 'recommendation';
  title: string;
  description: string;
  metric?: string;
}
