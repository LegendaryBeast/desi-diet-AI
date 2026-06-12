/**
 * Business Dashboard Admin API Client
 * Auth is handled client-side with a hardcoded password.
 * Data fetching tries the backend and returns empty results if unavailable.
 */

// ── Default admin password (no backend / env var needed) ──────────
const DEFAULT_ADMIN_PASSWORD = 'desidiet_admin_2026';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const ADMIN_PASSWORD_KEY = 'desidiet_admin_password';

export const getAdminPassword = (): string | null => sessionStorage.getItem(ADMIN_PASSWORD_KEY);
export const setAdminPassword = (pw: string) => sessionStorage.setItem(ADMIN_PASSWORD_KEY, pw);
export const clearAdminPassword = () => sessionStorage.removeItem(ADMIN_PASSWORD_KEY);

class AdminApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AdminApiError';
  }
}

async function adminFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const password = getAdminPassword();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (password) {
    headers['X-Admin-Password'] = password;
  }

  try {
    const res = await fetch(`${BASE_URL}/admin-api${path}`, { ...options, headers });

    if (res.status === 401 || res.status === 403) {
      clearAdminPassword();
      throw new AdminApiError(res.status, 'Admin authentication required');
    }

    if (!res.ok) {
      let detail = 'An error occurred';
      try {
        const err = await res.json();
        detail = err.detail || detail;
      } catch { /* ignore */ }
      throw new AdminApiError(res.status, detail);
    }

    if (res.status === 204) return undefined as unknown as T;
    return res.json();
  } catch (err) {
    // Backend not available — return a typed empty shell so the UI doesn't crash
    if (err instanceof AdminApiError) throw err;
    console.warn(`[AdminAPI] Backend unavailable for ${path}. Returning empty data.`);
    return { data: [], total: 0, skip: 0, limit: 20 } as unknown as T;
  }
}

// ─── Auth (client-side, no backend required) ──────────────────────

export async function adminAuth(password: string): Promise<{ success: boolean }> {
  const correct = password === DEFAULT_ADMIN_PASSWORD;
  if (!correct) throw new Error('Invalid password');
  setAdminPassword(password);
  return { success: true };
}

// ─── Overview ─────────────────────────────────────────────────────

export interface OverviewKPIs {
  total_users: number;
  new_users_7d: number;
  new_users_30d: number;
  active_subscriptions: number;
  mrr_bdt: number;
  total_tokens_today: number;
  total_cost_today_usd: number;
  churn_rate_pct: number;
  grocery_clicks_today: number;
}

export async function getOverview(): Promise<OverviewKPIs> {
  return adminFetch('/overview');
}

// ─── Users ────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  phone: string | null;
  email: string | null;
  role: string;
  language: string;
  created_at: string;
  name_bn: string | null;
  name_en: string | null;
  tier: string;
  subscription_status: string | null;
  total_tokens_used: number;
}

export async function listUsers(params?: { search?: string; tier?: string; status?: string; skip?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.tier) query.set('tier', params.tier);
  if (params?.status) query.set('status', params.status);
  if (params?.skip !== undefined) query.set('skip', String(params.skip));
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  return adminFetch<{ data: AdminUser[]; total: number; skip: number; limit: number }>(`/users?${query}`);
}

export interface UserDetail {
  id: string;
  phone: string | null;
  email: string | null;
  role: string;
  language: string;
  created_at: string;
  profile: {
    name_bn: string | null;
    name_en: string | null;
    age: number | null;
    gender: string | null;
    weight_kg: number | null;
    height_cm: number | null;
    activity_level: string | null;
    goal: string | null;
  } | null;
  subscriptions: Array<{
    id: string;
    plan_name: string | null;
    tier: string | null;
    status: string;
    started_at: string | null;
    current_period_end: string | null;
    mrr_bdt: number;
    payment_method: string | null;
  }>;
  total_tokens_used: number;
  recent_token_usages: Array<{ date: string | null; feature: string; total_tokens: number }>;
  grocery_suggestions: Array<{
    id: string;
    item_name: string;
    platform: string;
    price_bdt: number | null;
    clicked_at: string | null;
    purchased_at: string | null;
  }>;
}

export async function getUserDetail(userId: string): Promise<UserDetail> {
  return adminFetch(`/users/${userId}`);
}

export async function updateUserTier(userId: string, tier: string) {
  return adminFetch(`/users/${userId}/update-tier`, {
    method: 'POST',
    body: JSON.stringify({ tier }),
  });
}

// ─── Subscriptions ────────────────────────────────────────────────

export interface AdminSubscription {
  id: string;
  user_id: string;
  user_phone: string | null;
  user_email: string | null;
  plan_name: string | null;
  tier: string | null;
  status: string;
  started_at: string | null;
  current_period_end: string | null;
  mrr_bdt: number;
  payment_method: string | null;
  auto_renew: boolean;
}

export async function listSubscriptions(params?: { status?: string; skip?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.skip !== undefined) query.set('skip', String(params.skip));
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  return adminFetch<{ data: AdminSubscription[]; total: number; skip: number; limit: number }>(`/subscriptions?${query}`);
}

// ─── Plans ────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: string;
  price_monthly_bdt: number;
  price_yearly_bdt: number;
  features: string[];
  ai_token_quota: number;
  max_saved_meals: number;
  max_family_members: number;
  is_active: boolean;
}

export async function listPlans(): Promise<SubscriptionPlan[]> {
  return adminFetch('/plans');
}

export async function updatePlan(planId: string, payload: Partial<SubscriptionPlan>) {
  return adminFetch(`/plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ─── Token Usage ──────────────────────────────────────────────────

export async function getTokenUsage(params?: { user_id?: string; feature?: string; days?: number }) {
  const query = new URLSearchParams();
  if (params?.user_id) query.set('user_id', params.user_id);
  if (params?.feature) query.set('feature', params.feature);
  if (params?.days !== undefined) query.set('days', String(params.days));
  return adminFetch(`/token-usage?${query}`);
}

// ─── AI Usage ─────────────────────────────────────────────────────

export async function getAiUsage(days?: number) {
  const query = new URLSearchParams();
  if (days !== undefined) query.set('days', String(days));
  return adminFetch(`/ai-usage?${query}`);
}

// ─── Grocery Suggestions ──────────────────────────────────────────

export interface GrocerySuggestionItem {
  id: string;
  user_id: string;
  user_phone: string | null;
  item_name: string;
  platform: string;
  price_bdt: number | null;
  clicked_at: string | null;
  purchased_at: string | null;
}

export async function listGrocerySuggestions(params?: { platform?: string; days?: number; skip?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.platform) query.set('platform', params.platform);
  if (params?.days !== undefined) query.set('days', String(params.days));
  if (params?.skip !== undefined) query.set('skip', String(params.skip));
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  return adminFetch<{
    data: GrocerySuggestionItem[];
    total: number;
    platform_breakdown: Record<string, { clicks: number; purchases: number; revenue_potential: number }>;
    skip: number;
    limit: number;
  }>(`/grocery-suggestions?${query}`);
}

// ─── Access Logs ──────────────────────────────────────────────────

export async function getAccessLogs(params?: { skip?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.skip !== undefined) query.set('skip', String(params.skip));
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  return adminFetch(`/access-logs?${query}`);
}
