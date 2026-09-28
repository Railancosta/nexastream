// NexaStream Patronage API Client
// Handles all patronage-related API calls

import { apiBase, authToken } from './api';

const PATRONAGE_API = () => apiBase();

// Tier types
export interface PatronageTier {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  monthlyPriceUsd: number;
  currency: string;
  benefits: PatronageBenefit[];
  isActive: boolean;
  maxPatrons: number;
  currentPatrons?: number;
  createdAt: number;
  updatedAt: number;
}

export interface PatronageBenefit {
  type: string;
  badgeType?: string;
  badgeName?: string;
  name?: string;
  roleName?: string;
  durationMonths?: number;
  [key: string]: any;
}

// Benefit types
export const BENEFIT_TYPES = {
  BADGE: 'badge',
  EARLY_ACCESS: 'early_access',
  COMMUNITY_ROLE: 'community_role',
  EXCLUSIVE_CONTENT: 'exclusive_content',
  LIVE_CHAT_ACCESS: 'live_chat_access',
  CUSTOM_EMOJI: 'custom_emoji',
  CREDITS: 'credits',
  DISCOUNT: 'discount'
} as const;

// Badge types
export const BADGE_TYPES = {
  PATRON: 'patron',
  SUPPORTER: 'supporter',
  VIP: 'vip',
  FOUNDER: 'founder',
  SPONSOR: 'sponsor',
  CUSTOM: 'custom'
} as const;

// Patron types
export interface Patron {
  id: string;
  creatorId: string;
  userId: string;
  username?: string;
  tierId: string;
  tier?: {
    name: string;
    monthlyPriceUsd: number;
  };
  status: string;
  amountUsd: number;
  currency: string;
  startDate: number;
  endDate?: number;
  cancelDate?: number;
  paymentMethod?: string;
  paymentReference?: string;
  billingCycle: string;
  lastPaymentDate?: number;
  nextPaymentDate?: number;
  createdAt: number;
  updatedAt: number;
}

// Badge types
export interface UserBadge {
  id: string;
  userId: string;
  creatorId: string;
  badgeType: string;
  badgeName: string;
  tierId?: string;
  expiresAt?: number;
  isActive: boolean;
  createdAt: number;
}

// Early access types
export interface EarlyAccessContent {
  id: string;
  creatorId: string;
  contentId: string;
  contentType: string;
  title: string;
  description: string;
  accessTierIds: string[];
  releaseDate?: number;
  isPublished: boolean;
  createdAt: number;
}

// Community role types
export interface CommunityRole {
  id: string;
  creatorId: string;
  roleName: string;
  roleDescription: string;
  requiredTierId?: string;
  permissions: string[];
  isActive: boolean;
  createdAt: number;
}

// Creator patronage revenue
export interface CreatorPatronageRevenue {
  creatorId: string;
  totalRevenue: number;
  totalPatrons: number;
  uniquePatrons: number;
  averagePatronage: number;
  period: {
    startDate?: number;
    endDate?: number;
  };
}

// API Headers
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authToken()}`
});

// Tier API

export async function createTier(tierData: {
  creatorId: string;
  name: string;
  description?: string;
  monthlyPriceUsd: number;
  benefits?: PatronageBenefit[];
  maxPatrons?: number;
}): Promise<PatronageTier | { error: string }> {
  try {
    const response = await fetch(PATRONAGE_API() + '/api/patronage/tiers', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(tierData)
    });
    return await response.json();
  } catch (e) {
    return { error: 'Failed to create tier' };
  }
}

export async function getTier(tierId: string): Promise<PatronageTier | { error: string }> {
  try {
    const response = await fetch(PATRONAGE_API() + `/api/patronage/tier?tierId=${tierId}`);
    const data = await response.json();
    return data.tier || { error: 'Tier not found' };
  } catch (e) {
    return { error: 'Failed to fetch tier' };
  }
}

export async function getTiersByCreator(creatorId: string): Promise<PatronageTier[]> {
  try {
    const response = await fetch(PATRONAGE_API() + `/api/patronage/tiers?creatorId=${creatorId}`);
    const data = await response.json();
    return data.tiers || [];
  } catch (e) {
    return [];
  }
}

export async function updateTier(
  tierId: string,
  updates: {
    creatorId: string;
    name?: string;
    description?: string;
    monthlyPriceUsd?: number;
    benefits?: PatronageBenefit[];
    maxPatrons?: number;
    isActive?: boolean;
  }
): Promise<{ success: boolean; tierId: string; updatedAt: number } | { error: string }> {
  try {
    const response = await fetch(PATRONAGE_API() + `/api/patronage/tiers/${tierId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    return await response.json();
  } catch (e) {
    return { error: 'Failed to update tier' };
  }
}

