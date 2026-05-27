import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, ActivityIndicator, Alert, Image, Modal, Platform
} from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, fonts, spacing, radius } from '../../lib/theme';
import {
  CalendarDays, Check, ArrowLeftRight,
  ChevronDown, ChevronUp, RefreshCw, Flame, History, Crown,
  BarChart2, MessageSquare, Sparkles, Plus, Trash2, Utensils
} from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { mealPlanApi, foodsApi, mealTrackingApi } from '../../lib/api';
import { useSubscription } from '../../context/SubscriptionContext';
import ProModal from '../../components/ui/ProModal';
import { useTranslation } from '../../lib/translations';
import ManualFoodLogModal from '../../components/meals/ManualFoodLogModal';

type TabId = 'today' | 'tomorrow' | 'history';

const SOURCES = [
  { name: 'Shwapno', nameBn: 'স্বপ্ন', color: '#EA580C', bgColor: '#FFF7ED', borderColor: '#FED7AA', abbr: 'SW' },
  { name: 'Chaldal', nameBn: 'চালডাল', color: '#16A34A', bgColor: '#F0FDF4', borderColor: '#BBF7D0', abbr: 'CD' },
  { name: 'Pran', nameBn: 'প্রাণ', color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA', abbr: 'PR' },
  { name: 'Foodpanda', nameBn: 'ফুডপান্ডা', color: '#DB2777', bgColor: '#FDF2F8', borderColor: '#FBCFE8', abbr: 'FP' },
  { name: 'Gorerbazarbd', nameBn: 'ঘরের বাজার', color: '#2563EB', bgColor: '#EFF6FF', borderColor: '#BFDBFE', abbr: 'GB' },
  { name: 'Meena Bazaar', nameBn: 'মীনা বাজার', color: '#059669', bgColor: '#ECFDF5', borderColor: '#A7F3D0', abbr: 'MB' }
];

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getSourcesForFood(foodName: string, count: number = 3) {
  const hash = hashString(foodName);
  const shuffled = [...SOURCES].sort((a, b) => {
    const ha = hashString(foodName + a.name);
    const hb = hashString(foodName + b.name);
    return ha - hb;
  });
  return shuffled.slice(0, Math.min(count, SOURCES.length));
}

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'today', label: 'আজকের খাবার', icon: CalendarDays },
  { id: 'tomorrow', label: 'আগামীকাল', icon: CalendarDays },
  { id: 'history', label: 'ইতিহাস', icon: History },
];

const SLOT_TIMES_BN: Record<string, string> = {
  breakfast: 'সকাল ৭টা',
  morning_snack: 'সকাল ১০টা',
  lunch: 'দুপুর ১টা',
  evening_snack: 'বিকেল ৪টা',
  dinner: 'রাত ৮টা',
};

const SLOT_TIMES_EN: Record<string, string> = {
  breakfast: '7:00 AM',
  morning_snack: '10:00 AM',
  lunch: '1:00 PM',
  evening_snack: '4:00 PM',
  dinner: '8:00 PM',
};

