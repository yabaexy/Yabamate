export interface Creator {
  id: string;
  address: string;
  name: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  category: string;
  condition: 'New' | 'Trending' | 'Verified';
  tiers: Tier[];
}

export interface Tier {
  id: string;
  name: string;
  price: number; // in WYDA
  period: 'Monthly' | 'Quarterly' | 'Yearly';
  description: string;
  benefits: string[];
}

export interface UserSubscription {
  creatorAddress: string;
  amountPerMonth: bigint;
  totalDeposited: bigint;
  startTime: number;
  lastWithdrawTime: number;
  active: boolean;
}
