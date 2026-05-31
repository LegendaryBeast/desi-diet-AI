/**
 * DesiDiet API Client
 * Connects to the FastAPI backend running on http://localhost:8000
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

// ─── Token Management ─────────────────────────────────────────────────────────

export const getToken = (): string | null => localStorage.getItem('desidiet_access_token');
export const getRefreshToken = (): string | null => localStorage.getItem('desidiet_refresh_token');

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('desidiet_access_token', access);
  localStorage.setItem('desidiet_refresh_token', refresh);
};

export const clearTokens = () => {
  localStorage.removeItem('desidiet_access_token');
  localStorage.removeItem('desidiet_refresh_token');
};

export const isAuthenticated = (): boolean => !!getToken();

// ─── Base Fetch Helper ─────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retried = false
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && !retried) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (refreshRes.ok) {
          const tokens = await refreshRes.json();
          setTokens(tokens.access_token, tokens.refresh_token);
          return apiFetch<T>(path, options, true);
        }
      } catch {
        // refresh failed
      }
    }
    clearTokens();
    window.dispatchEvent(new Event('auth:logout'));
    throw new ApiError(401, 'Unauthorized');
  }

  if (!res.ok) {
    let detail = 'An error occurred';
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch { /* ignore */ }
    throw new ApiError(res.status, detail);
  }

  // Some endpoints return 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MeResponse {
  id: string;
  phone: string | null;
  email: string | null;
  language: string;
  createdAt: string;
}

export const authApi = {
  register: (data: { phone?: string; email?: string; password: string; language?: string }) =>
    apiFetch<TokenResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { identifier: string; password: string }) =>
    apiFetch<TokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  refresh: (refresh_token: string) =>
    apiFetch<TokenResponse>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token }) }),

  me: () => apiFetch<MeResponse>('/auth/me'),
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface ProfileResponse {
  user_id: string;
  name_bn: string | null;
  name_en: string | null;
  age: number | null;
  gender: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  activity_level: string | null;
  goal: string | null;
  medical_conditions: string[] | null;
  preferred_foods: string[] | null;
  disliked_foods: string[] | null;
  updated_at: string;
}

export interface NutritionTargetsResponse {
  bmi: number;
  bmi_category: string;
  ideal_body_weight_kg: number;
  target_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  water_l: number;
}

export interface ProfileWithTargetsResponse {
  profile: ProfileResponse;
  targets: NutritionTargetsResponse;
}