export default function MealsScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [generatingToday, setGeneratingToday] = useState(false);
  const [generatingTomorrow, setGeneratingTomorrow] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { t, language } = useTranslation();
  const slotTimes = language === 'bn' ? SLOT_TIMES_BN : SLOT_TIMES_EN;
  const isBn = language === 'bn';

  // Pro features integration
  const { isPro } = useSubscription();
  const [showProModal, setShowProModal] = useState(false);
  const [proTrigger, setProTrigger] = useState<'chat_limit' | 'regenerate' | 'tomorrow' | 'general'>('general');

  const queryClient = useQueryClient();
  const haptics = useHaptics();
  const router = useRouter();

  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [justificationLoading, setJustificationLoading] = useState<Record<string, boolean>>({});
  const [showManualLog, setShowManualLog] = useState(false);

  const [originalItems, setOriginalItems] = useState<Record<string, any>>({});
  const [skippedCodes, setSkippedCodes] = useState<Record<string, string[]>>({});
  const [loadingSwapKey, setLoadingSwapKey] = useState<string | null>(null);
  const [togglingSlot, setTogglingSlot] = useState<string | null>(null);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[] | null>(null);
  const [slotToDelete, setSlotToDelete] = useState<string | null>(null);

  const handleAutoSwap = async (meal: any, item: any, itemIndex: number) => {
    const key = `${meal.slot}-${itemIndex}`;
    setLoadingSwapKey(key);
    haptics.light();

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
      const alts = res.data || [];
      if (alts.length === 0) {
        Alert.alert(language === 'bn' ? 'কোনো বিকল্প পাওয়া যায়নি' : 'No alternatives found');
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
      const plan = activeTab === 'today' ? todayQ.data : tomorrowQ.data;
      if (!plan) {
        setLoadingSwapKey(null);
        return;
      }

      const newPlanData = JSON.parse(JSON.stringify(plan.plan_data));
      const slotObj = newPlanData.meals.find((m: any) => m.slot === meal.slot);
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
          protein: Math.round((nextAlt.protein || 0) * scale),
          carbs: Math.round((nextAlt.carbs || 0) * scale),
          fat: Math.round((nextAlt.fat || 0) * scale),
          fiber: Math.round((nextAlt.fiber || 0) * scale),
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
      await mealPlanApi.edit(plan.plan_id, newPlanData, totalCal);
      
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['daily_plan', 0] });
      queryClient.invalidateQueries({ queryKey: ['daily_plan', 1] });

    } catch (e) {
      console.log('Error auto-swapping item:', e);
      haptics.error();
      Alert.alert(
        language === 'bn' ? 'ত্রুটি' : 'Error', 
        language === 'bn' ? 'খাবার পরিবর্তন করতে ব্যর্থ হয়েছে।' : 'Failed to replace food item.'
      );
    } finally {
      setLoadingSwapKey(null);
    }
  };

  const toggleFoodJustification = async (code: string, name: string) => {
    if (!code) return;
    const cacheKey = code;
    if (justifications[cacheKey]) {
      setJustifications((prev) => {
        const next = { ...prev };
        delete next[cacheKey];
        return next;
      });
      return;
    }
    setJustificationLoading((prev) => ({ ...prev, [cacheKey]: true }));
    try {
      const response = await foodsApi.justify(code, name);
      const data = response.data;
      setJustifications((prev) => ({ ...prev, [cacheKey]: data.explanation || (language === 'bn' ? 'বিশ্লেষণ লোড করা সম্ভব হয়নি।' : 'Could not load analysis.') }));
    } catch (e) {
      setJustifications((prev) => ({ ...prev, [cacheKey]: language === 'bn' ? 'বিশ্লেষণ লোড করতে সমস্যা হয়েছে।' : 'Problem loading analysis.' }));
    } finally {
      setJustificationLoading((prev) => ({ ...prev, [cacheKey]: false }));
    }
  };

  // ── Queries ────────────────────────────────────────────────────────────────
  const todayQ = useQuery({
    queryKey: ['daily_plan', 0, language],
    queryFn: async () => (await mealPlanApi.daily(language, false, 0)).data,
    enabled: activeTab === 'today',
  });

  const todayLogsQ = useQuery({
    queryKey: ['daily_tracking', language],
    queryFn: async () => (await mealTrackingApi.today()).data || [],
    enabled: activeTab === 'today',
  });

  const tomorrowQ = useQuery({
    queryKey: ['daily_plan', 1, language],
    queryFn: async () => (await mealPlanApi.daily(language, false, 1)).data,
    enabled: activeTab === 'tomorrow' && isPro, // Query tomorrow plan only if user is pro
  });

  const historyQ = useQuery({
    queryKey: ['history_plans'],
    queryFn: async () => (await mealPlanApi.history()).data,
    enabled: activeTab === 'history',
  });

  // Refetch daily plan queries on screen focus to ensure checkbox completion syncs in real-time
  useFocusEffect(
    useCallback(() => {
      todayQ.refetch();
      todayLogsQ.refetch();
      if (isPro) {
        tomorrowQ.refetch();
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPro])
  );

  // ── Mutation: Mark Complete ────────────────────────────────────────────────
  const markMutation = useMutation({
    mutationFn: async ({ planId, slot, completed, items }: { planId: string; slot: string; completed: boolean; items: any[] }) => {
      // 1. Toggle slot complete state
      const res = await mealPlanApi.markComplete(planId, slot, completed);

      try {
        // 2. Fetch today's existing logs to match names
        const todayLogsRes = await mealTrackingApi.today();
        const logs = todayLogsRes.data || [];

        if (completed) {
          // Log all items that aren't already logged
          const logPromises = items.map(async (food: any) => {
            const foodNameEn = (food.name_en || '').toLowerCase();
            const foodNameBn = (food.name_bn || '').toLowerCase();

            const isAlreadyLogged = logs.some((log: any) => {
              if (log.meal_slot !== slot) return false;
              const logText = (log.input_text || '').toLowerCase();
              return (
                (foodNameEn && logText.includes(foodNameEn)) ||
                (foodNameBn && logText.includes(foodNameBn))
              );
            });

            if (!isAlreadyLogged) {
              const amountStr = food.amount_g ? `${food.amount_g}g` : food.amount ? String(food.amount) : '1 portion';
              const foodName = food.name_en || food.name_bn || '';
              const inputStr = `${amountStr} of ${foodName}`;

              await mealTrackingApi.log({
                input: inputStr,
                meal_slot: slot,
                language: 'bn',
                direct_calories: food.calories ? Number(food.calories) : undefined,
                direct_protein: food.protein_g ? Number(food.protein_g) : undefined,
                direct_carbs: undefined,
                direct_fat: undefined,
                direct_name: food.name_en || food.name_bn || undefined,
                direct_amount_g: food.amount_g ? Number(food.amount_g) : food.amount ? Number(food.amount) : undefined,
              });
            }
          });
          await Promise.all(logPromises);
        } else {
          // Unchecking the slot!
          // We should delete all today's logs for this specific slot!
          const logsToDelete = logs.filter((log: any) => log.meal_slot === slot);
          const deletePromises = logsToDelete.map(async (log: any) => {
            try {
              await mealTrackingApi.delete(log.id);
            } catch (e) {
              console.warn(`Failed to auto-delete log item ${log.id} on slot uncheck:`, e);
            }
          });
          await Promise.all(deletePromises);
        }
      } catch (err) {
        console.warn('Failed to sync meal tracking logs on slot toggle:', err);
      }

      return res;
    },
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['daily_plan', 0] });
      queryClient.invalidateQueries({ queryKey: ['daily_tracking'] });
      todayLogsQ.refetch();
    },
    onError: () => haptics.error(),
  });

  // ── Mutation: Delete Logged Meal ───────────────────────────────────────────
  const deleteLogMutation = useMutation({
    mutationFn: async (logIds: string | string[]) => {
      if (Array.isArray(logIds)) {
        for (const id of logIds) {
          try {
            await mealTrackingApi.delete(id);
          } catch (e) {
            console.warn(`Failed to delete log item ${id}:`, e);
          }
        }
      } else {
        await mealTrackingApi.delete(logIds);
      }
    },
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['daily_plan', 0] });
      queryClient.invalidateQueries({ queryKey: ['daily_tracking'] });
      todayLogsQ.refetch();
      todayQ.refetch();
    },
    onError: (err) => {
      console.error('Deletion mutation failed:', err);
      haptics.error();
    },
  });

  // ── Mutation: Log Individual Food Item ──────────────────────────────────────
  const logFoodItemMutation = useMutation({
    mutationFn: async ({ slot, food }: { slot: string; food: any }) => {
      const backendSlot = slot.startsWith('snack') ? 'snack' : slot;
      const amountStr = food.amount_g ? `${food.amount_g}g` : food.amount ? String(food.amount) : '1 portion';
      const foodName = food.name_en || food.name_bn || '';
      const inputStr = `${amountStr} of ${foodName}`;

      return mealTrackingApi.log({
        input: inputStr,
        meal_slot: backendSlot,
        language: 'bn',
        direct_calories: food.calories ? Number(food.calories) : undefined,
        direct_protein: food.protein_g ? Number(food.protein_g) : undefined,
        direct_carbs: undefined,
        direct_fat: undefined,
        direct_name: food.name_en || food.name_bn || undefined,
        direct_amount_g: food.amount_g ? Number(food.amount_g) : food.amount ? Number(food.amount) : undefined,
      });
    },
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['daily_plan', 0] });
      queryClient.invalidateQueries({ queryKey: ['daily_tracking'] });
      todayLogsQ.refetch();
      todayQ.refetch();
    },
    onError: () => haptics.error(),
  });

  const isFoodItemLogged = (slot: string, item: any) => {
    const backendSlot = slot.startsWith('snack') ? 'snack' : slot;
    const foodNameEn = (item.name_en || '').toLowerCase();
    const foodNameBn = (item.name_bn || '').toLowerCase();
    const logs = todayLogsQ.data || [];
    return logs.some((log: any) => {
      if (log.meal_slot !== backendSlot) return false;
      const logText = (log.input_text || '').toLowerCase();
      return (
        (foodNameEn && logText.includes(foodNameEn)) ||
        (foodNameBn && logText.includes(foodNameBn))
      );
    });
  };

  const getFoodItemLogId = (slot: string, item: any) => {
    const backendSlot = slot.startsWith('snack') ? 'snack' : slot;
    const foodNameEn = (item.name_en || '').toLowerCase();
    const foodNameBn = (item.name_bn || '').toLowerCase();
    const logs = todayLogsQ.data || [];
    const matched = logs.find((log: any) => {
      if (log.meal_slot !== backendSlot) return false;
      const logText = (log.input_text || '').toLowerCase();
      return (
        (foodNameEn && logText.includes(foodNameEn)) ||
        (foodNameBn && logText.includes(foodNameBn))
      );
    });
    return matched?.id;
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'today') {
      await Promise.all([todayQ.refetch(), todayLogsQ.refetch()]);
    }
    else if (activeTab === 'tomorrow' && isPro) await tomorrowQ.refetch();
    else if (activeTab === 'history') await historyQ.refetch();
    setRefreshing(false);
  }, [activeTab, isPro, todayQ, todayLogsQ, tomorrowQ, historyQ]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getCompletedSlots = (planResponse: any): string[] => {
    const raw = planResponse?.completed_slots;
    if (!raw) return [];
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return [];
    }
  };

  const handleSwapRequest = (items: string[]) => {
    haptics.light();
    router.push({
      pathname: '/(tabs)/chat',
      params: { 
        prefill: language === 'bn'
          ? `আমি আমার খাবার তালিকা থেকে "${items.join(' • ')}" পরিবর্তন করে বিকল্প খাবারের পরামর্শ চাই।`
          : `I want to replace "${items.join(' • ')}" from my meal list and get suggestions for alternative foods.`
      }
    });
  };

  // Regeneration Handler
  const regeneratePlan = async (offset: number) => {
    if (!isPro) {
      setProTrigger('regenerate');
      setShowProModal(true);
      return;
    }

    haptics.medium();
    if (offset === 0) setGeneratingToday(true);
    else setGeneratingTomorrow(true);

    try {
      await mealPlanApi.daily(language, true, offset); // force = true
      queryClient.invalidateQueries({ queryKey: ['daily_plan', offset] });
      if (offset === 0) await todayQ.refetch();
      else await tomorrowQ.refetch();
      haptics.success();
    } catch {
      Alert.alert(
        language === 'bn' ? 'ত্রুটি' : 'Error',
        language === 'bn' ? 'পরিকল্পনা তৈরি করতে পারেনি। পরে আবার চেষ্টা করুন।' : 'Failed to generate plan. Please try again later.'
      );
    } finally {
      if (offset === 0) setGeneratingToday(false);
      else setGeneratingTomorrow(false);
    }
  };

  // ── Card Renderer ──────────────────────────────────────────────────────────
  const renderMealCard = (meal: any, planId: string, completedSlots: string[], allowActions = false) => {
    const isCompleted = completedSlots.includes(meal.slot);
    const foodItems: string[] = (meal.items || []).map((i: any) => i.name_bn || i.name_en || '');

    return (
      <View key={meal.slot} style={[styles.mealCard, isCompleted && styles.mealCardDone]}>
        <View style={styles.mealRowTop}>
          <View style={styles.mealTitleGroup}>
            <Text style={styles.mealSlot}>{language === 'bn' ? (meal.slot_bn || meal.slot) : (meal.slot_en || meal.slot)}</Text>
            <Text style={styles.mealTime}>{slotTimes[meal.slot] || ''}</Text>
          </View>

          {allowActions && (
            <View style={styles.mealActions}>
              {/* Swap */}
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => handleSwapRequest(foodItems)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ArrowLeftRight size={16} color={colors.accent} strokeWidth={2} />
              </TouchableOpacity>
              {/* Check */}
              <TouchableOpacity
                style={[styles.checkBtn, isCompleted && styles.checkBtnDone]}
                onPress={() => {
                  haptics.light();
                  markMutation.mutate({ planId, slot: meal.slot, completed: !isCompleted, items: meal.items || [] });
                }}
                disabled={markMutation.isPending}
              >
                <Check size={14} color={isCompleted ? colors.white : colors.textSecondary} strokeWidth={3} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.foodList}>
          {(meal.items || []).map((item: any, idx: number) => {
            const foodName = item.name_bn || item.name_en || '';
            const sources = getSourcesForFood(item.name_en || item.name_bn || `food-${idx}`, 2);
            const foodKey = item.food_code || item.code || item.name_en || item.name_bn || '';
            return (
              <View key={idx} style={{ width: '100%', marginBottom: 4 }}>
                <View style={styles.webFoodCard}>
                  {/* Left Side: Emoji Box */}
                  <View style={styles.webFoodEmojiBox}>
                    <Text style={styles.webFoodEmoji}>{item.emoji || '🍽️'}</Text>
                  </View>

                  {/* Middle details: Name, weight & sources */}
                  <View style={styles.webFoodInfo}>
                    <Text style={styles.webFoodName} numberOfLines={1}>
                      {foodName}
                    </Text>
                    <View style={styles.webFoodMetaRow}>
                      {item.amount_g || item.amount ? (
                        <Text style={styles.webFoodWeight}>
                          {item.amount_g || item.amount}g{' '}
                          <Text style={styles.webFoodLabel}>{language === 'bn' ? 'পাওয়া যাবে:' : 'Available at:'}</Text>
                        </Text>
                      ) : null}
                      
                      {/* Compact shopping sources logos */}
                      <View style={styles.webFoodSources}>
                        {sources.map((src: any, sIdx: number) => (
                          <View
                            key={sIdx}
                            style={[styles.compactSourceCircle, { backgroundColor: src.color }]}
                          >
                            <Text style={styles.compactSourceAbbr}>{src.abbr}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Right Side: Calories & Icons */}
                  <View style={styles.webFoodRight}>
                    {/* Cal Badge */}
                    <View style={styles.webFoodCalBadge}>
                      <Text style={styles.webFoodCalText}>{item.calories || 0} cal</Text>
                    </View>

                    {/* Info Button */}
                    <TouchableOpacity
                      style={[styles.webFoodInfoBtn, justifications[foodKey] && { backgroundColor: colors.accent + '15', borderColor: colors.accent }]}
                      onPress={() => toggleFoodJustification(foodKey, foodName)}
                    >
                      <Text style={[styles.webFoodInfoText, justifications[foodKey] && { color: colors.accent }]}>ⓘ</Text>
                    </TouchableOpacity>

                    {/* Swap Item Button */}
                    {allowActions && (
                      <TouchableOpacity
                        style={styles.webFoodSwapBtn}
                        onPress={() => handleAutoSwap(meal, item, idx)}
                        disabled={loadingSwapKey !== null}
                      >
                        {loadingSwapKey === `${meal.slot}-${idx}` ? (
                          <ActivityIndicator size="small" color={colors.accent} style={{ transform: [{ scale: 0.7 }] }} />
                        ) : (
                          <RefreshCw size={11} color={colors.accent} strokeWidth={2.8} />
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Checkbox Button */}
                    <TouchableOpacity
                      style={[styles.webFoodCheckBtn, isFoodItemLogged(meal.slot, item) && styles.webFoodCheckBtnActive]}
                      onPress={() => {
                        haptics.light();
                        const isLogged = isFoodItemLogged(meal.slot, item);
                        if (isLogged) {
                          const logId = getFoodItemLogId(meal.slot, item);
                          if (logId) {
                            deleteLogMutation.mutate(logId);
                            // Auto-unmark slot complete in plan DB
                            if (isCompleted && planId) {
                              markMutation.mutate({ planId, slot: meal.slot, completed: false, items: [] });
                            }
                          }
                        } else {
                          logFoodItemMutation.mutate({ slot: meal.slot, food: item });
                        }
                      }}
                      disabled={deleteLogMutation.isPending || logFoodItemMutation.isPending}
                    >
                      <Check size={10} color={isFoodItemLogged(meal.slot, item) ? colors.white : 'rgba(0,0,0,0.15)'} strokeWidth={4.5} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Collapsible Justification Panels */}
                {justificationLoading[foodKey] && (
                  <View style={styles.justificationLoadingBox}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={styles.justificationLoadingText}>{language === 'bn' ? 'বিশ্লেষণ লোড হচ্ছে...' : 'Loading analysis...'}</Text>
                  </View>
                )}

                {justifications[foodKey] && (
                  <View style={styles.justificationBox}>
                    <View style={styles.justificationHeader}>
                      <View style={styles.justificationPing} />
                      <Text style={styles.justificationTitle}>{language === 'bn' ? 'ডায়েটিশিয়ান বিশ্লেষণ (RAG Insight):' : 'Dietitian Analysis (RAG Insight):'}</Text>
                    </View>
                    <Text style={styles.justificationText}>
                      {justifications[foodKey]}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.calBadge}>
          <Flame size={12} color={colors.primary} />
          <Text style={styles.calText}>
            {(meal.items || []).reduce((sum: number, item: any) => sum + (item.calories || 0), 0)} kcal
          </Text>
        </View>
      </View>
    );
  };

  // ── Render Today Tab ───────────────────────────────────────────────────────
  const renderToday = () => {
    if (todayQ.isLoading && !refreshing) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{language === 'bn' ? 'আজকের পরিকল্পনা লোড হচ্ছে...' : 'Loading today\'s plan...'}</Text>
        </View>
      );
    }

    const plan = todayQ.data;
    if (!plan || plan.error) {
      return (
        <View style={styles.emptyState}>
          <Image source={require('../../assets/pusti_bot.png')} style={styles.emptyIllustration} resizeMode="contain" />
          <Text style={styles.emptyTitle}>{language === 'bn' ? 'আজকের পরিকল্পনা নেই' : 'No plan for today'}</Text>
          <Text style={styles.emptyText}>
            {language === 'bn'
              ? 'আপনার স্বাস্থ্য অবস্থা ও পছন্দ অনুযায়ী এআই একটি ব্যক্তিগত খাবার পরিকল্পনা তৈরি করবে।'
              : 'AI will generate a personalized meal plan according to your health status and preferences.'}
          </Text>

          <TouchableOpacity
            style={[styles.generateBtn, generatingToday && styles.generateBtnDisabled]}
            disabled={generatingToday}
            onPress={async () => {
              haptics.medium();
              setGeneratingToday(true);
              try {
                await mealPlanApi.daily(language, true, 0);
                queryClient.invalidateQueries({ queryKey: ['daily_plan', 0] });
                await todayQ.refetch();
              } catch {
                Alert.alert(
                  language === 'bn' ? 'ত্রুটি' : 'Error',
                  language === 'bn' ? 'পরিকল্পনা তৈরি করতে পারেনি। পরে আবার চেষ্টা করুন।' : 'Failed to generate plan. Please try again later.'
                );
              } finally {
                setGeneratingToday(false);
              }
            }}
          >
            {generatingToday ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <View style={styles.btnIconRow}>
                <Sparkles size={18} color={colors.white} strokeWidth={2} />
                <Text style={styles.generateBtnText}>{language === 'bn' ? 'এআই পরিকল্পনা তৈরি করুন' : 'Generate AI Plan'}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.askAiBtn}
            onPress={() => {
              haptics.light();
              router.push({
                pathname: '/(tabs)/chat',
                params: { 
                  prefill: language === 'bn'
                    ? 'আজকের জন্য আমার স্বাস্থ্য অবস্থা অনুযায়ী একটি খাবার পরিকল্পনা দিন।'
                    : 'Provide a meal plan according to my health status for today.'
                }
              });
            }}
          >
            <View style={styles.btnIconRow}>
              <MessageSquare size={16} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.askAiBtnText}>{language === 'bn' ? 'এআই-এর সাথে কথা বলুন' : 'Talk to AI'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    const planData = plan.plan_data;
    const planId = plan.plan_id;
    const completedSlots = getCompletedSlots(plan);
    const completedCount = completedSlots.length;
    const totalMeals = (planData?.meals || []).length;

    // Calculate actual consumed calories from today's tracker logs
    const consumedCal = (todayLogsQ.data || []).reduce((sum: number, log: any) => sum + (log.total_calories || 0), 0);
    const targetCal = planData?.target_calories || 2000;
    const progressPct = targetCal > 0 ? Math.min(100, Math.round((consumedCal / targetCal) * 100)) : 0;

    return (
      <View style={styles.tabContent}>
        <View style={styles.daySummary}>
          <View style={styles.daySummaryLeft}>
            <CalendarDays size={18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.dayTitle}>{language === 'bn' ? 'আজকের খাবার' : 'Today\'s Meals'}</Text>
          </View>
          <View style={styles.daySummaryRight}>
            <Text style={styles.dayProgress}>
              {language === 'bn' ? `${consumedCal} / ${targetCal} কি.ক্যালরি` : `${consumedCal} / ${targetCal} kcal`}
            </Text>
            <Text style={styles.dayCalTarget}>
              {language === 'bn' ? `${progressPct}% সম্পন্ন` : `${progressPct}% completed`}
            </Text>
          </View>
        </View>

        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.targetDetailsBtn}
            onPress={() => {
              haptics.light();
              router.push('/target-details');
            }}
          >
            <BarChart2 size={14} color={colors.primaryDark} strokeWidth={2.5} />
            <Text style={styles.targetDetailsText}>{language === 'bn' ? 'বিশ্লেষণ' : 'Targets'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.targetDetailsBtn, { borderColor: colors.accent, backgroundColor: colors.accent + '12' }]}
            onPress={() => {
              haptics.light();
              setShowManualLog(true);
            }}
          >
            <Plus size={14} color={colors.accent} strokeWidth={2.5} />
            <Text style={[styles.targetDetailsText, { color: colors.accent }]}>
              {language === 'bn' ? 'খাবার যোগ' : 'Add Food'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.regeneratePlanBtn, !isPro && styles.regeneratePlanBtnPro]}
            onPress={() => regeneratePlan(0)}
            disabled={generatingToday}
          >
            {generatingToday ? (
              <ActivityIndicator size="small" color={isPro ? colors.primary : colors.white} />
            ) : (
              <>
                {isPro ? (
                  <RefreshCw size={13} color={colors.primary} />
                ) : (
                  <Crown size={13} color={colors.white} />
                )}
                <Text style={[styles.regeneratePlanText, !isPro && styles.regeneratePlanTextPro]}>
                  {language === 'bn' ? 'নতুন করে' : 'Regen'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {(planData?.meals || []).map((meal: any) =>
          renderMealCard(meal, planId, completedSlots, true)
        )}

        {/* Today's Manual/Visual Log List */}
        {renderLoggedMeals(planData)}
      </View>
    );
  };

  const SLOT_LABELS_BN: Record<string, string> = {
    breakfast: 'সকালের নাস্তা',
    morning_snack: 'সকালের স্ন্যাক্স',
    lunch: 'দুপুরের খাবার',
    evening_snack: 'বিকেলের নাস্তা',
    dinner: 'রাতের খাবার',
    snack: 'স্ন্যাক্স',
    other: 'অন্যান্য খাবার',
  };

  const SLOT_LABELS_EN: Record<string, string> = {
    breakfast: 'Breakfast',
    morning_snack: 'Morning Snack',
    lunch: 'Lunch',
    evening_snack: 'Evening Snack',
    dinner: 'Dinner',
    snack: 'Snack',
    other: 'Other Food',
  };

  const getCleanFoodName = (logInputText: string, planData: any, isBn: boolean) => {
    let clean = logInputText
      .replace(/^📋\s*\[Plan\]\s*/, '')
      .replace(/^📋\s*/, '')
      .replace(/^\[Plan\]\s*/, '')
      .replace(/^\[Manual\]\s*/, '')
      .replace(/^✍️\s*\[Manual\]\s*/, '')
      .replace(/^✍️\s*/, '')
      .replace(/^✅\s*/, '')
      .replace(/^⚠️\s*/, '')
      .replace(/^📷\s*/, '')
      .trim();

    clean = clean.replace(/^\d+g\s+of\s+/i, '');
    clean = clean.replace(/^\d+\s+portion\s+of\s+/i, '');
    clean = clean.replace(/^of\s+/i, '');
    clean = clean.replace(/\s*\[.*?\]/g, '').trim();

    const cleanLower = clean.toLowerCase();

    if (planData && planData.meals) {
      for (const m of planData.meals) {
        for (const item of (m.items || [])) {
          const itemEn = (item.name_en || '').toLowerCase();
          const itemBn = (item.name_bn || '').toLowerCase();
          const itemCode = (item.food_code || item.code || '').toLowerCase();
          
          if (
            cleanLower === itemEn ||
            cleanLower === itemBn ||
            (itemCode && cleanLower === itemCode) ||
            cleanLower.includes(itemEn) ||
            cleanLower.includes(itemBn)
          ) {
            return isBn ? (item.name_bn || item.name_en) : (item.name_en || item.name_bn);
          }
        }
      }
    }

    return clean;
  };

  const renderLoggedMeals = (todayPlanData: any) => {
    const logs = todayLogsQ.data || [];
    if (logs.length === 0) return null;

    const totalCals = logs.reduce((sum: number, log: any) => sum + (log.total_calories || 0), 0);
    const isBn = language === 'bn';

    // Group logs by meal_slot
    const groupsMap: Record<string, {
      meal_slot: string;
      total_calories: number;
      macros: { protein_g: number; carbs_g: number; fat_g: number };
      ids: string[];
      food_names: string[];
      logged_at: string;
    }> = {};

    for (const log of logs) {
      const slot = log.meal_slot || 'other';
      const cleanName = getCleanFoodName(log.input_text, todayPlanData, isBn);
      
      if (!groupsMap[slot]) {
        groupsMap[slot] = {
          meal_slot: slot,
          total_calories: 0,
          macros: { protein_g: 0, carbs_g: 0, fat_g: 0 },
          ids: [],
          food_names: [],
          logged_at: log.logged_at,
        };
      }
      
      groupsMap[slot].total_calories += log.total_calories || 0;
      if (log.macros) {
        groupsMap[slot].macros.protein_g += log.macros.protein_g || 0;
        groupsMap[slot].macros.carbs_g += log.macros.carbs_g || 0;
        groupsMap[slot].macros.fat_g += log.macros.fat_g || 0;
      }
      groupsMap[slot].ids.push(log.id);
      if (!groupsMap[slot].food_names.includes(cleanName)) {
        groupsMap[slot].food_names.push(cleanName);
      }
      if (new Date(log.logged_at) > new Date(groupsMap[slot].logged_at)) {
        groupsMap[slot].logged_at = log.logged_at;
      }
    }

    const groups = Object.values(groupsMap);
    const visibleGroups = showAllLogs ? groups : groups.slice(0, 2);

    return (
      <View style={styles.loggedSection}>
        <View style={styles.loggedHeaderRow}>
          <Text style={styles.loggedSectionTitle}>
            {isBn ? 'আজকের লগ করা খাবার' : 'Today\'s Logged Foods'}
          </Text>
          <View style={styles.loggedTotalBadge}>
            <Flame size={12} color={colors.primary} />
            <Text style={styles.loggedTotalText}>
              {totalCals} kcal
            </Text>
          </View>
        </View>

        <View style={styles.loggedList}>
          {visibleGroups.map((group) => {
            const dateObj = new Date(group.logged_at);
            const time = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleTimeString(isBn ? 'bn-BD' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const slotLabel = isBn 
              ? (SLOT_LABELS_BN[group.meal_slot] || SLOT_LABELS_BN.other)
              : (SLOT_LABELS_EN[group.meal_slot] || SLOT_LABELS_EN.other);

            const combinedFoodNames = group.food_names.join(', ');

            return (
              <View key={group.meal_slot} style={styles.loggedCard}>
                <View style={styles.loggedCardTop}>
                  <View style={styles.loggedCardLeft}>
                    <View style={styles.loggedIconBox}>
                      <Utensils size={14} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.loggedFoodName} numberOfLines={2}>
                        {combinedFoodNames}
                      </Text>
                      <View style={styles.loggedMetaRow}>
                        <Text style={styles.loggedSlotLabel}>{slotLabel}</Text>
                        {time ? <Text style={styles.loggedMetaSep}>•</Text> : null}
                        {time ? <Text style={styles.loggedTime}>{time}</Text> : null}
                      </View>
                    </View>
                  </View>

                  <View style={styles.loggedCardRight}>
                    <Text style={styles.loggedCalText}>{group.total_calories} kcal</Text>
                    
                    <TouchableOpacity
                      style={styles.loggedDeleteBtn}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      onPress={() => {
                        haptics.light();
                        setIdsToDelete(group.ids);
                        setSlotToDelete(group.meal_slot);
                        setDeleteConfirmVisible(true);
                      }}
                      disabled={deleteLogMutation.isPending}
                    >
                      <Trash2 size={13} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Macro Badges */}
                {group.macros && (group.macros.protein_g > 0 || group.macros.carbs_g > 0 || group.macros.fat_g > 0) && (
                  <View style={styles.loggedMacrosRow}>
                    {group.macros.protein_g > 0 && (
                      <View style={styles.loggedMacroBadge}>
                        <Text style={styles.loggedMacroText}>
                          💪 {isBn ? 'প্রোটিন' : 'Protein'}: {Math.round(group.macros.protein_g)}g
                        </Text>
                      </View>
                    )}
                    {group.macros.carbs_g > 0 && (
                      <View style={styles.loggedMacroBadge}>
                        <Text style={styles.loggedMacroText}>
                          🍞 {isBn ? 'কার্বস' : 'Carbs'}: {Math.round(group.macros.carbs_g)}g
                        </Text>
                      </View>
                    )}
                    {group.macros.fat_g > 0 && (
                      <View style={styles.loggedMacroBadge}>
                        <Text style={styles.loggedMacroText}>
                          🥑 {isBn ? 'ফ্যাট' : 'Fat'}: {Math.round(group.macros.fat_g)}g
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {groups.length > 2 && (
          <TouchableOpacity
            style={styles.seeMoreBtn}
            onPress={() => { haptics.light(); setShowAllLogs(!showAllLogs); }}
            activeOpacity={0.8}
          >
            <Text style={styles.seeMoreText}>
              {showAllLogs 
                ? (isBn ? 'কম দেখান ▲' : 'Show Less ▲') 
                : (isBn ? `আরও দেখুন (${groups.length - 2}টি) ▼` : `See More (${groups.length - 2} more) ▼`)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Render Tomorrow Tab ────────────────────────────────────────────────────
  const renderTomorrow = () => {
    if (!isPro) return null; // Guarded by UI lock

    if (tomorrowQ.isLoading && !refreshing) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{language === 'bn' ? 'আগামীকালের পরিকল্পনা লোড হচ্ছে...' : 'Loading tomorrow\'s plan...'}</Text>
        </View>
      );
    }

    const plan = tomorrowQ.data;
    if (!plan || plan.error) {
      return (
        <View style={styles.emptyState}>
          <Image source={require('../../assets/pusti_bot.png')} style={styles.emptyIllustration} resizeMode="contain" />
          <Text style={styles.emptyTitle}>{language === 'bn' ? 'আগামীকালের পরিকল্পনা নেই' : 'No plan for tomorrow'}</Text>
          <Text style={styles.emptyText}>
            {language === 'bn' ? 'আগামীকালের খাবারের তালিকা দেখতে এআই পরিকল্পনা তৈরি করুন।' : 'Generate an AI plan to view tomorrow\'s meal list.'}
          </Text>

          <TouchableOpacity
            style={[styles.generateBtn, generatingTomorrow && styles.generateBtnDisabled]}
            disabled={generatingTomorrow}
            onPress={async () => {
              haptics.medium();
              setGeneratingTomorrow(true);
              try {
                await mealPlanApi.daily(language, true, 1);
                queryClient.invalidateQueries({ queryKey: ['daily_plan', 1] });
                await tomorrowQ.refetch();
              } catch {
                Alert.alert(
                  language === 'bn' ? 'ত্রুটি' : 'Error',
                  language === 'bn' ? 'পরিকল্পনা তৈরি করতে পারেনি। পরে আবার চেষ্টা করুন।' : 'Failed to generate plan. Please try again later.'
                );
              } finally {
                setGeneratingTomorrow(false);
              }
            }}
          >
            {generatingTomorrow ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <View style={styles.btnIconRow}>
                <Sparkles size={18} color={colors.white} strokeWidth={2} />
                <Text style={styles.generateBtnText}>{language === 'bn' ? 'আগামীকালের পরিকল্পনা তৈরি করুন' : 'Generate Tomorrow\'s Plan'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    const planData = plan.plan_data;
    const planId = plan.plan_id;
    const completedSlots = getCompletedSlots(plan);

    return (
      <View style={styles.tabContent}>
        <View style={styles.daySummary}>
          <View style={styles.daySummaryLeft}>
            <CalendarDays size={18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.dayTitle}>{language === 'bn' ? 'আগামীকালের খাবার তালিকা' : 'Tomorrow\'s Meal List'}</Text>
          </View>
          <View style={styles.daySummaryRight}>
            <Text style={styles.dayCalTarget}>{planData?.target_calories} kcal</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.regeneratePlanBtn, { flex: 1 }, !isPro && styles.regeneratePlanBtnPro]}
            onPress={() => regeneratePlan(1)}
            disabled={generatingTomorrow}
          >
            {generatingTomorrow ? (
              <ActivityIndicator size="small" color={isPro ? colors.primary : colors.white} />
            ) : (
              <>
                {isPro ? (
                  <RefreshCw size={13} color={colors.primary} />
                ) : (
                  <Crown size={13} color={colors.white} />
                )}
                <Text style={[styles.regeneratePlanText, !isPro && styles.regeneratePlanTextPro]}>
                  {language === 'bn' ? 'পুনরায় তৈরি করুন' : 'Regenerate Plan'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {(planData?.meals || []).map((meal: any) =>
          renderMealCard(meal, planId, completedSlots, false)
        )}
      </View>
    );
  };

  // ── Render History Tab ─────────────────────────────────────────────────────
  const renderHistory = () => {
    if (historyQ.isLoading && !refreshing) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{language === 'bn' ? 'ইতিহাস লোড হচ্ছে...' : 'Loading history...'}</Text>
        </View>
      );
    }

    const plans = historyQ.data || [];
    
    // History should strictly show past days (before today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pastPlans = plans.filter((item: any) => {
      if (!item.plan_date) return false;
      const planDate = new Date(item.plan_date);
      planDate.setHours(0, 0, 0, 0);
      return planDate.getTime() < today.getTime();
    });

    if (pastPlans.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Image source={require('../../assets/pusti_bot.png')} style={styles.emptyIllustration} resizeMode="contain" />
          <Text style={styles.emptyTitle}>{language === 'bn' ? 'কোনো ইতিহাস পাওয়া যায়নি' : 'No history found'}</Text>
          <Text style={styles.emptyText}>
            {language === 'bn' 
              ? 'খাবার গ্রহণের নিয়মিত ট্র্যাকিং শুরু করলে এখানে তালিকা দেখতে পাবেন।' 
              : 'Once you start tracking your food intake regularly, you will see the history here.'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        {pastPlans.map((item: any, idx: number) => {
          const planData = item.plan_data;
          const planId = item.plan_id;
          const completedSlots = getCompletedSlots(item);
          const date = item.plan_date ? new Date(item.plan_date) : new Date();
          const isExpanded = expandedHistoryId === planId;

          return (
            <View key={planId || idx} style={styles.historyCard}>
              <TouchableOpacity
                style={styles.historyCardHeader}
                onPress={() => {
                  haptics.light();
                  setExpandedHistoryId(isExpanded ? null : planId);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.historyMeta}>
                  <Text style={styles.historyDate}>
                    {date.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyCal}>{planData?.target_calories} kcal</Text>
                  {isExpanded
                    ? <ChevronUp size={18} color={colors.textSecondary} />
                    : <ChevronDown size={18} color={colors.textSecondary} />}
                </View>
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.historyCardBody}>
                  {(planData?.meals || []).map((meal: any) =>
                    renderMealCard(meal, planId, completedSlots, false)
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sticky Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>{language === 'bn' ? 'খাবার পরিকল্পনা' : 'Meal Plan'}</Text>
        <View style={styles.tabBar}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            const isLocked = id === 'tomorrow' && !isPro;

            let localizedLabel = label;
            if (id === 'today') localizedLabel = language === 'bn' ? 'আজকের খাবার' : 'Today\'s Meals';
            else if (id === 'tomorrow') localizedLabel = language === 'bn' ? 'আগামীকাল' : 'Tomorrow';
            else if (id === 'history') localizedLabel = language === 'bn' ? 'ইতিহাস' : 'History';

            return (
              <TouchableOpacity
                key={id}
                style={[styles.tab, isActive && styles.tabActive, isLocked && { opacity: 0.85 }]}
                onPress={() => {
                  haptics.light();
                  if (isLocked) {
                    setProTrigger('tomorrow');
                    setShowProModal(true);
                    return;
                  }
                  setActiveTab(id);
                }}
                activeOpacity={0.8}
              >
                <Icon
                  size={16}
                  color={isActive ? colors.primary : colors.textSecondary}
                  strokeWidth={2.2}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {localizedLabel}
                </Text>
                {isLocked && (
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {activeTab === 'today' && renderToday()}
        {activeTab === 'tomorrow' && renderTomorrow()}
        {activeTab === 'history' && renderHistory()}
      </ScrollView>

      {/* FAB — Manual Food Log */}
      {activeTab === 'today' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => { haptics.light(); setShowManualLog(true); }}
          activeOpacity={0.85}
        >
          <Plus size={20} color={colors.white} strokeWidth={2.5} />
          <Text style={styles.fabText}>{language === 'bn' ? 'খাবার যোগ' : 'Add Food'}</Text>
        </TouchableOpacity>
      )}

      {/* Manual Food Log Modal */}
      <ManualFoodLogModal
        visible={showManualLog}
        onClose={() => setShowManualLog(false)}
        onLogged={() => { todayQ.refetch(); todayLogsQ.refetch(); }}
        language={language === 'bn' ? 'bn' : 'en'}
      />

      {/* Pro upgrade modal */}
      <ProModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        trigger={proTrigger}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isBn ? 'খাবারটি ডিলিট করতে চান?' : 'Delete logged food?'}</Text>
            <Text style={styles.modalMessage}>{isBn ? 'এই রেকর্ডটি আপনার আজকের ডায়েরি থেকে মুছে ফেলা হবে।' : 'This record will be permanently deleted from today\'s journal.'}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => { haptics.light(); setDeleteConfirmVisible(false); setSlotToDelete(null); }}
              >
                <Text style={styles.cancelButtonText}>{isBn ? 'বাতিল' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.deleteButton]} 
                onPress={() => {
                  haptics.medium();
                  if (idsToDelete) {
                    deleteLogMutation.mutate(idsToDelete);
                  }
                  const todayPlanId = todayQ.data?.plan_id;
                  if (slotToDelete && todayPlanId) {
                    markMutation.mutate({ planId: todayPlanId, slot: slotToDelete, completed: false, items: [] });
                  }
                  setDeleteConfirmVisible(false);
                  setSlotToDelete(null);
                }}
              >
                <Text style={styles.deleteButtonText}>{isBn ? 'ডিলিট করুন' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 30,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 100,
  },
  fabText: { fontFamily: fonts.bnBold, fontSize: 14, color: colors.white },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  screenTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 28,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: 4,
  },
  tabActive: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  tabText: {
    fontFamily: fonts.bnBold,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  proBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  proBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 7.5,
    color: colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  tabContent: {
    flex: 1,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fonts.bn,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: spacing.md,
  },
  emptyIllustration: {
    width: 80,
    height: 80,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  emptyText: {
    fontFamily: fonts.bn,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 24,
  },
  generateBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    fontFamily: fonts.bnBold,
    fontSize: 17,
    color: colors.white,
  },
  askAiBtn: {
    width: '100%',
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  askAiBtnText: {
    fontFamily: fonts.bnBold,
    fontSize: 16,
    color: colors.primary,
  },
  daySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  daySummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  daySummaryRight: {
    alignItems: 'flex-end',
  },
  dayProgress: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.success,
  },
  dayCalTarget: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.primary,
  },
  progressBg: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  targetDetailsBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '12', // Highlighted premium background
    borderColor: colors.primary, // Highlighted border
    borderWidth: 1.5, // Highlighted border width
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    gap: 6,
  },
  targetDetailsText: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.primaryDark, // Readability optimized
  },
  btnIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  regeneratePlanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary + '30',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.xs,
  },
  regeneratePlanBtnPro: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  regeneratePlanText: {
    fontFamily: fonts.bnBold,
    fontSize: 12,
    color: colors.primary,
  },
  regeneratePlanTextPro: {
    color: colors.white,
  },
  mealCard: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.25)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  mealCardDone: {
    borderColor: colors.success + '60',
    backgroundColor: colors.success + '0A',
  },
  mealRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  mealTitleGroup: {
    flex: 1,
  },
  mealSlot: {
    fontFamily: fonts.bnBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  mealTime: {
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  mealActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.accent + '18',
  },
  checkBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  foodList: {
    marginVertical: spacing.sm,
    gap: 6,
  },
  webFoodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  webFoodEmojiBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  webFoodEmoji: {
    fontSize: 16,
  },
  webFoodInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 6,
  },
  webFoodName: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  webFoodMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  webFoodWeight: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.accent,
  },
  webFoodLabel: {
    fontFamily: fonts.bn,
    fontSize: 10,
    color: colors.textSecondary,
  },
  webFoodSources: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  webFoodRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  webFoodCalBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  webFoodCalText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textSecondary,
  },
  webFoodInfoBtn: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webFoodInfoText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 13,
  },
  webFoodCheckBtn: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webFoodCheckBtnActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  justificationLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    marginTop: 4,
    gap: 8,
  },
  justificationLoadingText: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
  },
  justificationBox: {
    padding: 12,
    backgroundColor: colors.accent + '08',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent + '15',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 1,
    elevation: 0.5,
  },
  justificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  justificationPing: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  justificationTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.accent,
  },
  justificationText: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  compactSourceCircle: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.95,
  },
  compactSourceAbbr: {
    fontFamily: fonts.bodyBold,
    fontSize: 7,
    color: colors.white,
    lineHeight: 8.5,
  },
  calBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '18',
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  calText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  webFoodSwapBtn: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitleText: {
    fontFamily: fonts.bnBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fonts.bodyBold,
  },
  currentFoodBanner: {
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currentFoodLabel: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  currentFoodName: {
    fontFamily: fonts.bnBold,
    fontSize: 15,
    color: colors.accent,
  },
  suggestedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  suggestedTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  modalLoadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  modalLoadingText: {
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalEmptyBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textSecondary,
  },
  singleSuggestionContainer: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  suggestionCardBig: {
    backgroundColor: '#F9FAFB',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  suggestionCardGroupText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.primary,
    backgroundColor: colors.primary + '12',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  suggestionCardProgressText: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  suggestionCardNameText: {
    fontFamily: fonts.bnBold,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  suggestionMacrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  macroPill: {
    alignItems: 'center',
  },
  macroPillLabel: {
    fontFamily: fonts.bn,
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  macroPillVal: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  suggestionActionsRow: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  suggestionAcceptBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionAcceptBtnText: {
    fontFamily: fonts.bnBold,
    fontSize: 15,
    color: colors.white,
  },
  suggestionNextBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionNextBtnText: {
    fontFamily: fonts.bnBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  historyCard: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.25)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyDate: {
    fontFamily: fonts.bnBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyCal: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.primary,
  },
  historyCardBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  loggedSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(167, 201, 36, 0.15)',
    marginBottom: spacing.xxl,
  },
  loggedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loggedSectionTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  loggedTotalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '18',
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  loggedTotalText: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.primary,
  },
  loggedList: {
    gap: spacing.sm,
  },
  loggedCard: {
    backgroundColor: colors.glass,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.15)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  loggedCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loggedCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loggedIconBox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loggedFoodName: {
    fontFamily: fonts.bnBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  loggedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  loggedSlotLabel: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
  },
  loggedMetaSep: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
    marginHorizontal: 4,
  },
  loggedTime: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
  },
  loggedCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  loggedCalText: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textPrimary,
  },
  loggedDeleteBtn: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.error + '10',
  },
  loggedMacrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  loggedMacroBadge: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  loggedMacroText: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
  },
  seeMoreBtn: {
    marginTop: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.primary + '10',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  seeMoreText: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: fonts.bn,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButton: {
    backgroundColor: '#FAFBF7',
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  cancelButtonText: {
    fontFamily: fonts.bnBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  deleteButtonText: {
    fontFamily: fonts.bnBold,
    fontSize: 14,
    color: colors.white,
  },
});
