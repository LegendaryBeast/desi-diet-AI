import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coffee,
  Utensils,
  Apple,
  Moon,
  RefreshCw,
  Info,
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
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { mealPlanApi, type MealPlanResponse, foodsApi, type FoodSearchResponse } from '../lib/api';

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

const CookingAnimation = () => (
  <div className="relative w-24 h-24 flex flex-col items-center justify-end mb-4">
    {/* Steam */}
    <div className="absolute top-2 flex gap-3 z-0">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -20],
            x: [0, i % 2 === 0 ? -5 : 5, 0],
            opacity: [0, 0.5, 0],
            scale: [0.8, 1.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeOut"
          }}
          className="w-2 h-6 bg-ink-muted/30 rounded-full blur-[2px]"
        />
      ))}
    </div>
    
    {/* Pot */}
    <motion.div 
      animate={{ y: [0, -3, 0], rotate: [-2, 2, -2] }}
      transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
      className="relative z-10 w-16 h-10 bg-ink rounded-b-2xl rounded-t-sm border-t-4 border-ink shadow-lg flex items-center justify-center mt-6"
    >
      <div className="absolute -left-2 top-1.5 w-3 h-2 bg-ink rounded-l-md" />
      <div className="absolute -right-2 top-1.5 w-3 h-2 bg-ink rounded-r-md" />
      
      {/* Food inside pot (bouncing) */}
      <div className="absolute -top-3 flex gap-1 items-end">
        <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }} className="w-3 h-3 bg-amber-400 rounded-full" />
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} className="w-4 h-4 bg-green-400 rounded-lg" />
        <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 0.4, repeat: Infinity, delay: 0.2 }} className="w-3 h-3 bg-red-400 rounded-full" />
      </div>
    </motion.div>

    {/* Flame */}
    <div className="absolute -bottom-3 flex justify-center items-end text-accent z-20">
      <motion.div animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.7, 1, 0.7] }} transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}>
        <Flame className="w-5 h-5 -rotate-12" />
      </motion.div>
      <motion.div animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.8, 1, 0.8] }} transition={{ duration: 0.3, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}>
        <Flame className="w-7 h-7 -mt-1" />
      </motion.div>
      <motion.div animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.7, 1, 0.7] }} transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}>
        <Flame className="w-5 h-5 rotate-12" />
      </motion.div>
    </div>
  </div>
);