export const profileApi = {
  get: () => apiFetch<ProfileWithTargetsResponse>('/profile'),

  create: (data: Partial<{
    name_bn: string; name_en: string; age: number; gender: string;
    weight_kg: number; height_cm: number; activity_level: string; goal: string;
    medical_conditions: string[]; preferred_foods: string[]; disliked_foods: string[];
  }>) => apiFetch<ProfileResponse>('/profile', { method: 'POST', body: JSON.stringify(data) }),

  update: (data: Partial<{
    name_bn: string; name_en: string; age: number; gender: string;
    weight_kg: number; height_cm: number; activity_level: string; goal: string;
    medical_conditions: string[]; preferred_foods: string[]; disliked_foods: string[];
  }>) => apiFetch<ProfileResponse>('/profile', { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Health Log ───────────────────────────────────────────────────────────────

export interface HealthLogResponse {
  log_id: string;
  user_id: string;
  log_date: string;
  weight_kg: number | null;
  blood_pressure: string | null;
  blood_sugar: number | null;
  hba1c: number | null;
  notes: string | null;
  symptoms: string[] | null;
  created_at: string;
}

export interface HealthTrendsResponse {
  weight_trend: {
    data_points: number;
    latest_kg: number | null;
    change_kg: number | null;
    history: [string, number][];
  };
  blood_sugar_trend: {
    data_points: number;
    history: [string, number][];
  };
}

export const healthLogApi = {
  create: (data: {
    log_date?: string; weight_kg?: number; blood_pressure?: string;
    blood_sugar?: number; hba1c?: number; notes?: string; symptoms?: string[];
  }) => apiFetch<HealthLogResponse>('/health-logs', { method: 'POST', body: JSON.stringify(data) }),

  list: (limit = 30) => apiFetch<HealthLogResponse[]>(`/health-logs?limit=${limit}`),

  trends: () => apiFetch<HealthTrendsResponse>('/health-logs/trends'),
};

// ─── Meal Plan ────────────────────────────────────────────────────────────────

export interface MealPlanResponse {
  plan_id: string;
  user_id: string;
  plan_date: string;
  plan_type: string;
  plan_data: Record<string, unknown>;
  calorie_target: number;
  ai_suggestion_cal: number | null;
  user_choice_cal: number | null;
  language: string;
  feedback: number | null;
  completed_slots: string[];
  created_at: string;
}

export interface MarkSlotCompleteResponse {
  plan_id: string;
  completed_slots: string[];
  message: string;
}

export const mealPlanApi = {
  getDaily: (language = 'bn', offset = 0, force = false) =>
    apiFetch<MealPlanResponse>(`/meal-plans/daily?language=${language}&offset=${offset}&force=${force}`),

  getWeekly: (language = 'bn') =>
    apiFetch<MealPlanResponse[]>(`/meal-plans/weekly?language=${language}`),

  getHistory: (limit = 30) =>
    apiFetch<MealPlanResponse[]>(`/meal-plans/history?limit=${limit}`),

  submitFeedback: (planId: string, feedback: number) =>
    apiFetch<{ message: string; feedback: number }>(`/meal-plans/${planId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    }),

  markSlotComplete: (planId: string, slot: string, completed = true) =>
    apiFetch<MealPlanResponse>(`/meal-plans/${planId}/mark-complete`, {
      method: 'PATCH',
      body: JSON.stringify({ slot, completed }),
    }),

  editPlan: (planId: string, plan_data: any, user_choice_cal: number) =>
    apiFetch<MealPlanResponse>(`/meal-plans/${planId}/edit`, {
      method: 'PATCH',
      body: JSON.stringify({ plan_data, user_choice_cal }),
    }),
};

// ─── Chat (SSE Streaming) ─────────────────────────────────────────────────────

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
  groceryData?: Record<string, unknown> | null;
}

export const chatApi = {
  history: () => apiFetch<ChatHistoryItem[]>('/chat/history'),
  /**
   * Stream chat response via SSE.
   * onToken: called for each streaming token
   * onDone: called when stream ends
   * onError: called on error
   */
  stream: (
    message: string,
    language: string,
    history: ChatHistoryItem[],
    onToken: (token: string) => void,
    onDone: () => void,
    onError: (err: string) => void,
    options?: { imageDataUrl?: string; lat?: number; lng?: number },
    onMealLogged?: (meal: MealTrackingResponse) => void,
    onGrocerySuggestions?: (data: Record<string, unknown>) => void,
    onAction?: (action: Record<string, unknown>) => void,
    onToolResult?: (result: Record<string, unknown>) => void,
  ): (() => void) => {
    const token = getToken();
    const ctrl = new AbortController();
    let finished = false;

    const finish = () => {
      if (!finished) {
        finished = true;
        onDone();
      }
    };

    fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        language,
        history,
        ...(options?.imageDataUrl ? { image_data_url: options.imageDataUrl } : {}),
        ...(options?.lat != null ? { lat: options.lat } : {}),
        ...(options?.lng != null ? { lng: options.lng } : {}),
      }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          onError('Failed to connect to AI');
          return;
        }
        if (!res.body) {
          onError('AI response stream was empty');
          finish();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) onToken(data.token);
                if (data.meal_logged && onMealLogged) onMealLogged(data.meal_logged);
                if (data.grocery_suggestions && onGrocerySuggestions) onGrocerySuggestions(data.grocery_suggestions);
                if (data.action && onAction) onAction(data.action);
                if (data.tool_result && onToolResult) onToolResult(data.tool_result);
                if (data.done) finish();
                if (data.error) onError(data.error);
              } catch { /* ignore parse errors */ }
            }
          }
        }

        buffer += decoder.decode();
        if (buffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.slice(6));
            if (data.token) onToken(data.token);
            if (data.meal_logged && onMealLogged) onMealLogged(data.meal_logged);
            if (data.grocery_suggestions && onGrocerySuggestions) onGrocerySuggestions(data.grocery_suggestions);
            if (data.done) finish();
            if (data.error) onError(data.error);
          } catch { /* ignore parse errors */ }
        }
        finish();
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          onError(err.message);
          finish();
        }
      });

    return () => ctrl.abort();
  },

  /**
   * Stream diet plan session SSE.
   */
  dietPlanStream: (
    message: string,
    language: string,
    history: ChatHistoryItem[],
    collected: Record<string, unknown>,
    onToken: (token: string) => void,
    onDone: () => void,
    onPlanReady: (plan: Record<string, unknown>) => void,
    onError: (err: string) => void,
    onGrocerySuggestions?: (data: Record<string, unknown>) => void,
    lat?: number,
    lng?: number,
  ): (() => void) => {
    const token = getToken();
    const ctrl = new AbortController();
    let finished = false;

    const finish = () => {
      if (!finished) {
        finished = true;
        onDone();
      }
    };

    fetch(`${BASE_URL}/chat/diet-plan-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, language, history, collected, lat, lng }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          onError('Failed to connect to AI');
          return;
        }
        if (!res.body) {
          onError('AI response stream was empty');
          finish();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) onToken(data.token);
                if (data.done) finish();
                if (data.plan_ready) onPlanReady(data.plan_ready);
                if (data.grocery_suggestions && onGrocerySuggestions) {
                  onGrocerySuggestions(data.grocery_suggestions);
                }
                if (data.error) onError(data.error);
              } catch { /* ignore */ }
            }
          }
        }

        buffer += decoder.decode();
        if (buffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.slice(6));
            if (data.token) onToken(data.token);
            if (data.done) finish();
            if (data.plan_ready) onPlanReady(data.plan_ready);
            if (data.grocery_suggestions && onGrocerySuggestions) {
              onGrocerySuggestions(data.grocery_suggestions);
            }
            if (data.error) onError(data.error);
          } catch { /* ignore */ }
        }
        finish();
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          onError(err.message);
          finish();
        }
      });

    return () => ctrl.abort();
  },

  /**
   * Mint an OpenAI Realtime ephemeral session via our backend.
   * The browser will then open a WebRTC peer connection directly to OpenAI.
   */
  realtimeSession: (opts: { voice?: string; language?: string } = {}) =>
    apiFetch<RealtimeSession>('/chat/realtime/session', {
      method: 'POST',
      body: JSON.stringify({
        voice: opts.voice ?? 'alloy',
        language: opts.language ?? '',
      }),
    }),

  /** Transcribe a recorded audio Blob to text via OpenAI Whisper / GPT-4o-transcribe. */
  transcribe: async (audio: Blob, language?: string): Promise<{ text: string }> => {
    const token = getToken();
    const ext = audio.type.includes('webm') ? 'webm'
      : audio.type.includes('mp4') ? 'mp4'
      : audio.type.includes('ogg') ? 'ogg'
      : audio.type.includes('wav') ? 'wav'
      : 'webm';
    const form = new FormData();
    form.append('file', audio, `recording.${ext}`);
    if (language) form.append('language', language);

    const res = await fetch(`${BASE_URL}/chat/transcribe`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      let detail = 'Transcription failed';
      try { detail = (await res.json()).detail || detail; } catch { /* ignore */ }
      throw new ApiError(res.status, detail);
    }
    return res.json();
  },
};

