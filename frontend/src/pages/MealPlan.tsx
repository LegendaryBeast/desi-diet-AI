import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coffee,
  Utensils,
  Apple,
  Moon,
  RefreshCw,
  Info,
  ArrowLeftRight,
  Flame,
  Droplet,
  Zap,
  CheckCircle2,
  Star,
  Loader2,
  AlertCircle,
  CalendarDays,
  History,
  Edit2,
  Trash2,
  Save,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
  Crown,
  Lock,
  ChefHat,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { mealPlanApi, type MealPlanResponse, foodsApi, type FoodSearchResponse, mealTrackingApi } from '../lib/api';
import { MealLogSection, type TrackingTotals } from '../components/meal/MealLogSection';
import { ProModal } from '../components/ui/ProModal';
import { ShoppingSources } from '../components/ui/ShoppingSources';

const SLOT_ICONS: Record<string, React.ElementType> = {
  breakfast: Coffee,
  snack1: Apple,
  lunch: Utensils,
  snack2: Apple,
  dinner: Moon,
  snack: Apple,
};

const SLOT_COLORS: Record<string, string> = {
  breakfast: 'text-amber-500',
  snack1: 'text-green-500',
  lunch: 'text-accent',
  snack2: 'text-purple-500',
  dinner: 'text-blue-500',
  snack: 'text-green-500',
};

type Tab = 'today' | 'tomorrow' | 'history';

interface MealItem {
  code?: string;
  food_code?: string;
  name_bn?: string;
  name_en?: string;
  amount?: string;
  amount_g?: number;
  calories?: number;
  protein_g?: number;
  why_bn?: string;
  food_group?: string;
  /** Single food emoji assigned by backend (LLM or category-based fallback). */
  emoji?: string;
}

interface MealSlot {
  slot: string;
  slot_bn?: string;
  slot_en?: string;
  target_calories?: number;
  items?: MealItem[];
}

interface PlanData {
  meals?: MealSlot[];
  target_calories?: number;
  macros?: { protein_g?: number; carbs_g?: number; fat_g?: number };
  explanation_bn?: string;
  explanation_en?: string;
  micronutrient_targets?: Array<{
    name: string;
    name_bn: string;
    target: number;
    consumed: number;
    unit: string;
    percentage: number;
  }>;
}