export async function deleteTier(
  tierId: string,
  creatorId: string
): Promise<{ success: boolean; tierId: string } | { error: string }> {
  try {
    const response = await fetch(PATRONAGE_API() + `/api/patronage/tiers/${tierId}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ creatorId })
    });
    return await response.json();
  } catch (e) {
    return { error: 'Failed to delete tier' };
  }
}

// Patronage (Subscription) API

export async function createPatronage(
  userId: string,
  creatorId: string,
  tierId: string,
  paymentInfo?: {
    method?: string;
    reference?: string;
    transactionHash?: string;
    billingCycle?: string;
  }
): Promise<Patron | { error: string }> {
  try {
    const response = await fetch(PATRONAGE_API() + '/api/patronage/subscribe', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userId, creatorId, tierId, paymentInfo })
    });
    return await response.json();
  } catch (e) {
    return { error: 'Failed to create patronage' };
  }
}

export async function getPatronagesByUser(userId: string): Promise<Patron[]> {
  try {
    const response = await fetch(PATRONAGE_API() + `/api/patronage/subscriptions/user/${userId}`);
    const data = await response.json();
    return data.patronages || [];
  } catch (e) {
    return [];
  }
}

export async function getPatronsByCreator(creatorId: string): Promise<Patron[]> {
  try {
    const response = await fetch(PATRONAGE_API() + `/api/patronage/patrons/creator/${creatorId}`);
    const data = await response.json();
    return data.patrons || [];
  } catch (e) {
    return [];
  }
}

export async function cancelPatronage(
  patronId: string,
  userId: string
): Promise<{ success: boolean; patronId: string; status: string; cancelDate: number } | { error: string }> {
  try {
    const response = await fetch(PATRONAGE_API() + `/api/patronage/subscriptions/${patronId}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ userId })
    });
    return await response.json();
  } catch (e) {
    return { error: 'Failed to cancel patronage' };
  }
}

