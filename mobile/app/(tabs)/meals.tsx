import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, ActivityIndicator, Alert, Image
} from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { colors, fonts, spacing, radius } from '../../lib/theme';
import {
  CalendarDays, Check, ArrowLeftRight,
  ChevronDown, ChevronUp, RefreshCw, Flame, History, Crown,
  BarChart2, MessageSquare, Sparkles
} from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { mealPlanApi, foodsApi } from '../../lib/api';
import { useSubscription } from '../../context/SubscriptionContext';
import ProModal from '../../components/ui/ProModal';

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

const SLOT_TIMES: Record<string, string> = {
  breakfast: 'সকাল ৭টা',
  morning_snack: 'সকাল ১০টা',
  lunch: 'দুপুর ১টা',
  evening_snack: 'বিকেল ৪টা',
  dinner: 'রাত ৮টা',
};

export default function MealsScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [generatingToday, setGeneratingToday] = useState(false);
  const [generatingTomorrow, setGeneratingTomorrow] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pro features integration
  const { isPro } = useSubscription();
  const [showProModal, setShowProModal] = useState(false);
  const [proTrigger, setProTrigger] = useState<'chat_limit' | 'regenerate' | 'tomorrow' | 'general'>('general');

  const queryClient = useQueryClient();
  const haptics = useHaptics();
  const router = useRouter();

  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [justificationLoading, setJustificationLoading] = useState<Record<string, boolean>>({});

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
      setJustifications((prev) => ({ ...prev, [cacheKey]: data.explanation || 'বিশ্লেষণ লোড করা সম্ভব হয়নি।' }));
    } catch (e) {
      setJustifications((prev) => ({ ...prev, [cacheKey]: 'বিশ্লেষণ লোড করতে সমস্যা হয়েছে।' }));
    } finally {
      setJustificationLoading((prev) => ({ ...prev, [cacheKey]: false }));
    }
  };

  // ── Queries ────────────────────────────────────────────────────────────────
  const todayQ = useQuery({
    queryKey: ['daily_plan', 0],
    queryFn: async () => (await mealPlanApi.daily('bn', false, 0)).data,
    enabled: activeTab === 'today',
  });

  const tomorrowQ = useQuery({
    queryKey: ['daily_plan', 1],
    queryFn: async () => (await mealPlanApi.daily('bn', false, 1)).data,
    enabled: activeTab === 'tomorrow' && isPro, // Query tomorrow plan only if user is pro
  });

  const historyQ = useQuery({
    queryKey: ['history_plans'],
    queryFn: async () => (await mealPlanApi.history()).data,
    enabled: activeTab === 'history',
  });

  // ── Mutation: Mark Complete ────────────────────────────────────────────────
  const markMutation = useMutation({
    mutationFn: async ({ planId, slot, completed }: { planId: string; slot: string; completed: boolean }) => {
      return mealPlanApi.markComplete(planId, slot, completed);
    },
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['daily_plan', 0] });
    },
    onError: () => haptics.error(),
  });

  // ── Refresh Handler ────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'today') await todayQ.refetch();
    else if (activeTab === 'tomorrow' && isPro) await tomorrowQ.refetch();
    else if (activeTab === 'history') await historyQ.refetch();
    setRefreshing(false);
  }, [activeTab, isPro]);

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
      params: { prefill: `আমি আমার খাবার তালিকা থেকে "${items.join(' • ')}" পরিবর্তন করে বিকল্প খাবারের পরামর্শ চাই।` }
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
      await mealPlanApi.daily('bn', true, offset); // force = true
      queryClient.invalidateQueries({ queryKey: ['daily_plan', offset] });
      if (offset === 0) await todayQ.refetch();
      else await tomorrowQ.refetch();
      haptics.success();
    } catch {
      Alert.alert('ত্রুটি', 'পরিকল্পনা তৈরি করতে পারেনি। পরে আবার চেষ্টা করুন।');
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
            <Text style={styles.mealSlot}>{meal.slot_bn || meal.slot}</Text>
            <Text style={styles.mealTime}>{SLOT_TIMES[meal.slot] || ''}</Text>
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
                  markMutation.mutate({ planId, slot: meal.slot, completed: !isCompleted });
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
                          <Text style={styles.webFoodLabel}>পাওয়া যাবে:</Text>
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

                    {/* Checkbox Button */}
                    <TouchableOpacity
                      style={[styles.webFoodCheckBtn, isCompleted && styles.webFoodCheckBtnActive]}
                      onPress={() => {
                        haptics.light();
                        markMutation.mutate({ planId, slot: meal.slot, completed: !isCompleted });
                      }}
                      disabled={markMutation.isPending}
                    >
                      <Check size={10} color={isCompleted ? colors.white : 'rgba(0,0,0,0.15)'} strokeWidth={4.5} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Collapsible Justification Panels */}
                {justificationLoading[foodKey] && (
                  <View style={styles.justificationLoadingBox}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={styles.justificationLoadingText}>বিশ্লেষণ লোড হচ্ছে...</Text>
                  </View>
                )}

                {justifications[foodKey] && (
                  <View style={styles.justificationBox}>
                    <View style={styles.justificationHeader}>
                      <View style={styles.justificationPing} />
                      <Text style={styles.justificationTitle}>ডায়েটিশিয়ান বিশ্লেষণ (RAG Insight):</Text>
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
          <Text style={styles.loadingText}>আজকের পরিকল্পনা লোড হচ্ছে...</Text>
        </View>
      );
    }

    const plan = todayQ.data;
    if (!plan || plan.error) {
      return (
        <View style={styles.emptyState}>
          <Image source={require('../../assets/pusti_bot.png')} style={styles.emptyIllustration} resizeMode="contain" />
          <Text style={styles.emptyTitle}>আজকের পরিকল্পনা নেই</Text>
          <Text style={styles.emptyText}>
            আপনার স্বাস্থ্য অবস্থা ও পছন্দ অনুযায়ী এআই একটি ব্যক্তিগত খাবার পরিকল্পনা তৈরি করবে।
          </Text>

          <TouchableOpacity
            style={[styles.generateBtn, generatingToday && styles.generateBtnDisabled]}
            disabled={generatingToday}
            onPress={async () => {
              haptics.medium();
              setGeneratingToday(true);
              try {
                await mealPlanApi.daily('bn', true, 0);
                queryClient.invalidateQueries({ queryKey: ['daily_plan', 0] });
                await todayQ.refetch();
              } catch {
                Alert.alert('ত্রুটি', 'পরিকল্পনা তৈরি করতে পারেনি। পরে আবার চেষ্টা করুন।');
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
                <Text style={styles.generateBtnText}>এআই পরিকল্পনা তৈরি করুন</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.askAiBtn}
            onPress={() => {
              haptics.light();
              router.push({
                pathname: '/(tabs)/chat',
                params: { prefill: 'আজকের জন্য আমার স্বাস্থ্য অবস্থা অনুযায়ী একটি খাবার পরিকল্পনা দিন।' }
              });
            }}
          >
            <View style={styles.btnIconRow}>
              <MessageSquare size={16} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.askAiBtnText}>এআই-এর সাথে কথা বলুন</Text>
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

    return (
      <View style={styles.tabContent}>
        <View style={styles.daySummary}>
          <View style={styles.daySummaryLeft}>
            <CalendarDays size={18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.dayTitle}>আজকের খাবার</Text>
          </View>
          <View style={styles.daySummaryRight}>
            <Text style={styles.dayProgress}>{completedCount}/{totalMeals} সম্পন্ন</Text>
            <Text style={styles.dayCalTarget}>{planData?.target_calories} kcal</Text>
          </View>
        </View>

        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${totalMeals > 0 ? (completedCount / totalMeals) * 100 : 0}%` }]} />
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
            <Text style={styles.targetDetailsText}>বিশ্লেষণ ও লক্ষ্য</Text>
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
                  পুনরায় তৈরি
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {(planData?.meals || []).map((meal: any) =>
          renderMealCard(meal, planId, completedSlots, true)
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
          <Text style={styles.loadingText}>আগামীকালের পরিকল্পনা লোড হচ্ছে...</Text>
        </View>
      );
    }

    const plan = tomorrowQ.data;
    if (!plan || plan.error) {
      return (
        <View style={styles.emptyState}>
          <Image source={require('../../assets/pusti_bot.png')} style={styles.emptyIllustration} resizeMode="contain" />
          <Text style={styles.emptyTitle}>আগামীকালের পরিকল্পনা নেই</Text>
          <Text style={styles.emptyText}>
            আগামীকালের খাবারের তালিকা দেখতে এআই পরিকল্পনা তৈরি করুন।
          </Text>

          <TouchableOpacity
            style={[styles.generateBtn, generatingTomorrow && styles.generateBtnDisabled]}
            disabled={generatingTomorrow}
            onPress={async () => {
              haptics.medium();
              setGeneratingTomorrow(true);
              try {
                await mealPlanApi.daily('bn', true, 1);
                queryClient.invalidateQueries({ queryKey: ['daily_plan', 1] });
                await tomorrowQ.refetch();
              } catch {
                Alert.alert('ত্রুটি', 'পরিকল্পনা তৈরি করতে পারেনি। পরে আবার চেষ্টা করুন।');
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
                <Text style={styles.generateBtnText}>আগামীকালের পরিকল্পনা তৈরি করুন</Text>
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
            <Text style={styles.dayTitle}>আগামীকালের খাবার তালিকা</Text>
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
                  পুনরায় তৈরি করুন
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
          <Text style={styles.loadingText}>ইতিহাস লোড হচ্ছে...</Text>
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
          <Text style={styles.emptyTitle}>কোনো ইতিহাস পাওয়া যায়নি</Text>
          <Text style={styles.emptyText}>খাবার গ্রহণের নিয়মিত ট্র্যাকিং শুরু করলে এখানে তালিকা দেখতে পাবেন।</Text>
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
                    {date.toLocaleDateString('bn-BD', { weekday: 'short', month: 'long', day: 'numeric' })}
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
        <Text style={styles.screenTitle}>খাবার পরিকল্পনা</Text>
        <View style={styles.tabBar}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            const isLocked = id === 'tomorrow' && !isPro;

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
                  {label}
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

      {/* Pro upgrade modal */}
      <ProModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        trigger={proTrigger}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
});