export const MealPlan = () => {
  const { profileData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isPro } = useSubscription();
  const [showProModal, setShowProModal] = useState(false);
  const [proTrigger, setProTrigger] = useState<'regenerate' | 'tomorrow' | 'general'>('general');
  const [tab, setTab] = useState<Tab>((location.state as any)?.tab || 'today');
  const [plan, setPlan] = useState<MealPlanResponse | null>(null);
  const [tomorrowPlan, setTomorrowPlan] = useState<MealPlanResponse | null>(null);
  const [historyPlans, setHistoryPlans] = useState<MealPlanResponse[]>([]);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [completedSlots, setCompletedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<number>(0);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlanData, setEditingPlanData] = useState<PlanData | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [addingFoodToSlot, setAddingFoodToSlot] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResponse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [justificationLoading, setJustificationLoading] = useState<Record<string, boolean>>({});

  const [loadingSwapKey, setLoadingSwapKey] = useState<string | null>(null);
  const [originalItems, setOriginalItems] = useState<Record<string, any>>({});
  const [skippedCodes, setSkippedCodes] = useState<Record<string, string[]>>({});

  const [loggingFoods, setLoggingFoods] = useState<Record<string, boolean>>({});
  const [loggedFoods, setLoggedFoods] = useState<Record<string, boolean>>({});
  const [loggedFoodIds, setLoggedFoodIds] = useState<Record<string, string>>({});

  // Tracked meal data (from MealLogSection / mealTrackingApi)
  const [trackedCalories, setTrackedCalories] = useState(0);
  const [trackedMacros, setTrackedMacros] = useState({ protein_g: 0, carbs_g: 0, fat_g: 0 });
  // version counter to signal MealLogSection to re-fetch
  const [trackingVersion, setTrackingVersion] = useState(0);

  const handleTrackingUpdate = useCallback((totals: TrackingTotals) => {
    setTrackedCalories(totals.totalCalories);
    setTrackedMacros(totals.macros);
  }, []);

  const logFoodItem = async (slotName: string, itemIndex: number, food: MealItem) => {
    const backendSlot = slotName.startsWith('snack') ? 'snack' : slotName;
    const key = `${slotName}-${itemIndex}`;

    // If already logged, toggle off (delete)
    if (loggedFoods[key]) {
      const logId = loggedFoodIds[key];
      if (!logId) return;
      setLoggingFoods((prev) => ({ ...prev, [key]: true }));
      try {
        await mealTrackingApi.delete(logId);
        setLoggedFoods((prev) => ({ ...prev, [key]: false }));
        setLoggedFoodIds((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        // Auto-unmark slot complete in plan DB
        if (completedSlots.includes(slotName) && plan) {
          try {
            await mealPlanApi.markSlotComplete(plan.plan_id, slotName, false);
            setCompletedSlots((prev) => prev.filter((s) => s !== slotName));
          } catch (err) {
            console.warn('Failed to auto-unmark slot completed:', err);
          }
        }
        setTrackingVersion((v) => v + 1);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'লগ মুছে ফেলতে সমস্যা হয়েছে');
      } finally {
        setLoggingFoods((prev) => ({ ...prev, [key]: false }));
      }
      return;
    }

    setLoggingFoods((prev) => ({ ...prev, [key]: true }));
    try {
      const amountStr = food.amount_g ? `${food.amount_g}g` : food.amount ? String(food.amount) : '1 portion';
      const foodName = food.name_en || food.name_bn || '';
      const inputStr = `${amountStr} of ${foodName}`;

      const res = await mealTrackingApi.log({
        input: inputStr,
        meal_slot: backendSlot,
        language: 'bn',
        direct_code: food.food_code || food.code || undefined,
        direct_calories: food.calories ? Number(food.calories) : undefined,
        direct_protein: food.protein_g ? Number(food.protein_g) : undefined,
        direct_carbs: undefined,
        direct_fat: undefined,
        direct_name: food.name_en || food.name_bn || undefined,
        direct_amount_g: food.amount_g ? Number(food.amount_g) : food.amount ? Number(food.amount) : undefined,
      });
      setLoggedFoods((prev) => ({ ...prev, [key]: true }));
      setLoggedFoodIds((prev) => ({ ...prev, [key]: res.id }));
      // Trigger MealLogSection to re-fetch tracked data
      setTrackingVersion((v) => v + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'খাবারটি লগ করতে সমস্যা হয়েছে');
    } finally {
      setLoggingFoods((prev) => ({ ...prev, [key]: false }));
    }
  };

  const isFuturePlan = (planDateStr: string) => {
    const planDate = new Date(planDateStr);
    const planYear = planDate.getFullYear();
    const planMonth = planDate.getMonth();
    const planDay = planDate.getDate();

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    if (planYear > todayYear) return true;
    if (planYear < todayYear) return false;
    if (planMonth > todayMonth) return true;
    if (planMonth < todayMonth) return false;
    return planDay > todayDay;
  };

  const toggleFoodJustification = async (code: string, name: string) => {
    if (!code) return;
    if (justifications[code]) {
      setJustifications((prev) => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
      return;
    }
    setJustificationLoading((prev) => ({ ...prev, [code]: true }));
    try {
      const data = await foodsApi.justify(code, name);
      setJustifications((prev) => ({ ...prev, [code]: data.explanation }));
    } catch (e) {
      setJustifications((prev) => ({ ...prev, [code]: 'বিশ্লেষণ লোড করতে সমস্যা হয়েছে।' }));
    } finally {
      setJustificationLoading((prev) => ({ ...prev, [code]: false }));
    }
  };

  const handleSwapRequest = (items: string[]) => {
    navigate('/chat', { state: { prefill: `আমি আমার খাবার তালিকা থেকে "${items.join(' • ')}" পরিবর্তন করে বিকল্প খাবারের পরামর্শ চাই।` }});
  };

  const handleAutoSwap = async (targetPlan: MealPlanResponse, mealSlot: string, item: any, itemIndex: number) => {
    const key = `${mealSlot}-${itemIndex}`;
    setLoadingSwapKey(key);

    try {
      // 1. Get or set original item
      let originalItem = originalItems[key];
      if (!originalItem) {
        originalItem = item;
        setOriginalItems(prev => ({ ...prev, [key]: item }));
      }

      // 2. Fetch alternatives for the original item
      const code = originalItem.food_code || originalItem.code || originalItem.name_en || originalItem.name_bn || '';
      if (!code) {
        setLoadingSwapKey(null);
        return;
      }

      const res = await foodsApi.alternatives(code);
      const alts = Array.isArray(res) ? res : [];
      if (alts.length === 0) {
        alert('কোনো বিকল্প পাওয়া যায়নি (No alternatives found)');
        setLoadingSwapKey(null);
        return;
      }

      // 3. Find the first alternative that has not been skipped
      const skipped = skippedCodes[key] || [];
      let nextAlt = alts.find((a: any) => !skipped.includes(a.code) && a.code !== originalItem.code);

      let newSkipped = [...skipped];

      if (!nextAlt) {
        // We've cycled through all options. Reset skipped list and revert to original item!
        newSkipped = [];
        setSkippedCodes(prev => ({ ...prev, [key]: [] }));
        nextAlt = originalItem; // Revert to original
      } else {
        // Record this suggestion as skipped/shown
        newSkipped.push(nextAlt.code);
        setSkippedCodes(prev => ({ ...prev, [key]: newSkipped }));
      }

      // 4. Update the meal plan
      const pd = getPlanData(targetPlan);
      const newPlanData = JSON.parse(JSON.stringify(pd));
      const slotObj = newPlanData.meals.find((m: any) => m.slot === mealSlot);
      if (!slotObj) {
        setLoadingSwapKey(null);
        return;
      }

      // Keep amount_g from original item
      const amount = originalItem.amount_g || originalItem.amount || 100;

      let replacementItem;
      if (nextAlt === originalItem) {
        // Revert to original
        replacementItem = originalItem;
      } else {
        const scale = amount / 100.0;
        replacementItem = {
          code: nextAlt.code,
          food_code: nextAlt.code,
          name_bn: nextAlt.name_bn,
          name_en: nextAlt.name_en,
          amount_g: amount,
          calories: Math.round((nextAlt.calories || 0) * scale),
          protein_g: Math.round((nextAlt.protein || 0) * scale),
          carbs_g: Math.round((nextAlt.carbs || 0) * scale),
          fat_g: Math.round((nextAlt.fat || 0) * scale),
          food_group: nextAlt.food_group,
          emoji: originalItem.emoji || '🍽️',
        };
      }

      // Swap the item
      slotObj.items[itemIndex] = replacementItem;

      // Recalculate calories
      const totalCal = newPlanData.meals.reduce((sum: number, m: any) => {
        return sum + m.items.reduce((s: number, i: any) => s + (i.calories || 0), 0);
      }, 0);

      // Perform request
      const updated = await mealPlanApi.editPlan(targetPlan.plan_id, newPlanData, totalCal);
      if (plan && plan.plan_id === targetPlan.plan_id) setPlan(updated);
      if (tomorrowPlan && tomorrowPlan.plan_id === targetPlan.plan_id) setTomorrowPlan(updated);
      setHistoryPlans(prev => prev.map(p => p.plan_id === targetPlan.plan_id ? updated : p));
      
      window.dispatchEvent(new Event('data:refresh'));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'বিকল্প খাবার খুঁজতে সমস্যা হয়েছে');
    } finally {
      setLoadingSwapKey(null);
    }
  };

  const syncLoggedFoods = useCallback(async (currentPlan: MealPlanResponse | null) => {
    if (!currentPlan) return;
    try {
      const logs = await mealTrackingApi.today();
      const newLoggedFoods: Record<string, boolean> = {};
      const newLoggedFoodIds: Record<string, string> = {};

      const pd = currentPlan.plan_data as PlanData;
      const meals = pd.meals || [];

      meals.forEach((slot) => {
        const slotName = slot.slot;
        const backendSlot = slotName.startsWith('snack') ? 'snack' : slotName;
        const items = slot.items || [];

        items.forEach((item, j) => {
          const key = `${slotName}-${j}`;
          const foodNameEn = (item.name_en || '').toLowerCase();
          const foodNameBn = (item.name_bn || '').toLowerCase();

          // Find a log from today that belongs to this slot and matches this food name
          const matchedLog = logs.find((log) => {
            if (log.meal_slot !== backendSlot) return false;
            const logText = (log.input_text || '').toLowerCase();
            return (
              (foodNameEn && logText.includes(foodNameEn)) ||
              (foodNameBn && logText.includes(foodNameBn))
            );
          });

          if (matchedLog) {
            newLoggedFoods[key] = true;
            newLoggedFoodIds[key] = matchedLog.id;
          }
        });
      });

      setLoggedFoods(newLoggedFoods);
      setLoggedFoodIds(newLoggedFoodIds);
    } catch (e) {
      console.warn('Failed to sync logged foods:', e);
    }
  }, []);

  const handleLogDeleted = useCallback(async (slotName: string) => {
    // Sync checkboxes status
    setLoggedFoods((prev) => {
      const next = { ...prev };
      // Remove all matching keys for this slot
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${slotName}-`)) {
          next[key] = false;
        }
      });
      return next;
    });

    // Unmark slot completed in DB if it was complete
    if (completedSlots.includes(slotName) && plan) {
      try {
        await mealPlanApi.markSlotComplete(plan.plan_id, slotName, false);
        setCompletedSlots((prev) => prev.filter((s) => s !== slotName));
      } catch (err) {
        console.warn('Failed to unmark slot completed on log deletion:', err);
      }
    }
  }, [completedSlots, plan]);

  const targets = profileData?.targets;

  const fetchDaily = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mealPlanApi.getDaily('bn');
      setPlan(data);
      setCompletedSlots(data.completed_slots || []);
      setFeedback(data.feedback || 0);
      setEditingPlanData(data.plan_data as PlanData);
      setIsEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'প্ল্যান লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTomorrow = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mealPlanApi.getDaily('bn', 1);
      setTomorrowPlan(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'আগামীকালের প্ল্যান লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mealPlanApi.getHistory(20);
      setHistoryPlans(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ইতিহাস লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  const regenerateDaily = async (offset = 0) => {
    // Free users cannot regenerate
    if (!isPro) {
      setProTrigger('regenerate');
      setShowProModal(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await mealPlanApi.getDaily('bn', offset, true);
      if (offset === 0) {
        setPlan(data);
        setCompletedSlots(data.completed_slots || []);
        setFeedback(data.feedback || 0);
        setEditingPlanData(data.plan_data as PlanData);
        setIsEditing(false);
      } else if (offset === 1) {
        setTomorrowPlan(data);
      }
      window.dispatchEvent(new Event('data:refresh'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'প্ল্যান পুনরায় তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (tab === 'today') fetchDaily();
    else if (tab === 'tomorrow') fetchTomorrow();
    else fetchHistory();
  }, [tab, fetchDaily, fetchTomorrow, fetchHistory]);

  useEffect(() => {
    const stateTab = (location.state as any)?.tab;
    if (stateTab) {
      setTab(stateTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (tab === 'today' && plan) {
      syncLoggedFoods(plan);
    }
  }, [plan, trackingVersion, tab, syncLoggedFoods]);

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await foodsApi.search(searchQuery);
        setSearchResults(results);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const toggleSlotForPlan = async (targetPlan: MealPlanResponse, slot: string) => {
    const isComplete = (targetPlan.completed_slots || []).includes(slot);
    const backendSlot = slot.startsWith('snack') ? 'snack' : slot;

    // 1. Determine list of items inside this slot
    const pd = getPlanData(targetPlan);
    const meals = pd.meals || [];
    const targetMeal = meals.find((m) => m.slot === slot);
    const items = targetMeal?.items || [];

    const newLoggedFoods = { ...loggedFoods };
    const newLoggedFoodIds = { ...loggedFoodIds };

    try {
      // 2. Perform database logging or deleting of all items in this slot
      if (!isComplete) {
        // Marking slot as Eaten: Log all individual items that aren't already logged
        const logPromises = items.map(async (food, j) => {
          const key = `${slot}-${j}`;
          if (!newLoggedFoods[key]) {
            const amountStr = food.amount_g ? `${food.amount_g}g` : food.amount ? String(food.amount) : '1 portion';
            const foodName = food.name_en || food.name_bn || '';
            const inputStr = `${amountStr} of ${foodName}`;

            const res = await mealTrackingApi.log({
              input: inputStr,
              meal_slot: backendSlot,
              language: 'bn',
              direct_code: food.food_code || food.code || undefined,
              direct_calories: food.calories ? Number(food.calories) : undefined,
              direct_protein: food.protein_g ? Number(food.protein_g) : undefined,
              direct_carbs: undefined,
              direct_fat: undefined,
              direct_name: food.name_en || food.name_bn || undefined,
              direct_amount_g: food.amount_g ? Number(food.amount_g) : food.amount ? Number(food.amount) : undefined,
            });

            newLoggedFoods[key] = true;
            newLoggedFoodIds[key] = res.id;
          }
        });
        await Promise.all(logPromises);
      } else {
        // Unchecking: Delete all individual items of this slot from today's logs
        const deletePromises = items.map(async (food, j) => {
          const key = `${slot}-${j}`;
          const logId = newLoggedFoodIds[key];
          if (logId) {
            try {
              await mealTrackingApi.delete(logId);
              delete newLoggedFoods[key];
              delete newLoggedFoodIds[key];
            } catch (err) {
              console.error(`Failed to delete item ${key} on slot uncheck:`, err);
            }
          }
        });
        await Promise.all(deletePromises);
        
        // Also look through today's logs from the tracking service to ensure any backend matches are deleted
        try {
          const todayLogsRes = await mealTrackingApi.today();
          const logs = todayLogsRes || [];
          const logsToDelete = logs.filter((log: any) => log.meal_slot === backendSlot);
          const backendDeletePromises = logsToDelete.map(async (log: any) => {
            await mealTrackingApi.delete(log.id);
          });
          await Promise.all(backendDeletePromises);
        } catch (err) {
          console.warn('Failed to clean up duplicate slot logs from today:', err);
        }
      }

      // Update state for individual checked logs
      setLoggedFoods(newLoggedFoods);
      setLoggedFoodIds(newLoggedFoodIds);
      setTrackingVersion((v) => v + 1);

      // 3. Mark the slot complete in meal plan
      const res = await mealPlanApi.markSlotComplete(targetPlan.plan_id, slot, !isComplete);

      // Update plan in state
      if (plan && plan.plan_id === targetPlan.plan_id) {
        setPlan(res);
        setCompletedSlots(res.completed_slots || []);
      }
      if (tomorrowPlan && tomorrowPlan.plan_id === targetPlan.plan_id) {
        setTomorrowPlan(res);
      }
      setHistoryPlans((prev) =>
        prev.map((p) => (p.plan_id === targetPlan.plan_id ? res : p))
      );
      window.dispatchEvent(new Event('data:refresh'));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'স্লট পরিবর্তন করতে সমস্যা হয়েছে');
    }
  };

  const toggleSlot = async (slot: string) => {
    if (!plan) return;
    await toggleSlotForPlan(plan, slot);
  };

  const submitFeedback = async (rating: number) => {
    if (!plan || feedbackLoading) return;
    setFeedbackLoading(true);
    setFeedback(rating);
    try {
      await mealPlanApi.submitFeedback(plan.plan_id, rating);
    } catch {
      // silent fail
    } finally {
      setFeedbackLoading(false);
    }
  };

  const getPlanData = (p: MealPlanResponse): PlanData => {
    if (!p.plan_data) return {};
    return p.plan_data as PlanData;
  };

  const saveEdits = async () => {
    if (!plan || !editingPlanData) return;
    setSavingEdit(true);

    // Calculate new total calories
    const newUserCal = (editingPlanData.meals || []).reduce(
      (sum, m) => sum + (m.items || []).reduce((s, item) => s + (item.calories || 0), 0),
      0
    );

    try {
      const updated = await mealPlanApi.editPlan(plan.plan_id, editingPlanData, newUserCal);
      setPlan(updated);
      setIsEditing(false);
      window.dispatchEvent(new Event('data:refresh'));
    } catch (err: unknown) {
      setError('প্ল্যান সেভ করতে সমস্যা হয়েছে');
    } finally {
      setSavingEdit(false);
    }
  };

  const removeFoodItem = (slotIndex: number, itemIndex: number) => {
    if (!editingPlanData || !editingPlanData.meals) return;
    const newMeals = [...editingPlanData.meals];
    const newItems = [...(newMeals[slotIndex].items || [])];
    newItems.splice(itemIndex, 1);
    newMeals[slotIndex] = { ...newMeals[slotIndex], items: newItems };
    setEditingPlanData({ ...editingPlanData, meals: newMeals });
  };

  const renderMealCard = (p: MealPlanResponse, showToggle = false) => {
    const isToday = showToggle && plan?.plan_id === p.plan_id;
    const pd = isToday && isEditing && editingPlanData ? editingPlanData : getPlanData(p);
    const meals = pd.meals || [];
    // Calories from completed plan slots
    const slotConsumedCal = meals
      .filter((m) => (p.completed_slots || []).includes(m.slot))
      .reduce((acc, m) => acc + (m.items || []).reduce((s, item) => s + (item.calories || 0), 0), 0);
    // Use tracked (logged) calories for today's plan, else fallback to slot calculations
    const consumedCal = isToday ? trackedCalories : slotConsumedCal;

    // Total calculation
    let totalCal = p.calorie_target || pd.target_calories || 0;
    const aiCal = p.ai_suggestion_cal;
    const userCal = p.user_choice_cal;

    if (isToday && isEditing && editingPlanData) {
      totalCal = meals.reduce(
        (sum, m) => sum + (m.items || []).reduce((s, item) => s + (item.calories || 0), 0),
        0
      );
    } else if (userCal) {
      totalCal = userCal;
    } else if (aiCal) {
      totalCal = aiCal;
    }

    const pct = totalCal > 0 ? Math.min(100, Math.round((consumedCal / totalCal) * 100)) : 0;

    return (
      <div className="space-y-3">
        {/* Header */}
        <header className="flex items-center gap-4 bg-white p-3.5 rounded-2xl shadow-sm border border-ink/5">
          {/* Circular Progress — compact */}
          <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-cream" />
              <circle
                cx="50" cy="50" r="40"
                stroke="currentColor" strokeWidth="10" fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
                className="text-accent transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-bold text-sm text-ink leading-none">{pct}%</span>
              <span className="text-[0.45rem] uppercase tracking-wider text-ink-faint font-bold">kcal</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="font-bn text-sm font-black text-ink">
                {p.plan_id === tomorrowPlan?.plan_id ? 'আগামীকালের' : 'আজকের'} খাবার
              </h1>
              <span className="text-[0.5rem] text-ink-faint font-body font-bold uppercase tracking-wider">
                {new Date(p.plan_date).toLocaleDateString('bn-BD', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(() => {
                // Calculate consumed macros from completed slots
                const slotMacros = meals
                  .filter((m) => (p.completed_slots || []).includes(m.slot))
                  .reduce((acc, m) => {
                    (m.items || []).forEach((item) => {
                      acc.protein_g += item.protein_g || 0;
                      acc.carbs_g += 0; // carbs not always on item
                      acc.fat_g += 0;
                    });
                    return acc;
                  }, { protein_g: 0, carbs_g: 0, fat_g: 0 });

                // For today's plan, use tracked macros directly
                const consumedMacros = isToday ? {
                  protein_g: Math.round(trackedMacros.protein_g),
                  carbs_g: Math.round(trackedMacros.carbs_g),
                  fat_g: Math.round(trackedMacros.fat_g),
                } : slotMacros;

                return [
                  { icon: Flame, label: 'গৃহীত/লক্ষ্য', val: `${consumedCal}/${totalCal}`, unit: 'kcal', color: 'text-ink' },
                  { icon: Zap, label: 'শর্করা', val: targets ? `${consumedMacros.carbs_g}/${targets.carbs_g}` : '--', unit: 'g', color: 'text-accent' },
                  { icon: Utensils, label: 'প্রোটিন', val: targets ? `${consumedMacros.protein_g}/${targets.protein_g}` : '--', unit: 'g', color: 'text-forest' },
                  { icon: Droplet, label: 'চর্বি', val: targets ? `${consumedMacros.fat_g}/${targets.fat_g}` : '--', unit: 'g', color: 'text-gold' },
                ];
              })().map((item, i) => (
                <div key={i} className="bg-cream/40 p-2.5 rounded-xl border border-ink/5 text-center lg:text-left">
                  <div className="flex items-center gap-1.5 text-ink-faint mb-0.5 justify-center lg:justify-start">
                    <item.icon className={`w-3 h-3 ${item.color}`} />
                    <span className="font-bn text-[0.6rem] font-bold uppercase tracking-wider">{item.label}</span>
                  </div>
                  <div className="font-bold text-sm md:text-base text-ink">{item.val}</div>
                </div>
              ))}
            </div>

            {isToday && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {aiCal && (
                  <div className="text-[10px] font-bn px-2.5 py-1 bg-ink/5 text-ink-muted rounded-lg">
                    AI Suggestion: <span className="font-bold">{aiCal} kcal</span>
                  </div>
                )}
                {userCal && (
                  <div className="text-[10px] font-bn px-2.5 py-1 bg-accent/10 text-accent rounded-lg">
                    Your Choice: <span className="font-bold">{userCal} kcal</span>
                  </div>
                )}
                <div className="flex-1" />
                {isEditing ? (
                  <div className="flex gap-1.5">
                    <button onClick={() => setIsEditing(false)} className="text-[11px] font-bn font-bold px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1.5">
                      <X className="w-3 h-3" /> বাতিল
                    </button>
                    <button onClick={saveEdits} disabled={savingEdit} className="text-[11px] font-bn font-bold px-3 py-1.5 bg-ink text-cream rounded-lg hover:bg-accent transition-colors flex items-center gap-1.5">
                      {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3 h-3" />} সেভ করুন
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => regenerateDaily(tab === 'today' ? 0 : 1)}
                      disabled={loading}
                      className={`text-[11px] font-bn font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm ${
                        isPro
                          ? 'bg-accent text-white hover:bg-accent/85 shadow-accent/10'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-orange-500/10 hover:shadow-md'
                      }`}
                    >
                      {isPro ? (
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                      ) : (
                        <Crown className="w-3 h-3" />
                      )}
                      পুনরায় তৈরি করুন
                      {!isPro && <span className="text-[0.45rem] bg-white/20 px-1 py-0.5 rounded font-black uppercase">Pro</span>}
                    </button>
                    <button onClick={() => setIsEditing(true)} className="text-[11px] font-bn font-bold px-3 py-1.5 border border-ink/10 text-ink rounded-lg hover:bg-ink/5 transition-colors flex items-center gap-1.5">
                      <Edit2 className="w-3 h-3" /> কাস্টমাইজ
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Compact Micronutrients Summary Call-to-action */}
        {p.plan_data && (p.plan_data as any).micronutrient_targets && (p.plan_data as any).micronutrient_targets.length > 0 && (() => {
          const EXCLUDE_NAMES = ["Choline", "Vitamin B12", "Chloride (Cl)", "Energy", "Vitamin B", "Chloride", "Vitamin B12 (Cobalamin)", "Sodium", "Sodium (Na)"];
          const targets = ((p.plan_data as any).micronutrient_targets as any[]).filter((n: any) => !EXCLUDE_NAMES.includes(n.name));
          const total = targets.length;
          const completed = targets.filter((n: any) => n.percentage >= 100).length;
          const pct = Math.round((completed / total) * 100) || 0;

          return (
            <div className="bg-white p-4.5 rounded-2xl border border-ink/5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-9 h-9 rounded-lg bg-accent/5 flex items-center justify-center text-accent shrink-0">
                  <Droplet className="w-4.5 h-4.5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-black text-xs text-ink">
                    পুষ্টি উপাদান ট্র্যাকার (Micronutrient Tracker)
                  </h3>
                  <p className="font-bn text-[11px] text-ink-muted mt-0.5">
                    আজকের ভিটামিন ও মিনারেল গ্রহণের মাত্রা: <b className="text-accent font-body font-bold">{completed}/{total}</b> সম্পূর্ণ ({pct}%)
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/micronutrients')}
                className="w-full sm:w-auto px-4 py-2 bg-ink text-cream hover:bg-accent rounded-lg font-bn font-bold text-[11px] transition-colors shadow-sm"
              >
                বিস্তারিত ট্র্যাকিং দেখুন
              </button>
            </div>
          );
        })()}

        {/* Meal Cards */}
        <div className="space-y-3">
          {meals.map((slot, i) => {
            const SlotIcon = SLOT_ICONS[slot.slot] || Utensils;
            const slotColor = SLOT_COLORS[slot.slot] || 'text-ink';
            const isDone = (p.completed_slots || []).includes(slot.slot);

            return (
              <motion.div
                key={slot.slot + i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-xl p-3 border transition-all group shadow-sm ${
                  isDone ? 'border-green-200 bg-green-50/20' : 'border-ink/5 hover:border-accent/10'
                }`}
              >
                <div className="flex flex-col gap-2">
                  {/* Slot header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isDone ? 'bg-green-100 text-green-600' : 'bg-cream'} transition-colors`}>
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <SlotIcon className={`w-3.5 h-3.5 ${slotColor}`} />}
                      </div>
                      <div>
                        <div className="font-bn text-xs font-bold text-ink">{slot.slot_bn || slot.slot}</div>
                        <div className="font-body text-[0.5rem] uppercase tracking-wider text-ink-faint font-bold">
                          {(slot.items || []).reduce((sum, item) => sum + (item.calories || 0), 0)} kcal
                        </div>
                      </div>
                    </div>
                    {showToggle && !isFuturePlan(p.plan_date) && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSwapRequest((slot.items || []).map((i) => i.name_bn || i.name_en || ''))}
                          className="p-1.5 rounded-md bg-cream text-accent hover:bg-accent hover:text-white transition-all border border-transparent hover:border-accent/10"
                          title="এই স্লটের খাবারের বিকল্প খুঁজুন"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleSlotForPlan(p, slot.slot)}
                          className={`text-[0.58rem] font-bn font-bold px-2 py-0.5 rounded-md transition-all ${
                            isDone
                              ? 'bg-green-500 text-white hover:bg-red-400'
                              : 'bg-cream text-ink-muted hover:bg-accent hover:text-white'
                          }`}
                        >
                          {isDone ? '✓ খাওয়া হয়েছে' : 'খাওয়া হয়ানি'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Food items */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(slot.items || []).map((food, j) => (
                      <div key={j} className="flex flex-col gap-1">
                        {/* Food Card Row */}
                        <div className="flex items-center justify-between p-2 bg-cream/20 hover:bg-cream/30 rounded-lg border border-ink/5 transition-all group/item">
                          {/* Left: Food Info */}
                          <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                            <span className="text-base w-7 h-7 flex items-center justify-center bg-white rounded-md shrink-0 border border-ink/5" aria-hidden>
                              {food.emoji || '🍽️'}
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-bn font-bold text-ink text-xs truncate leading-tight">
                                {food.name_bn || food.name_en}
                              </h4>
                              <div className="flex items-center gap-1 mt-0.5">
                                {food.amount_g || food.amount ? (
                                  <span className="text-[0.58rem] text-accent font-bold font-bn">
                                    {food.amount_g || food.amount}g
                                  </span>
                                ) : null}
                                <ShoppingSources
                                  foodName={food.name_en || food.name_bn || `food-${j}`}
                                  count={2}
                                  compact={true}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Right: Calories & Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[0.55rem] font-bold font-body px-1.5 py-0.5 bg-white text-ink-muted rounded border border-ink/5 whitespace-nowrap">
                              {food.calories || '?'} cal
                            </span>

                            <div className="flex items-center gap-1">
                              {/* Info Trigger */}
                              {!isEditing && (
                                <button
                                  onClick={() => toggleFoodJustification(food.food_code || food.code || food.name_en || food.name_bn || '', food.name_bn || food.name_en || '')}
                                  className={`p-1 rounded border transition-all ${
                                    justifications[food.food_code || food.code || food.name_en || food.name_bn || '']
                                      ? 'bg-accent/10 text-accent border-accent/25'
                                      : 'bg-white hover:bg-accent/5 text-ink-faint hover:text-accent border-ink/5'
                                  }`}
                                  title="কেন এই খাবার?"
                                >
                                  <Info className="w-3 h-3" />
                                </button>
                              )}

                              {/* Swap Item Button */}
                              {!isEditing && (
                                <button
                                  onClick={() => handleAutoSwap(p, slot.slot, food, j)}
                                  disabled={loadingSwapKey === `${slot.slot}-${j}`}
                                  className={`p-1 rounded border transition-all ${
                                    loadingSwapKey === `${slot.slot}-${j}`
                                      ? 'bg-accent/5 border-transparent'
                                      : 'bg-white hover:bg-accent/5 text-ink-muted hover:text-accent border-ink/5'
                                  }`}
                                  title="এই খাবারের বিকল্প খুঁজুন"
                                >
                                  {loadingSwapKey === `${slot.slot}-${j}` ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-accent" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                </button>
                              )}

                              {/* Log Button */}
                              {!isEditing && isToday && (
                                <button
                                  onClick={() => logFoodItem(slot.slot, j, food)}
                                  disabled={loggingFoods[`${slot.slot}-${j}`]}
                                  className={`p-1 rounded border transition-all ${
                                    loggedFoods[`${slot.slot}-${j}`]
                                      ? 'bg-emerald-500 text-white border-emerald-500'
                                      : 'bg-white hover:bg-emerald-50 text-ink-faint hover:text-emerald-600 border-ink/5'
                                  }`}
                                  title={loggedFoods[`${slot.slot}-${j}`] ? 'বাদ দিতে আবার ক্লিক করুন' : 'খাওয়া হিসেবে যোগ করুন'}
                                >
                                  {loggingFoods[`${slot.slot}-${j}`] ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                </button>
                              )}

                              {/* Delete Button */}
                              {isEditing && (
                                <button
                                  onClick={() => removeFoodItem(i, j)}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="বাদ দিন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Justification Panels */}
                        {justificationLoading[food.food_code || food.code || food.name_en || food.name_bn || ''] && (
                          <div className="p-2.5 bg-white/50 rounded-xl text-[11px] font-bn text-ink-muted flex items-center gap-1.5 border border-ink/5">
                            <Loader2 className="w-3 h-3 animate-spin text-accent" /> বিশ্লেষণ লোড হচ্ছে...
                          </div>
                        )}

                        {justifications[food.food_code || food.code || food.name_en || food.name_bn || ''] && (
                          <div className="p-3 bg-accent/5 rounded-xl border border-accent/10 text-[11px] font-bn text-ink-muted leading-relaxed whitespace-pre-wrap shadow-inner relative">
                            <p className="font-bold text-accent mb-1 flex items-center gap-1 text-[11px]">
                              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-ping"></span>
                              ডায়েটিশিয়ান বিশ্লেষণ:
                            </p>
                            {justifications[food.food_code || food.code || food.name_en || food.name_bn || '']}
                          </div>
                        )}
                      </div>
                    ))}

                    {isEditing && (
                      addingFoodToSlot === i ? (
                        <div className="col-span-1 md:col-span-2 flex flex-col items-start gap-1.5 p-2.5 bg-accent/5 border border-accent/20 rounded-xl">
                          <div className="flex w-full gap-2">
                            <input
                              type="text"
                              placeholder="খাবারের নাম খুঁজুন..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="flex-1 w-full bg-white px-3 py-1.5 rounded-lg border border-ink/10 text-xs font-bn outline-none focus:border-accent/40"
                              autoFocus
                            />
                            <button
                              onClick={() => { setAddingFoodToSlot(null); setSearchQuery(''); setSearchResults([]); }}
                              className="p-1.5 text-ink-muted hover:bg-ink/5 rounded-lg transition-colors flex justify-center items-center"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {searchLoading && (
                            <div className="text-[10px] text-ink-muted px-2 py-0.5 font-bn flex items-center gap-1.5">
                              <Loader2 className="w-3 h-3 animate-spin" /> খুঁজছে...
                            </div>
                          )}

                          {searchResults.length > 0 && (
                            <div className="flex flex-col gap-1 w-full max-h-48 overflow-y-auto mt-0.5">
                              {searchResults.map((res) => (
                                <button
                                  key={res.code}
                                  onClick={() => {
                                    if (!editingPlanData || !editingPlanData.meals) return;
                                    const newMeals = [...editingPlanData.meals];
                                    const newItems = [...(newMeals[i].items || [])];
                                    newItems.push({
                                      name_bn: res.name_bn,
                                      name_en: res.name_en,
                                      calories: res.calories || 0,
                                      amount: "100g",
                                      food_group: res.food_group
                                    });
                                    newMeals[i] = { ...newMeals[i], items: newItems };
                                    setEditingPlanData({ ...editingPlanData, meals: newMeals });
                                    setAddingFoodToSlot(null);
                                    setSearchQuery('');
                                    setSearchResults([]);
                                  }}
                                  className="text-left w-full p-2 bg-white hover:bg-cream rounded-lg text-xs font-bn border border-ink/5 flex justify-between items-center transition-colors"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-bold text-ink">{res.name_bn || res.name_en}</span>
                                    <span className="text-[9px] text-ink-faint">{res.food_group}</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-accent shrink-0">
                                    {res.calories || '?'} cal
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                          {searchQuery && !searchLoading && searchResults.length === 0 && (
                            <div className="text-[10px] text-red-400 px-2 py-0.5 font-bn">
                              কোনো খাবার পাওয়া যায়নি
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAddingFoodToSlot(i);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="flex items-center justify-center gap-1.5 p-3.5 border border-dashed border-ink/20 rounded-xl hover:border-accent hover:text-accent hover:bg-accent/5 transition-all text-ink-muted text-xs font-bn font-bold h-full min-h-[3.2rem]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>নতুন খাবার যোগ করুন</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Meal log (text / voice / photo) */}
        {p.plan_id !== tomorrowPlan?.plan_id && <MealLogSection key={trackingVersion} onTrackingUpdate={handleTrackingUpdate} onLogDeleted={handleLogDeleted} />}

        {/* Feedback */}
        {showToggle && (
          <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm max-w-sm mx-auto">
            <p className="font-bn text-xs font-bold text-ink-muted mb-3 text-center">এই প্ল্যান কেমন লাগলো?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => submitFeedback(star)}
                  disabled={feedbackLoading}
                  className={`transition-all hover:scale-110 ${feedback >= star ? 'text-gold' : 'text-ink/20'}`}
                >
                  <Star className="w-5.5 h-5.5 fill-current" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout
      title="মিল প্ল্যান"
      subtitle="Nutrition Strategy"
      headerActions={(
        <button
          onClick={() => tab === 'today' ? fetchDaily() : tab === 'tomorrow' ? fetchTomorrow() : fetchHistory()}
          disabled={loading}
          className="p-2.5 bg-cream rounded-2xl text-ink-muted hover:bg-accent hover:text-white transition-all"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      )}
    >
      {/* Pro Upgrade Modal */}
      <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} trigger={proTrigger} />

      <div className="max-w-4xl mx-auto space-y-4 pb-20">
        {/* Tab Selector */}
        <div className="flex justify-center">
          <div className="flex bg-white p-1 rounded-xl border border-ink/5 shadow-sm gap-0.5">
            {[
              { id: 'today' as Tab, label: 'আজকের', icon: Flame, locked: false },
              { id: 'tomorrow' as Tab, label: 'আগামীকাল', icon: CalendarDays, locked: !isPro },
              { id: 'history' as Tab, label: 'ইতিহাস', icon: History, locked: false },
              { id: 'builder' as any, label: 'মিল বিল্ডার', icon: ChefHat, locked: false, isLink: true },
            ].map(({ id, label, icon: Icon, locked, isLink }) => (
              <button
                key={id}
                onClick={() => {
                  if (isLink) {
                    navigate('/meal-builder');
                    return;
                  }
                  if (locked) {
                    setProTrigger('tomorrow');
                    setShowProModal(true);
                    return;
                  }
                  setTab(id);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bn text-xs font-bold transition-all ${tab === id ? 'bg-ink text-cream shadow-md' : 'text-ink-muted hover:text-ink'
                  } ${locked ? 'opacity-60' : ''}`}
              >
                {locked ? <Lock className="w-3 h-3" /> : <Icon className="w-3.5 h-3.5" />}
                {label}
                {locked && (
                  <span className="text-[0.5rem] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider">Pro</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-500 font-bn text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">সমস্যা হয়েছে</p>
              <p className="opacity-80">{error}</p>
              <p className="text-xs mt-1 opacity-60">দয়া করে প্রথমে আপনার প্রোফাইল সেট আপ করুন</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
            <p className="font-bn text-ink-muted">AI আপনার জন্য পরিকল্পনা তৈরি করছে...</p>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {!loading && !error && (
            <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {tab === 'today' && (
                plan ? renderMealCard(plan, true) : (
                  <div className="text-center py-20 font-bn text-ink-muted">
                    <Info className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>আজকের প্ল্যান পাওয়া যায়নি</p>
                  </div>
                )
              )}

              {tab === 'tomorrow' && (
                <div className="space-y-6">
                  {tomorrowPlan ? (
                    <div className="bg-white p-6 rounded-[2rem] border border-ink/5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bn font-bold text-lg text-ink">
                          {new Date(tomorrowPlan.plan_date).toLocaleDateString('bn-BD', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-accent bg-accent/10 px-3 py-1 rounded-xl">{tomorrowPlan.calorie_target} kcal</span>
                          <button
                            onClick={() => regenerateDaily(1)}
                            disabled={loading}
                            className="text-xs font-bn font-bold px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/80 transition-colors flex items-center gap-2 shadow-sm shadow-accent/20"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> পুনরায় তৈরি করুন
                          </button>
                        </div>
                      </div>
                      {renderMealCard(tomorrowPlan, true)}
                    </div>
                  ) : (
                    <div className="text-center py-20 font-bn text-ink-muted">
                      <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>আগামীকালের প্ল্যান পাওয়া যায়নি</p>
                      <button onClick={fetchTomorrow} className="mt-4 px-6 py-2 bg-accent text-white font-bn font-bold rounded-xl hover:bg-accent/80 transition-colors">
                        আগামীকালের প্ল্যান তৈরি করুন
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tab === 'history' && (
                <div className="space-y-4">
                  {historyPlans.length > 0 ? (
                    historyPlans.map((p) => {
                      const isExpanded = expandedPlanId === p.plan_id;
                      const pd = getPlanData(p);
                      const meals = pd.meals || [];
                      const planCompletedSlots = p.completed_slots || [];

                      const planConsumedCal = meals
                        .filter((m) => planCompletedSlots.includes(m.slot))
                        .reduce((acc, m) => acc + (m.items || []).reduce((s, item) => s + (item.calories || 0), 0), 0);

                      let planTotalCal = p.calorie_target || pd.target_calories || 0;
                      if (p.user_choice_cal) {
                        planTotalCal = p.user_choice_cal;
                      } else if (p.ai_suggestion_cal) {
                        planTotalCal = p.ai_suggestion_cal;
                      }

                      const planPct = planTotalCal > 0 ? Math.min(100, Math.round((planConsumedCal / planTotalCal) * 100)) : 0;

                      return (
                        <div key={p.plan_id} className="bg-white rounded-[1.5rem] border border-ink/5 overflow-hidden hover:border-accent/20 hover:shadow-md transition-all">
                          <div
                            onClick={() => setExpandedPlanId(isExpanded ? null : p.plan_id)}
                            className="p-5 flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-cream/50 p-2.5 rounded-xl text-ink-muted">
                                <CalendarDays className="w-5 h-5 text-accent" />
                              </div>
                              <div>
                                <p className="font-bn font-bold text-ink leading-snug">
                                  {new Date(p.plan_date).toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                <p className="text-xs text-ink-faint font-bn mt-0.5">
                                  {planConsumedCal} / {planTotalCal} kcal ({planPct}%) গৃহীত
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right hidden sm:block">
                                {p.feedback ? (
                                  <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star key={s} className={`w-3.5 h-3.5 ${p.feedback! >= s ? 'text-gold fill-current' : 'text-ink/10'}`} />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-ink-faint font-bn">রেটিং নেই</span>
                                )}
                              </div>
                              <div className="text-ink-muted">
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5" />
                                ) : (
                                  <ChevronDown className="w-5 h-5" />
                                )}
                              </div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="border-t border-ink/5 bg-cream/10 p-5 space-y-4"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-ink/5 pb-2.5 gap-2">
                                  <div className="flex items-center gap-2">
                                    <Utensils className="w-4 h-4 text-accent" />
                                    <span className="font-bn font-bold text-xs text-ink">খাবারের সারসংক্ষেপ (Meal Summary)</span>
                                  </div>

                                  <div className="flex items-center gap-2 w-full sm:w-48">
                                    <div className="w-full bg-cream rounded-full h-1.5 overflow-hidden border border-ink/5">
                                      <div
                                        className="h-full bg-accent transition-all duration-500 rounded-full"
                                        style={{ width: `${planPct}%` }}
                                      />
                                    </div>
                                    <span className="font-bn text-[0.68rem] text-ink font-bold">{planPct}%</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {meals.map((slot, idx) => {
                                    const SlotIcon = SLOT_ICONS[slot.slot] || Utensils;
                                    const isDone = planCompletedSlots.includes(slot.slot);
                                    const slotCal = (slot.items || []).reduce((sum, item) => sum + (item.calories || 0), 0);

                                    return (
                                      <div
                                        key={slot.slot + idx}
                                        className={`p-3.5 rounded-2xl border transition-all ${isDone
                                            ? 'bg-green-50/20 border-green-200'
                                            : 'bg-white border-ink/5'
                                          }`}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-xl shrink-0 ${isDone ? 'bg-green-100 text-green-600' : 'bg-cream text-ink-muted'}`}>
                                              <SlotIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                              <div className="flex items-baseline gap-2">
                                                <h4 className="font-bn font-bold text-xs text-ink leading-tight">{slot.slot_bn || slot.slot}</h4>
                                                <span className="font-bn text-[0.62rem] text-ink-faint font-bold">{slotCal} kcal</span>
                                              </div>

                                              <p className="font-bn text-[0.68rem] text-ink-muted mt-1 leading-relaxed">
                                                {(slot.items || []).map((item) => `${item.emoji ? item.emoji + ' ' : ''}${item.name_bn || item.name_en || ''} (${item.amount || ''})`).join(', ') || 'কোনো খাবার নেই'}
                                              </p>
                                            </div>
                                          </div>

                                          {!isFuturePlan(p.plan_date) ? (
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                await toggleSlotForPlan(p, slot.slot);
                                              }}
                                              className={`text-[0.62rem] shrink-0 font-bn font-bold px-2.5 py-1 rounded-xl transition-all ${isDone
                                                  ? 'bg-green-500 text-white hover:bg-red-400'
                                                  : 'bg-cream text-ink-muted hover:bg-accent hover:text-white'
                                                }`}
                                            >
                                              {isDone ? '✓ খাওয়া হয়েছে' : 'খাওয়া হয়নি'}
                                            </button>
                                          ) : (
                                            <span className="text-[0.62rem] text-ink-faint font-bn italic shrink-0">খাওয়া শুরু হয়নি</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 font-bn text-ink-muted">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>কোনো ইতিহাস নেই</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};