export async function updatePatronage(
  patronId: string,
  userId: string,
  updates: {
    tierId?: string;
    billingCycle?: string;
  }
): Promise<{ success: boolean; patronId: string; updatedAt: number } | { error: string }> {
  try {
    const response = await fetch(PATRONAGE_API() + `/api/patronage/subscriptions/${patronId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ userId, ...updates })
    });
    return await response.json();
  } catch (e) {
    return { error: 'Failed to update patronage' };
  }
}

// Badge API

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  try {
    const response = await fetch(PATRONAGE_API() + `/api/patronage/badges/user/${userId}`);
    const data = await response.json();
    return data.badges || [];
  } catch (e) {
    return [];
  }
}

export async function getBadgesByCreatorAndUser(
  creatorId: string,
  userId: string
): Promise<UserBadge[]> {
  try {
    const response = await fetch(
      PATRONAGE_API() + `/api/patronage/badges/check?userId=${userId}&creatorId=${creatorId}`
    );
    const data = await response.json();
    return data.badges || [];
  } catch (e) {
    return [];
  }
}

// Early Access API

export async function createEarlyAccessContent(
  contentData: {
    creatorId: string;
    contentId: string;
    contentType: string;
    title: string;
    description?: string;
    accessTierIds?: string[];
    releaseDate?: number;
  }
): Promise<EarlyAccessContent | { error: string }> {
  try {
    const response = await fetch(PATRONAGE_API() + '/api/patronage/early-access', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(contentData)
    });
    return await response.json();
  } catch (e) {
    return { error: 'Failed to create early access content' };
  }
}

export async function checkEarlyAccess(
  userId: string,
  contentId: string
): Promise<{ hasAccess: boolean; reason?: string }> {
  try {
    const response = await fetch(
      PATRONAGE_API() + `/api/patronage/early-access/check?userId=${userId}&contentId=${contentId}`
    );
    return await response.json();
  } catch (e) {
    return { hasAccess: false, reason: 'Failed to check access' };
  }
}

// Community Role API

export async function createCommunityRole(
  roleData: {
    creatorId: string;
    roleName: string;
    description?: string;
    requiredTierId?: string;
    permissions?: string[];
  }
): Promise<CommunityRole | { error: string }> {
  try {
    const response = await fetch(PATRONAGE_API() + '/api/patronage/roles', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(roleData)
    });
    return await response.json();
  } catch (e) {
    return { error: 'Failed to create community role' };
  }
}

export async function getCommunityRoles(creatorId: string): Promise<CommunityRole[]> {
  try {
    const response = await fetch(PATRONAGE_API() + `/api/patronage/roles?creatorId=${creatorId}`);
    const data = await response.json();
    return data.roles || [];
  } catch (e) {
    return [];
  }
}

// Revenue API

export async function getCreatorPatronageRevenue(
  creatorId: string,
  startDate?: number,
  endDate?: number
): Promise<CreatorPatronageRevenue> {
  let url = PATRONAGE_API() + `/api/patronage/revenue/creator/${creatorId}`;
  if (startDate) url += `?startDate=${startDate}`;
  if (endDate) url += `${startDate ? '&' : '?'}endDate=${endDate}`;
  
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (e) {
    return {
      creatorId,
      totalRevenue: 0,
      totalPatrons: 0,
      uniquePatrons: 0,
      averagePatronage: 0,
      period: { startDate, endDate }
    };
  }
}

// Patronage info
export async function getPatronageInfo(): Promise<any> {
  try {
    const response = await fetch(PATRONAGE_API() + '/api/patronage/info');
    return await response.json();
  } catch (e) {
    return {};
  }
}

// Helper functions

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount);
}

export function getBadgeDisplayName(badgeType: string): string {
  const displayNames: Record<string, string> = {
    [BADGE_TYPES.PATRON]: 'Patron',
    [BADGE_TYPES.SUPPORTER]: 'Supporter',
    [BADGE_TYPES.VIP]: 'VIP',
    [BADGE_TYPES.FOUNDER]: 'Founder',
    [BADGE_TYPES.SPONSOR]: 'Sponsor',
    [BADGE_TYPES.CUSTOM]: 'Custom'
  };
  return displayNames[badgeType] || badgeType;
}

export function getBenefitDisplayName(benefitType: string): string {
  const displayNames: Record<string, string> = {
    [BENEFIT_TYPES.BADGE]: 'Badge',
    [BENEFIT_TYPES.EARLY_ACCESS]: 'Early Access',
    [BENEFIT_TYPES.COMMUNITY_ROLE]: 'Community Role',
    [BENEFIT_TYPES.EXCLUSIVE_CONTENT]: 'Exclusive Content',
    [BENEFIT_TYPES.LIVE_CHAT_ACCESS]: 'Live Chat Access',
    [BENEFIT_TYPES.CUSTOM_EMOJI]: 'Custom Emoji',
    [BENEFIT_TYPES.CREDITS]: 'Credits',
    [BENEFIT_TYPES.DISCOUNT]: 'Discount'
  };
  return displayNames[benefitType] || benefitType;
}
