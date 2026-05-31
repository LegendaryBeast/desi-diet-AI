import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://desi-diet-ai-production.up.railway.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token } = res.data;
          await AsyncStorage.setItem('access_token', access_token);
          await AsyncStorage.setItem('refresh_token', refresh_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          const { useAuthStore } = require('../store/auth-store');
          useAuthStore.getState().setToken(access_token);
          return api(originalRequest);
        } else {
          const { useAuthStore } = require('../store/auth-store');
          await useAuthStore.getState().logout();
        }
      } catch (refreshError) {
        const { useAuthStore } = require('../store/auth-store');
        await useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  register: (phone: string, password: string, language = 'bn') =>
    api.post('/auth/register', { phone, password, language }),
  login: (identifier: string, password: string) =>
    api.post('/auth/login', { identifier, password }),
  me: () => api.get('/auth/me'),
};

// Profile API
export const profileApi = {
  create: (data: any) => api.post('/profile', data),
  update: (data: any) => api.patch('/profile', data),
  get: () => api.get('/profile'),
};

// Health Log API
export const healthLogApi = {
  create: (data: any) => api.post('/health-logs', data),
  list: () => api.get('/health-logs'),
  trends: () => api.get('/health-logs/trends'),
};

export const mealPlanApi = {
  daily: (language = 'bn', force = false, offset = 0) => api.get(`/meal-plans/daily?language=${language}&offset=${offset}${force ? '&force=true' : ''}`),
  weekly: (language = 'bn', force = false) => api.get(`/meal-plans/weekly?language=${language}${force ? '&force=true' : ''}`),
  history: () => api.get('/meal-plans/history'),
  feedback: (planId: string, score: number) =>
    api.post(`/meal-plans/${planId}/feedback`, { feedback: score }),
  markComplete: (planId: string, slot: string, completed: boolean) =>
    api.patch(`/meal-plans/${planId}/mark-complete`, { slot, completed }),
  edit: (planId: string, planData: any, userChoiceCal: number) =>
    api.patch(`/meal-plans/${planId}/edit`, { plan_data: planData, user_choice_cal: userChoiceCal }),
};

// Foods API
export const foodsApi = {
  search: (q: string) => api.get(`/foods/search?q=${q}`),
  searchWithInsight: (q: string, slot = 'any') => api.get(`/foods/search-with-insight?q=${q}&slot=${slot}`),
  safeFoods: () => api.get('/foods/safe-foods'),
  detail: (code: string) => api.get(`/foods/${code}`),
  justify: (code: string, name?: string) => api.get(`/foods/${encodeURIComponent(code)}/justify${name ? `?name=${encodeURIComponent(name)}` : ''}`),
  alternatives: (code: string) => api.get(`/foods/${code}/alternatives`),
};

// Reports API
export const reportsApi = {
  nutrition: () => api.get('/reports/nutrition'),
  conditions: () => api.get('/reports/conditions'),
  healthSummary: (days = 7, lang = 'bn') => api.get(`/reports/health-summary?days=${days}&lang=${lang}`),
  sendEmail: (email: string, language = 'en') => api.post('/reports/send-email', { email, language }),
};

// Chat API — returns SSE stream URL
export const chatApi = {
  streamUrl: `${API_BASE_URL}/chat`,
  history: () => api.get('/chat/history'),
};

// Diet Plan Chat API
export const dietPlanChatApi = {
  streamUrl: `${API_BASE_URL}/chat/diet-plan-session`,
};

// Meal Tracking API
export const mealTrackingApi = {
  log: (
    data: string | {
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
    },
    mealSlot?: string,
    language = 'bn',
    strictMode = false,
    preview = false,
    isManual = false
  ) => {
    if (typeof data === 'string') {
      return api.post('/meal-tracking', {
        input: data,
        meal_slot: mealSlot,
        language,
        strict_mode: strictMode,
        preview,
        is_manual: isManual,
      });
    } else {
      return api.post('/meal-tracking', {
        input: data.input,
        meal_slot: data.meal_slot,
        language: data.language || 'bn',
        direct_calories: data.direct_calories,
        direct_protein: data.direct_protein,
        direct_carbs: data.direct_carbs,
        direct_fat: data.direct_fat,
        direct_name: data.direct_name,
        direct_amount_g: data.direct_amount_g,
        strict_mode: data.strict_mode || false,
        preview: data.preview || false,
        is_manual: data.is_manual || false,
      });
    }
  },

  logFromImage: async (imageUri: string, opts: {
    food_name?: string;
    quantity_g?: number;
    meal_slot?: string;
    language?: string;
    preview?: boolean;
  } = {}) => {
    const token = await AsyncStorage.getItem('access_token');
    const formData = new FormData();
    // Append image file (React Native multipart format)
    formData.append('file', {
      uri: imageUri,
      name: 'meal-photo.jpg',
      type: 'image/jpeg',
    } as any);
    if (opts.food_name) formData.append('food_name', opts.food_name);
    if (opts.quantity_g != null) formData.append('quantity_g', String(opts.quantity_g));
    if (opts.meal_slot) formData.append('meal_slot', opts.meal_slot);
    formData.append('language', opts.language || 'bn');
    formData.append('preview', String(opts.preview || false));

    return api.post('/meal-tracking/from-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 60000, // vision LLM can be slow
    });
  },

  today: () => api.get('/meal-tracking/today'),
  delete: (id: string) => api.delete(`/meal-tracking/${id}`),
};

// Meal Builder API
export const mealBuilderApi = {
  analyze: (data: any) => api.post('/meal-builder/analyze', data),
};

// Medicine API
export const medicineApi = {
  add: (input: string, language = 'en') => api.post('/medicine-reminders', { input, language }),
  addManual: (data: { name: string; dose: string; times: string[]; with_food: boolean; notes?: string }) =>
    api.post('/medicine-reminders/manual', data),
  list: () => api.get('/medicine-reminders'),
  delete: (id: string) => api.delete(`/medicine-reminders/${id}`),
};

// Grocery API
export const groceryApi = {
  search: (foods: string, lat: number, lng: number) =>
    api.get(`/groceries/search?foods=${encodeURIComponent(foods)}&lat=${lat}&lng=${lng}`),
  nearbyShops: (lat: number, lng: number) =>
    api.get(`/groceries/nearby-shops?lat=${lat}&lng=${lng}`),
};

// Personal Cooker API
export const personalCookerApi = {
  chat: (message: string, condition: string, sessionId: string) =>
    api.post('/personal-cooker/chat', { message, condition, session_id: sessionId }),
  history: (sessionId: string) =>
    api.get(`/personal-cooker/history?session_id=${sessionId}`),
  clearHistory: (sessionId: string) =>
    api.delete(`/personal-cooker/history?session_id=${sessionId}`),
  conditions: () => api.get('/personal-cooker/conditions'),
};