export const MealPlan = () => {
  const { profileData } = useAuth();
  const [tab, setTab] = useState<Tab>('today');
  const [showNutrients, setShowNutrients] = useState(false);
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
    try {
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
    } catch {
      // Fallback
      setHistoryPlans((prev) =>
        prev.map((p) => {
          if (p.plan_id === targetPlan.plan_id) {
            const nextCompleted = isComplete
              ? (p.completed_slots || []).filter((s) => s !== slot)
              : [...(p.completed_slots || []), slot];
            return { ...p, completed_slots: nextCompleted };
          }
          return p;
        })
      );
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
    const consumedCal = meals
      .filter((m) => (p.completed_slots || []).includes(m.slot))
      .reduce((acc, m) => acc + (m.items || []).reduce((s, item) => s + (item.calories || 0), 0), 0);
    
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
        <header className="bg-white p-3.5 rounded-xl shadow-sm border border-ink/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
          <div className="min-w-0">
            <h1 className="font-bn text-base font-bold text-ink leading-tight">
              আজকের ডায়েট প্ল্যান
            </h1>
            <p className="font-bn text-[0.7rem] text-ink-muted leading-tight mt-0.5">
              {new Date(p.plan_date).toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Calorie & Macro Horizontal Bars */}
          <div className="flex-1 max-w-md bg-cream/40 px-3 py-2 rounded-lg border border-ink/5 space-y-1.5">
            <div className="flex justify-between items-center text-[0.68rem] font-bn">
              <span className="font-bold text-ink">ক্যালোরি গ্রহণ</span>
              <span className="text-ink-muted"><span className="text-accent font-bold">{consumedCal}</span> / {totalCal} kcal ({pct}%)</span>
            </div>
            <div className="w-full h-1.5 bg-cream rounded-full overflow-hidden border border-ink/5">
              <div className="h-full bg-accent transition-all duration-700 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            {/* Minimal Horizontal Macros */}
            {targets && (
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-ink/5 text-[0.62rem] font-bn text-ink-muted">
                <div>শর্করা: <b>{targets.carbs_g}g</b></div>
                <div>প্রোটিন: <b>{targets.protein_g}g</b></div>
                <div>চর্বি: <b>{targets.fat_g}g</b></div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0">
            {isToday && (
              <>
                {isEditing ? (
                  <div className="flex gap-1.5">
                    <button onClick={() => setIsEditing(false)} className="text-[0.68rem] font-bn font-bold px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1">
                      <X className="w-3 h-3" /> বাতিল
                    </button>
                    <button onClick={saveEdits} disabled={savingEdit} className="text-[0.68rem] font-bn font-bold px-3 py-1.5 bg-ink text-cream rounded-lg hover:bg-accent transition-colors flex items-center gap-1">
                      {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} সেভ
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => regenerateDaily(tab === 'today' ? 0 : 1)}
                      disabled={loading}
                      className="text-[0.68rem] font-bn font-bold px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> রি-জেনারেট
                    </button>
                    <button onClick={() => setIsEditing(true)} className="text-[0.68rem] font-bn font-bold px-3 py-1.5 border border-ink/10 text-ink rounded-lg hover:bg-ink/5 transition-colors flex items-center gap-1">
                      <Edit2 className="w-3 h-3" /> কাস্টমাইজ
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </header>

        {/* Micronutrients checklist target */}
        {p.plan_data && (p.plan_data as any).micronutrient_targets && (p.plan_data as any).micronutrient_targets.length > 0 && (() => {
          const allNutrients: any[] = (p.plan_data as any).micronutrient_targets;

          const VITAMIN_NAMES = [
            "Vitamin A", "Ascorbic acids (C)", "Vitamin D", "Vitamin E", "Vitamin K",
            "Thiamine (B1)", "Riboflavin (B2)", "Niacin (B3)", "Total B6", "Folate (total)",
            "Pantothenic acid (B5)", "Biotin (B7)"
          ];
          const EXCLUDE_NAMES = ["Choline", "Vitamin B12", "Chloride (Cl)", "Iodine (I)"];
          const FATTY_NAMES = ["Cis ω-6 Fatty acids", "Cis ω-3 Fatty acids"];

          const vitamins = allNutrients.filter(n => VITAMIN_NAMES.includes(n.name));
          const minerals = allNutrients.filter(n => !VITAMIN_NAMES.includes(n.name) && !FATTY_NAMES.includes(n.name) && !EXCLUDE_NAMES.includes(n.name));
          const fatty = allNutrients.filter(n => FATTY_NAMES.includes(n.name));

          const groups = [
            { id: 'vitamins', label: 'ভিটামিন', labelEn: 'Vitamins', items: vitamins, color: 'bg-amber-500', light: 'bg-amber-50', border: 'border-amber-200' },
            { id: 'minerals', label: 'খনিজ', labelEn: 'Minerals', items: minerals, color: 'bg-blue-500', light: 'bg-blue-50', border: 'border-blue-200' },
            { id: 'fats', label: 'ফ্যাটি অ্যাসিড', labelEn: 'Fatty Acids', items: fatty, color: 'bg-green-500', light: 'bg-green-50', border: 'border-green-200' },
          ];

          const NutrientCard = ({ nut, accentColor }: { nut: any; accentColor: string }) => {
            let barColor = accentColor;
            if (nut.percentage >= 100) barColor = "bg-green-500";
            else if (nut.percentage >= 50) barColor = "bg-amber-500";
            else if (nut.percentage > 0) barColor = accentColor;
            else barColor = "bg-ink/10";

            return (
              <div className="bg-white p-2 rounded-lg border border-ink/5 hover:border-accent/20 transition-all flex flex-col justify-between space-y-1.5">
                <div className="flex justify-between items-start gap-1">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bn font-bold text-[0.62rem] text-ink leading-tight truncate">{nut.name_bn}</h3>
                    <span className="text-[0.5rem] text-ink-faint uppercase font-bold tracking-wider truncate block">{nut.name}</span>
                  </div>
                  <span className={`font-display text-[0.62rem] font-bold shrink-0 px-1 rounded ${nut.percentage >= 100 ? 'text-green-700 bg-green-50' : nut.percentage >= 50 ? 'text-amber-700 bg-amber-50' : 'text-ink-muted bg-cream'}`}>
                    {nut.percentage}%
                  </span>
                </div>

                <div className="space-y-0.5">
                  <div className="w-full bg-cream rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all duration-700 rounded-full`}
                      style={{ width: `${Math.min(100, nut.percentage)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[0.55rem] font-bn text-ink-faint">
                    <span>{nut.consumed}/{nut.target} {nut.unit}</span>
                  </div>
                </div>
              </div>
            );
          };

          return (
            <div className="bg-white p-3 rounded-xl shadow-sm border border-ink/5 space-y-2.5">
              <button
                onClick={() => setShowNutrients(!showNutrients)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-3 bg-accent rounded-full" />
                  <h2 className="font-display text-xs font-bold text-ink">
                    পুষ্টি উপাদান ট্র্যাকার (Micronutrient Tracker)
                  </h2>
                </div>
                <span className="text-[0.68rem] font-bn text-accent font-bold hover:underline">
                  {showNutrients ? 'লুকান' : 'বিস্তারিত দেখুন'}
                </span>
              </button>

              {showNutrients && (
                <div className="space-y-3 pt-2 border-t border-ink/5">
                  {/* Summary pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {groups.map(g => {
                      const met = g.items.filter(n => n.percentage >= 100).length;
                      return (
                        <div key={g.id} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${g.border} ${g.light}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${g.color}`} />
                          <span className="font-bn text-[0.62rem] font-bold text-ink">{g.label}</span>
                          <span className="text-[0.62rem] text-ink-faint">({met}/{g.items.length} পূর্ণ)</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Groups */}
                  {groups.map(g => g.items.length > 0 && (
                    <div key={g.id} className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${g.color}`} />
                        <h3 className="font-display font-black text-[0.68rem] text-ink">{g.label}</h3>
                        <div className="flex-1 h-px bg-ink/5" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                        {g.items.map((nut, i) => (
                          <NutrientCard key={i} nut={nut} accentColor={g.color} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`bg-white rounded-xl p-3 border transition-all group shadow-sm ${
                  isDone ? 'border-green-200 bg-green-50/30' : 'border-ink/5 hover:border-accent/10'
                }`}
              >
                <div className="flex flex-col lg:flex-row gap-3">
                  {/* Slot info */}
                  <div className="lg:w-32 flex lg:flex-col items-center lg:items-start justify-between border-b lg:border-b-0 lg:border-r border-ink/5 pb-2 lg:pb-0 lg:pr-3">
                    <div className="flex items-center gap-2">
                      <div className={`bg-cream p-1.5 rounded-lg ${isDone ? 'bg-green-100' : 'group-hover:bg-ink group-hover:text-cream'} transition-colors shrink-0`}>
                        {isDone ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <SlotIcon className={`w-4 h-4 ${slotColor}`} />}
                      </div>
                      <div className="lg:mt-0">
                        <div className="font-bn text-xs font-bold text-ink">{slot.slot_bn || slot.slot}</div>
                        <div className="font-mono text-[0.62rem] text-ink-faint leading-none mt-0.5">
                          {(slot.items || []).reduce((sum, item) => sum + (item.calories || 0), 0)} kcal
                        </div>
                      </div>
                    </div>
                    {showToggle && !isFuturePlan(p.plan_date) && (
                      <button
                        onClick={() => toggleSlotForPlan(p, slot.slot)}
                        className={`mt-2 lg:mt-3 text-[0.68rem] font-bn font-bold px-2.5 py-1 rounded-lg transition-all ${
                          isDone
                            ? 'bg-green-500 text-white hover:bg-red-400'
                            : 'bg-cream text-ink-muted hover:bg-accent hover:text-white'
                        }`}
                      >
                        {isDone ? '✓ সম্পন্ন' : 'সম্পন্ন করুন'}
                      </button>
                    )}
                  </div>

                  {/* Food items */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(slot.items || []).map((food, j) => {
                      const foodCode = food.food_code || food.code || food.name_en || food.name_bn || '';
                      const foodName = food.name_bn || food.name_en;
                      const hasJustification = !!justifications[foodCode];

                      return (
                        <div
                          key={j}
                          className="flex flex-col p-3 bg-white/60 hover:bg-white rounded-xl border border-ink/5 hover:border-accent/15 transition-all shadow-sm relative group/item"
                        >
                          <div className="flex items-start justify-between w-full">
                            <div className="flex-1 pr-2">
                              <div className="font-bn text-ink font-bold text-xs flex items-center gap-1.5 flex-wrap">
                                <span>{foodName}</span>
                                {!isEditing && (
                                  <button
                                    onClick={() => toggleFoodJustification(foodCode, foodName || '')}
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[0.55rem] font-bold transition-all ${
                                      hasJustification
                                        ? 'bg-accent text-white shadow-sm'
                                        : 'bg-accent/5 text-accent hover:bg-accent hover:text-white'
                                    }`}
                                    title="কেন এই খাবার? বিস্তারিত দেখুন"
                                  >
                                    <Info className="w-2.5 h-2.5" />
                                    <span>বিশ্লেষণ</span>
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[0.62rem] text-ink-faint font-bn mt-1">
                                {(food.amount_g || food.amount) && (
                                  <>
                                    <span>{food.amount_g || food.amount} গ্রাম</span>
                                    <span className="w-1 h-1 rounded-full bg-ink/10" />
                                  </>
                                )}
                                <span className="font-mono font-bold text-accent">{food.calories || '?'} kcal</span>
                              </div>
                            </div>
                            
                            {isEditing && (
                              <button
                                onClick={() => removeFoodItem(i, j)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                title="বাদ দিন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {justificationLoading[foodCode] && (
                            <div className="mt-2 p-2 bg-cream/30 rounded-lg text-[0.62rem] font-bn text-ink-muted flex items-center gap-1.5 border border-ink/5">
                              <Loader2 className="w-3 h-3 animate-spin text-accent" /> বিশ্লেষণ তৈরি করা হচ্ছে...
                            </div>
                          )}

                          {hasJustification && (
                            <div className="mt-2 p-2.5 bg-cream/30 rounded-lg border border-ink/5 text-[0.62rem] font-bn text-ink-muted leading-relaxed whitespace-pre-wrap relative">
                              <p className="font-bold text-ink mb-1 flex items-center gap-1 text-[0.68rem]">
                                <span className="w-1 h-1 bg-accent rounded-full animate-ping"></span>
                                ডায়েটিশিয়ান বিশ্লেষণ:
                              </p>
                              {justifications[foodCode]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {isEditing && (
                      addingFoodToSlot === i ? (
                        <div className="col-span-1 md:col-span-2 flex flex-col items-start gap-2 p-3 bg-accent/5 border border-accent/20 rounded-2xl">
                          <div className="flex w-full gap-2">
                            <input
                              type="text"
                              placeholder="খাবারের নাম খুঁজুন..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="flex-1 w-full bg-white px-3 py-2 rounded-xl border border-ink/10 text-sm font-bn outline-none focus:border-accent/50"
                              autoFocus
                            />
                            <button
                              onClick={() => { setAddingFoodToSlot(null); setSearchQuery(''); setSearchResults([]); }}
                              className="p-2 text-ink-muted hover:bg-ink/5 rounded-xl transition-colors flex justify-center items-center"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {searchLoading && (
                            <div className="text-xs text-ink-muted px-2 py-1 font-bn flex items-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin" /> খুঁজছে...
                            </div>
                          )}
                          
                          {searchResults.length > 0 && (
                            <div className="flex flex-col gap-1 w-full max-h-48 overflow-y-auto mt-1">
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
                                  className="text-left w-full p-3 bg-white hover:bg-cream rounded-xl text-sm font-bn border border-ink/5 flex justify-between items-center transition-colors"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-bold text-ink">{res.name_bn || res.name_en}</span>
                                    <span className="text-[0.65rem] text-ink-faint">{res.food_group}</span>
                                  </div>
                                  <span className="text-xs font-bold text-accent shrink-0">
                                    {res.calories || '?'} cal
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                          {searchQuery && !searchLoading && searchResults.length === 0 && (
                            <div className="text-xs text-red-400 px-2 py-1 font-bn">
                              কোনো খাবার পাওয়া যায়নি
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
                          className="flex items-center justify-center gap-1.5 p-3 border border-dashed border-ink/20 rounded-xl hover:border-accent hover:text-accent hover:bg-accent/5 transition-all text-ink-muted text-xs font-bn font-bold h-full min-h-[3rem]"
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

        {/* Feedback */}
        {showToggle && (
          <div className="bg-white p-3 rounded-xl border border-ink/5 shadow-sm">
            <p className="font-bn text-xs font-bold text-ink-muted mb-2.5 text-center">এই প্ল্যান কেমন লাগলো?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => submitFeedback(star)}
                  disabled={feedbackLoading}
                  className={`transition-all hover:scale-110 ${feedback >= star ? 'text-gold' : 'text-ink/20'}`}
                >
                  <Star className="w-5 h-5 fill-current" />
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
          className="p-2 bg-cream rounded-lg text-ink-muted hover:bg-accent hover:text-white transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      )}
    >
      <div className="max-w-3xl w-full mx-auto space-y-4 pb-8">
        {/* Tab Selector */}
        <div className="flex justify-center">
          <div className="flex bg-white p-0.5 rounded-lg border border-ink/5 shadow-sm gap-0.5">
            {[
              { id: 'today' as Tab, label: 'আজকের', icon: Flame },
              { id: 'tomorrow' as Tab, label: 'আগামীকাল', icon: CalendarDays },
              { id: 'history' as Tab, label: 'ইতিহাস', icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bn text-[0.68rem] font-bold transition-all ${
                  tab === id ? 'bg-ink text-cream shadow-md' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl text-red-500 font-bn text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div>
              <p className="font-bold">সমস্যা হয়েছে</p>
              <p className="opacity-80">{error}</p>
              <p className="text-[0.62rem] mt-0.5 opacity-60">দয়া করে প্রথমে আপনার প্রোফাইল সেট আপ করুন</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <CookingAnimation />
            <p className="font-display font-black text-sm text-ink tracking-wide mt-2">AI আপনার জন্য পরিকল্পনা তৈরি করছে...</p>
            <p className="font-bn text-xs text-ink-muted mt-1 animate-pulse">অনুগ্রহ করে অপেক্ষা করুন</p>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {!loading && !error && (
            <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {tab === 'today' && (
                plan ? renderMealCard(plan, true) : (
                  <div className="text-center py-12 font-bn text-xs text-ink-muted">
                    <Info className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>আজকের প্ল্যান পাওয়া যায়নি</p>
                  </div>
                )
              )}

              {tab === 'tomorrow' && (
                <div className="space-y-4">
                  {tomorrowPlan ? renderMealCard(tomorrowPlan, true) : (
                    <div className="text-center py-12 font-bn text-xs text-ink-muted">
                      <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p>আগামীকালের প্ল্যান পাওয়া যায়নি</p>
                      <button onClick={() => regenerateDaily(1)} className="mt-3 px-4 py-1.5 bg-accent text-white font-bn text-xs font-bold rounded-lg hover:bg-accent/80 transition-colors shadow-sm">
                        আগামীকালের প্ল্যান তৈরি করুন
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tab === 'history' && (
                <div className="space-y-3">
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
                        <div key={p.plan_id} className="bg-white rounded-xl border border-ink/5 overflow-hidden hover:border-accent/20 hover:shadow-md transition-all">
                          <div 
                            onClick={() => setExpandedPlanId(isExpanded ? null : p.plan_id)}
                            className="p-3 flex items-center justify-between cursor-pointer select-none text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-cream/50 p-2 rounded-lg text-ink-muted">
                                <CalendarDays className="w-4 h-4 text-accent" />
                              </div>
                              <div>
                                <p className="font-bn font-bold text-xs text-ink leading-tight">
                                  {new Date(p.plan_date).toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                <p className="text-[0.62rem] text-ink-faint font-bn mt-0.5">
                                  {planConsumedCal} / {planTotalCal} kcal ({planPct}%) গৃহীত
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="text-right hidden sm:block">
                                {p.feedback ? (
                                  <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star key={s} className={`w-3 h-3 ${p.feedback! >= s ? 'text-gold fill-current' : 'text-ink/10'}`} />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[0.62rem] text-ink-faint font-bn">রেটিং নেই</span>
                                )}
                              </div>
                              <div className="text-ink-muted">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
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
                                transition={{ duration: 0.2 }}
                                className="border-t border-ink/5 bg-cream/10 p-3 space-y-3"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-ink/5 pb-2 gap-2 text-left">
                                  <div className="flex items-center gap-1.5">
                                    <Utensils className="w-3.5 h-3.5 text-accent" />
                                    <span className="font-bn font-bold text-[0.68rem] text-ink">খাবারের সারসংক্ষেপ (Meal Summary)</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 w-full sm:w-40">
                                    <div className="w-full bg-cream rounded-full h-1 overflow-hidden border border-ink/5">
                                      <div 
                                        className="h-full bg-accent transition-all duration-500 rounded-full"
                                        style={{ width: `${planPct}%` }}
                                      />
                                    </div>
                                    <span className="font-bn text-[0.62rem] text-ink font-bold">{planPct}%</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {meals.map((slot, idx) => {
                                    const SlotIcon = SLOT_ICONS[slot.slot] || Utensils;
                                    const isDone = planCompletedSlots.includes(slot.slot);
                                    const slotCal = (slot.items || []).reduce((sum, item) => sum + (item.calories || 0), 0);

                                    return (
                                      <div 
                                        key={slot.slot + idx}
                                        className={`p-2.5 rounded-xl border transition-all text-left ${
                                          isDone 
                                            ? 'bg-green-50/20 border-green-200' 
                                            : 'bg-white border-ink/5'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-2.5">
                                          <div className="flex items-start gap-2.5">
                                            <div className={`p-1.5 rounded-lg shrink-0 ${isDone ? 'bg-green-100 text-green-600' : 'bg-cream text-ink-muted'}`}>
                                              <SlotIcon className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                              <div className="flex items-baseline gap-1.5">
                                                <h4 className="font-bn font-bold text-xs text-ink leading-tight">{slot.slot_bn || slot.slot}</h4>
                                                <span className="font-bn text-[0.58rem] text-ink-faint font-bold">{slotCal} kcal</span>
                                              </div>
                                              
                                              <p className="font-bn text-[0.62rem] text-ink-muted mt-0.5 leading-relaxed">
                                                {(slot.items || []).map((item) => `${item.name_bn || item.name_en || ''} (${item.amount || item.amount_g || ''})`).join(', ') || 'কোনো খাবার নেই'}
                                              </p>
                                            </div>
                                          </div>

                                          {!isFuturePlan(p.plan_date) ? (
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                await toggleSlotForPlan(p, slot.slot);
                                              }}
                                              className={`text-[0.58rem] shrink-0 font-bn font-bold px-2 py-0.5 rounded-lg transition-all ${
                                                isDone
                                                  ? 'bg-green-500 text-white hover:bg-red-400'
                                                  : 'bg-cream text-ink-muted hover:bg-accent hover:text-white'
                                              }`}
                                            >
                                              {isDone ? '✓ খাওয়া হয়েছে' : 'খাওয়া হয়নি'}
                                            </button>
                                          ) : (
                                            <span className="text-[0.58rem] text-ink-faint font-bn italic shrink-0">খাওয়া শুরু হয়নি</span>
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
                    <div className="text-center py-12 font-bn text-xs text-ink-muted">
                      <History className="w-10 h-10 mx-auto mb-2 opacity-20" />
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