export interface RealtimeSession {
  /** GA shape: top-level ephemeral bearer (e.g. "ek_..."). */
  value: string;
  expires_at: number;
  session: {
    id?: string;
    model: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ─── Foods ────────────────────────────────────────────────────────────────────

export interface FoodSearchResponse {
  code: string;
  name_en: string;
  name_bn: string;
  calories: number | null;
  protein: number | null;
  food_group: string;
}

export interface SafeFoodsResponse {
  code: string;
  name_en: string;
  name_bn: string;
  calories: number | null;
  protein: number | null;
  fiber: number | null;
  food_group: string;
  preference_score: number;
}

export interface FoodDetailResponse {
  code: string;
  name_en: string;
  name_bn: string;
  food_group: string;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
  rules: { action: string; condition: string; reason: string }[];
}

export interface FoodWithInsightResponse {
  code: string;
  name_en: string;
  name_bn: string;
  calories: number | null;
  protein: number | null;
  fiber: number | null;
  fat: number | null;
  carbs: number | null;
  food_group: string;
  safety: 'safe' | 'caution' | 'avoid';
  ai_insight: string;
}

export const foodsApi = {
  search: (q: string) =>
    apiFetch<FoodSearchResponse[]>(`/foods/search?q=${encodeURIComponent(q)}`),

  safeFoods: () => apiFetch<SafeFoodsResponse[]>('/foods/safe-foods'),

  detail: (code: string) =>
    apiFetch<FoodDetailResponse>(`/foods/${encodeURIComponent(code)}`),

  justify: (code: string, name?: string) =>
    apiFetch<{ explanation: string }>(
      `/foods/${encodeURIComponent(code)}/justify${name ? `?name=${encodeURIComponent(name)}` : ''}`
    ),

  alternatives: (code: string) =>
    apiFetch<any[]>(`/foods/${encodeURIComponent(code)}/alternatives`),

  searchWithInsight: (q: string, slot = 'any') =>
    apiFetch<FoodWithInsightResponse[]>(
      `/foods/search-with-insight?q=${encodeURIComponent(q)}&slot=${slot}`
    ),
};

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface NutritionReport {
  user_id: string;
  targets: NutritionTargetsResponse;
  latest_health_log: {
    weight_kg: number | null;
    blood_sugar: number | null;
    blood_pressure: string | null;
  };
  applicable_rules: { condition: string; food: string; action: string; reason: string }[];
}

export interface ConditionsReport {
  conditions: string[];
  rules: { condition: string; food: string; action: string; reason: string }[];
}

export interface HealthSummaryReport {
  period_days: number;
  days_with_data: number;
  adherence_pct: number;
  avg_daily_calories: number;
  target_calories: number;
  targets: Record<string, number>;
  calorie_history: Array<{
    date: string;
    calories_consumed: number;
    calories_target: number;
    completed_slots: number;
    total_slots: number;
  }>;
  weight_history: Array<{ date: string; weight_kg: number }>;
  macro_summary: {
    protein_g: number; carbs_g: number; fat_g: number; fiber_g: number;
    target_protein_g: number; target_carbs_g: number; target_fat_g: number;
  };
  pie_data: Array<{ name: string; name_en: string; value: number; grams: number; color: string }>;
  micronutrient_targets: Array<{
    name: string; name_bn: string; target: number; consumed: number; unit: string; percentage: number;
  }>;
  current_weight_kg: number;
  clinical_insights?: Array<{
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error';
    reference?: string;
    disease?: string;
  }>;
  ai_verdict?: string;
}

export const reportsApi = {
  nutrition: () => apiFetch<NutritionReport>('/reports/nutrition'),

  conditions: () => apiFetch<ConditionsReport>('/reports/conditions'),

  sendEmail: (email: string, language = 'en') =>
    apiFetch<{ message: string; email: string; report_summary: string }>('/reports/send-email', {
      method: 'POST',
      body: JSON.stringify({ email, language }),
    }),

  healthSummary: (days: number, weightKg?: number) => {
    const params = new URLSearchParams({ days: String(days) });
    if (weightKg) params.set('weight_kg', String(weightKg));
    return apiFetch<HealthSummaryReport>(`/reports/health-summary?${params}`);
  },
};

// ─── Meal Tracking ────────────────────────────────────────────────────────────

export interface ParsedFoodItem {
  name: string;
  amount_g: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealTrackingResponse {
  id: string;
  parsed_items: ParsedFoodItem[];
  total_calories: number;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  ai_feedback: string;
  meal_slot: string | null;
  logged_at: string;
}

export interface MealTrackingListItem {
  id: string;
  input_text: string;
  total_calories: number;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  meal_slot: string | null;
  logged_at: string;
}

export const mealTrackingApi = {
  log: (data: {
    input: string;
    meal_slot?: string;
    language?: string;
    direct_calories?: number;
    direct_protein?: number;
    direct_carbs?: number;
    direct_fat?: number;
    direct_name?: string;
    direct_amount_g?: number;
    strict_mode?: boolean;
    preview?: boolean;
    is_manual?: boolean;
  }) =>
    apiFetch<MealTrackingResponse>('/meal-tracking', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Identify foods from a photo with vision LLM and create a meal log entry. */
  logFromImage: async (
    file: Blob | File,
    opts: { meal_slot?: string; language?: string; food_name?: string; quantity_g?: number; preview?: boolean } = {},
  ): Promise<MealTrackingResponse> => {
    const token = getToken();
    const form = new FormData();
    const filename = (file as File).name || 'meal-photo.jpg';
    form.append('file', file, filename);
    if (opts.meal_slot) form.append('meal_slot', opts.meal_slot);
    if (opts.language) form.append('language', opts.language);
    if (opts.food_name) form.append('food_name', opts.food_name);
    if (opts.quantity_g != null) form.append('quantity_g', String(opts.quantity_g));
    if (opts.preview != null) form.append('preview', String(opts.preview));

    const res = await fetch(`${BASE_URL}/meal-tracking/from-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      let detail = 'Image meal log failed';
      try { detail = (await res.json()).detail || detail; } catch { /* ignore */ }
      throw new ApiError(res.status, detail);
    }
    return res.json();
  },

  today: () => apiFetch<MealTrackingListItem[]>('/meal-tracking/today'),
  delete: (logId: string) =>
    apiFetch<{ message: string }>(`/meal-tracking/${logId}`, {
      method: 'DELETE',
    }),
};

// ─── Medicine Reminders ───────────────────────────────────────────────────────

export interface MedicineItem {
  name: string;
  dose: string;
  times: string[];
  with_food: boolean;
  notes: string | null;
}

export interface MedicineReminderResponse {
  id: string;
  medicines: MedicineItem[];
  confirmation: string;
}

export interface MedicineReminderListItem {
  id: string;
  name: string;
  dose: string;
  times: string[];
  with_food: boolean;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export const medicineApi = {
  add: (data: { input: string; language?: string }) =>
    apiFetch<MedicineReminderResponse>('/medicine-reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () => apiFetch<MedicineReminderListItem[]>('/medicine-reminders'),

  delete: (id: string) =>
    apiFetch<{ message: string; id: string }>(`/medicine-reminders/${id}`, {
      method: 'DELETE',
    }),
};

// ─── Meal Builder ─────────────────────────────────────────────────────────────

export interface MealBuilderItem {
  food_code: string;
  amount_g: number;
  name_en?: string;
  name_bn?: string;
}

export interface MealBuilderAnalyzeResponse {
  total_calories: number;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  vs_plan_target: {
    slot_target_kcal: number | null;
    difference?: number;
    within_range?: boolean;
    note?: string;
  };
  condition_safety: {
    safe: boolean;
    flags: string[];
    note?: string;
  };
  ai_insight: string;
  comparison: {
    before: Record<string, number>;
    after: Record<string, number>;
    verdict: string;
  } | null;
  meal_score: {
    balance?: number;
    protein_adequacy?: number;
    condition_safety?: number;
    overall: number;
    label: string;
  };
}

export const mealBuilderApi = {
  analyze: (data: {
    meal_slot?: string;
    items: MealBuilderItem[];
    replaced_item?: MealBuilderItem;
    language?: string;
  }) =>
    apiFetch<MealBuilderAnalyzeResponse>('/meal-builder/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Live Docs Module ─────────────────────────────────────────────────────────

export interface TeamMember {
  name: string;
  role: string;
  email: string;
  image_url?: string;
}

export interface DocSection {
  id: string;
  title: string;
  content: string;
  category: 'pitch' | 'tech';
  order_index: number;
}

export interface DocsConfigResponse {
  visible: boolean;
  is_admin: boolean;
  start_date: string;
  end_date: string;
  override_schedule: boolean;
  visibility: boolean;
  team_name: string;
  team_members: TeamMember[];
  sections: DocSection[];
}

export interface LiveStatsResponse {
  timestamp: string;
  database_counts: {
    registered_patients: number;
    patient_health_logs: number;
    custom_meal_plans_generated: number;
    ai_consultation_turns: number;
    tracked_meals_logged: number;
    prescribed_medicine_reminders: number;
  };
  knowledge_graph: {
    status: 'connected' | 'disconnected';
    food_nodes_loaded: number;
    clinical_disease_nodes: number;
  };
  api_exposures: { path: string; method: string; desc: string }[];
}

export const docsApi = {
  getConfig: () => apiFetch<DocsConfigResponse>('/docs-api/config'),
  getLiveStats: () => apiFetch<LiveStatsResponse>('/docs-api/live-stats'),
  updateSettings: (data: {
    visibility: boolean;
    override_schedule: boolean;
    start_date: string;
    end_date: string;
  }) => apiFetch<{ message: string; visible_now: boolean }>('/docs-api/admin/settings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateSection: (data: { id: string; title: string; content: string }) =>
    apiFetch<{ message: string }>('/docs-api/admin/sections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reorderSections: (sectionIds: string[]) =>
    apiFetch<{ message: string }>('/docs-api/admin/sections/reorder', {
      method: 'POST',
      body: JSON.stringify({ section_ids: sectionIds }),
    }),
  updateTeam: (data: { team_name: string; members: TeamMember[] }) =>
    apiFetch<{ message: string }>('/docs-api/admin/team', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Grocery ──────────────────────────────────────────────────────────────────

export interface GroceryOffer {
  platform_id: string;
  platform_name: string;
  platform_name_bn: string;
  price_bdt: number;
  delivery_time: string;
  nearest_shop?: { name: string; distance_km: number; area: string } | null;
}

export interface GrocerySearchItem {
  item_id: string;
  name_bn: string;
  name_en: string;
  unit: string;
  image: string;
  best_price_bdt: number;
  best_platform_id: string;
  offers: GroceryOffer[];
}

export interface GrocerySearchResponse {
  items: GrocerySearchItem[];
  total_items: number;
}

export interface NearbyShop {
  name: string;
  area: string;
  distance_km: number;
  address?: string;
}

export interface NearbyShopsResponse {
  shops: NearbyShop[];
  user_location: { lat: number; lng: number };
}

export const groceryApi = {
  search: (foods: string, lat = 23.8103, lng = 90.4125, limit = 2) =>
    apiFetch<GrocerySearchResponse>(
      `/groceries/search?foods=${encodeURIComponent(foods)}&lat=${lat}&lng=${lng}&limit=${limit}`
    ),

  nearbyShops: (lat: number, lng: number, radius = 15, limit = 10) =>
    apiFetch<NearbyShopsResponse>(
      `/groceries/nearby-shops?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}`
    ),

  fromChat: (data: { chat_text?: string; parsed_items?: unknown[]; lat?: number; lng?: number }) =>
    apiFetch<GrocerySearchResponse>('/groceries/from-chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Personal Cooker ─────────────────────────────────────────────────────────

export interface PersonalCookerMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PersonalCookerHistoryResponse {
  history: PersonalCookerMessage[];
}

export const personalCookerApi = {
  history: (sessionId: string) =>
    apiFetch<PersonalCookerHistoryResponse>(`/personal-cooker/history?session_id=${sessionId}`),

  clearHistory: (sessionId: string) =>
    apiFetch<{ message: string }>(`/personal-cooker/history?session_id=${sessionId}`, { method: 'DELETE' }),

  /** Stream chat via SSE — returns a cancel function. */
  stream: (
    message: string,
    condition: string,
    sessionId: string,
    language: string,
    onToken: (t: string) => void,
    onDone: () => void,
    onError: (e: string) => void,
  ): (() => void) => {
    const token = getToken();
    const ctrl = new AbortController();
    let finished = false;
    const finish = () => { if (!finished) { finished = true; onDone(); } };

    fetch(`${BASE_URL}/personal-cooker/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, condition, session_id: sessionId, language }),
      signal: ctrl.signal,
    }).then(async (res) => {
      if (!res.ok || !res.body) { onError('Connection failed'); finish(); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.token) onToken(d.token);
              if (d.done) finish();
              if (d.error) onError(d.error);
            } catch { /* ignore */ }
          }
        }
      }
      finish();
    }).catch((err) => {
      if (err.name !== 'AbortError') { onError(err.message); finish(); }
    });

    return () => ctrl.abort();
  },
};
