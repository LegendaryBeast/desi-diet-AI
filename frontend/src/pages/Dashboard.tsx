import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Activity,
  Pill,
  Apple,
  BarChart2,
  MessageSquare,
  ChevronRight,
  Scale,
  Droplet,
  CheckCircle2,
  Clock,
  Utensils,
  Search,
  Sparkles,
  ChefHat,
  User,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import {
  mealPlanApi,
  healthLogApi,
  medicineApi,
  reportsApi,
  type MealPlanResponse,
  type HealthLogResponse,
  type MedicineReminderListItem,
  type HealthSummaryReport,
} from '../lib/api';

export const Dashboard = () => {
  const { profileData, user } = useAuth();
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [healthLogs, setHealthLogs] = useState<HealthLogResponse[]>([]);
  const [medicines, setMedicines] = useState<MedicineReminderListItem[]>([]);
  const [report, setReport] = useState<HealthSummaryReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [todayPlan, logsList, medsList, reportSummary] = await Promise.all([
        mealPlanApi.getDaily('bn').catch(() => null),
        healthLogApi.list(5).catch(() => []),
        medicineApi.list().catch(() => []),
        reportsApi.healthSummary(7).catch(() => null),
      ]);
      setMealPlan(todayPlan);
      setHealthLogs(logsList);
      setMedicines(medsList);
      setReport(reportSummary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const handleRefresh = () => fetchData();
    window.addEventListener('data:refresh', handleRefresh);
    const onVisible = () => {
      if (!document.hidden) fetchData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('data:refresh', handleRefresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchData]);

  const targets = profileData?.targets;
  const profile = profileData?.profile;
  const userName = profile?.name_bn || profile?.name_en || user?.phone || user?.email || 'ব্যবহারকারী';

  let calorieTarget = targets?.target_calories || 2000;
  let consumedCal = 0;
  let completedCount = 0;
  let totalSlots = 0;

  if (mealPlan && mealPlan.plan_data) {
    const meals = (mealPlan.plan_data as any).meals || [];
    totalSlots = meals.length;
    completedCount = (mealPlan.completed_slots || []).length;
    
    if (mealPlan.user_choice_cal) {
      calorieTarget = mealPlan.user_choice_cal;
    } else if (mealPlan.ai_suggestion_cal) {
      calorieTarget = mealPlan.ai_suggestion_cal;
    } else if (mealPlan.calorie_target) {
      calorieTarget = mealPlan.calorie_target;
    }

    consumedCal = meals
      .filter((m: any) => (mealPlan.completed_slots || []).includes(m.slot))
      .reduce((acc: number, m: any) => acc + (m.items || []).reduce((s: number, item: any) => s + (item.calories || 0), 0), 0);
  }

  const caloriePct = calorieTarget > 0 ? Math.min(100, Math.round((consumedCal / calorieTarget) * 100)) : 0;
  const latestLog = healthLogs[0];

  const sparklineData = [...healthLogs].reverse().map(l => ({
    val: l.weight_kg || 0
  })).filter(d => d.val > 0);

  return (
    <DashboardLayout title="ড্যাশবোর্ড" subtitle="Overview">
      <div className="max-w-5xl w-full mx-auto space-y-6 font-bn pb-12 px-4">
        {/* Header Greeting */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-ink/5 shadow-sm">
          <div className="flex items-center gap-4">
            <Link to="/profile" className="w-14 h-14 bg-cream text-accent hover:bg-accent hover:text-white rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border border-ink/5 group interactive shrink-0">
              <User size={24} className="group-hover:scale-110 transition-transform" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-ink leading-tight flex items-center gap-2">
                শুভ দিন, <span className="text-accent">{userName}</span>!
              </h1>
              <p className="text-sm text-ink-muted leading-tight mt-1">আজকের লক্ষ্যমাত্রা ও স্বাস্থ্য একনজরে দেখে নিন</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {targets && (
              <>
                <span className="text-xs font-bold px-3 py-1.5 bg-cream rounded-xl border border-ink/5 text-ink-muted">
                  BMI: <span className="text-accent font-extrabold">{targets.bmi.toFixed(1)}</span> ({targets.bmi_category})
                </span>
                <span className="text-xs font-bold px-3 py-1.5 bg-cream rounded-xl border border-ink/5 text-ink-muted">
                  ওজন লক্ষ্য: <span className="text-forest font-extrabold">{targets.ideal_body_weight_kg}kg</span>
                </span>
              </>
            )}
            <Link
              to="/profile"
              className="text-xs font-bold px-3 py-1.5 bg-ink text-cream hover:bg-accent hover:text-white transition-all rounded-xl shadow-sm flex items-center gap-1.5 interactive"
            >
              <span>প্রোফাইল আপডেট</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Highlight Section: Calorie & Meal Stats (Main Feature) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Calorie progress (Large Circle) */}
          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-ink/5 shadow-sm flex flex-col justify-between hover:border-accent/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-ink/5 pb-2">
                <h3 className="font-bold text-base text-ink flex items-center gap-2">
                  <Flame className="w-5 h-5 text-accent" /> ক্যালোরি লক্ষ্যমাত্রা
                </h3>
                <span className="text-xs text-accent font-bold bg-accent/5 px-2.5 py-1 rounded-full">আজকের ট্র্যাকিং</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-8 py-4">
                <div className="relative w-32 h-32 flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="40%" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-cream" />
                    <circle
                      cx="50%" cy="50%" r="40%"
                      stroke="currentColor" strokeWidth="8" fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 0.40 * 128}`}
                      strokeDashoffset={`${2 * Math.PI * 0.40 * 128 * (1 - caloriePct / 100)}`}
                      className="text-accent transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-bold text-2xl text-ink">{caloriePct}%</span>
                    <span className="text-[10px] text-ink-muted uppercase">গৃহীত</span>
                  </div>
                </div>
                <div className="space-y-3 text-center sm:text-left">
                  <div className="text-lg text-ink-muted">
                    গৃহীত ক্যালোরি: <span className="text-accent font-extrabold text-2xl">{consumedCal}</span> / <span className="font-bold">{calorieTarget}</span> kcal
                  </div>
                  <div className="text-sm text-ink-muted flex items-center justify-center sm:justify-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-forest" />
                    <span className="font-bold text-forest">{completedCount} টি খাবার</span> সম্পন্ন হয়েছে (মোট {totalSlots} টির মধ্যে)
                  </div>
                  <div className="w-48 bg-cream h-2 rounded-full overflow-hidden mx-auto sm:mx-0">
                    <div className="bg-accent h-full rounded-full transition-all duration-500" style={{ width: `${caloriePct}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <Link to="/meal-plan" className="mt-4 pt-3 border-t border-ink/5 flex items-center justify-between text-sm text-accent hover:text-accent/80 font-bold">
              <span>মিল প্ল্যান এবং খাবার সমূহ দেখুন</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Meal slots preview */}
          <div className="bg-white p-6 rounded-3xl border border-ink/5 shadow-sm flex flex-col justify-between hover:border-accent/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-ink/5 pb-2">
                <h3 className="font-bold text-base text-ink flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-forest" /> খাবার রুটিন
                </h3>
                <span className="text-xs text-ink-faint">আজ</span>
              </div>

              {mealPlan && mealPlan.plan_data ? (
                <div className="space-y-3">
                  {((mealPlan.plan_data as any).meals || []).slice(0, 4).map((m: any, idx: number) => {
                    const isDone = (mealPlan.completed_slots || []).includes(m.slot);
                    return (
                      <div key={idx} className={`flex items-center justify-between p-3 rounded-xl text-sm transition-all ${isDone ? 'bg-forest/5 border border-forest/10 text-forest' : 'bg-cream/40 border border-transparent'}`}>
                        <span className="font-bold text-ink-muted truncate mr-2">{m.slot_bn || m.slot}</span>
                        <span className="font-mono font-bold text-ink-muted shrink-0 bg-white/80 px-2 py-0.5 rounded shadow-xs">
                          {(m.items || []).reduce((sum: number, item: any) => sum + (item.calories || 0), 0)} kcal
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-ink-faint">
                  আজকের জন্য কোনো ডায়েট প্ল্যান প্রস্তুত করা হয়নি।
                </div>
              )}
            </div>
            <Link to="/meal-plan" className="mt-4 pt-3 border-t border-ink/5 flex items-center justify-between text-sm text-accent hover:text-accent/80 font-bold">
              <span>ডায়েট প্ল্যান কাস্টমাইজ করুন</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Secondary Info & Logs Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 3: Pusti Report & Clinical AI Assessment */}
          <div className="bg-white p-6 rounded-3xl border border-ink/5 shadow-sm flex flex-col justify-between hover:border-accent/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-ink/5 pb-2">
                <h3 className="font-bold text-base text-ink flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent" /> পুষ্টি রিপোর্ট ও মূল্যায়ন
                </h3>
                {report && (
                  <span className="text-xs text-forest font-bold bg-forest/5 px-2.5 py-1 rounded-full">
                    অনুমোদন হার: {report.adherence_pct}%
                  </span>
                )}
              </div>

              {report ? (
                <div className="space-y-4 py-1">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-cream/40 p-3 rounded-xl border border-ink/5 text-center">
                      <span className="text-xs text-ink-faint block mb-1">গড় দৈনিক ক্যালোরি</span>
                      <span className="font-bold text-ink text-base block font-mono">
                        {Math.round(report.avg_daily_calories)} kcal
                      </span>
                    </div>
                    <div className="bg-cream/40 p-3 rounded-xl border border-ink/5 text-center">
                      <span className="text-xs text-ink-faint block mb-1">বিশ্লেষিত সময়কাল</span>
                      <span className="font-bold text-ink text-base block font-mono">
                        {report.days_with_data} / {report.period_days} দিন
                      </span>
                    </div>
                  </div>

                  {report.ai_verdict ? (
                    <div className="p-3 bg-accent/5 rounded-xl border border-accent/10">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider block mb-1">
                        এআই পুষ্টিবিদ মতামত
                      </span>
                      <p className="text-xs text-ink-muted leading-relaxed line-clamp-2 italic">
                        "{report.ai_verdict}"
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-cream/30 rounded-xl border border-ink/5 text-center text-xs text-ink-muted">
                      পর্যাপ্ত ডায়েট ডেটা যুক্ত হলে এখানে এআই মূল্যায়ন দেখতে পাবেন।
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-ink-faint">
                  পুষ্টি রিপোর্টের কোনো সংক্ষিপ্ত বিবরণী পাওয়া যায়নি।
                </div>
              )}
            </div>
            <Link to="/report" className="mt-4 pt-3 border-t border-ink/5 flex items-center justify-between text-sm text-accent hover:text-accent/80 font-bold">
              <span>বিস্তারিত পুষ্টি রিপোর্ট দেখুন</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 4: Medicine Reminders */}
          <div className="bg-white p-6 rounded-3xl border border-ink/5 shadow-sm flex flex-col justify-between hover:border-accent/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-ink/5 pb-2">
                <h3 className="font-bold text-base text-ink flex items-center gap-2">
                  <Pill className="w-5 h-5 text-amber-500" /> ওষুধ রিমাইন্ডার
                </h3>
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold">আজকের তালিকা</span>
              </div>

              {medicines.length > 0 ? (
                <div className="space-y-2">
                  {medicines.slice(0, 3).map((med, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-cream/40 p-3 rounded-xl text-sm gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-ink truncate">{med.name} ({med.dose})</p>
                        <p className="text-xs text-ink-faint mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-accent" /> {med.times[0]}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${med.with_food ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                        {med.with_food ? 'খাবারের পর' : 'খালি পেটে'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-ink-faint">
                  কোনো ওষুধের রিমাইন্ডার যোগ করা নেই।
                </div>
              )}
            </div>
            <Link to="/medicine" className="mt-4 pt-3 border-t border-ink/5 flex items-center justify-between text-sm text-accent hover:text-accent/80 font-bold">
              <span>রিমাইন্ডার তালিকা ম্যানেজ করুন</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Quick Tools & Helper Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card 5: Safe Foods */}
          <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm flex flex-col justify-between hover:border-accent/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-ink/5 pb-2">
                <h3 className="font-bold text-sm text-ink flex items-center gap-1.5">
                  <Apple className="w-4.5 h-4.5 text-forest" /> সেফ ফুড ডাটাবেজ
                </h3>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                আপনার শরীর ও স্বাস্থ্যের জন্য নিরাপদ দেশি খাবার সমূহের তালিকা দেখুন।
              </p>
              <div className="flex items-center gap-1.5 bg-cream/40 p-2 rounded-lg text-xs text-ink-faint mt-3">
                <Search className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="truncate">রুই মাছ, লাল চালের ভাত</span>
              </div>
            </div>
            <Link to="/foods" className="mt-4 pt-2 border-t border-ink/5 flex items-center justify-between text-xs text-accent hover:text-accent/80 font-bold">
              <span>নিরাপদ খাবার খুঁজুন</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 6: AI Companion */}
          <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm flex flex-col justify-between hover:border-accent/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-ink/5 pb-2">
                <h3 className="font-bold text-sm text-ink flex items-center gap-1.5">
                  <MessageSquare className="w-4.5 h-4.5 text-accent" /> এআই পুষ্টিবিদ
                </h3>
                <span className="text-[10px] text-accent font-bold bg-accent/5 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                ডায়েট বা দেশি রেসিপি নিয়ে যেকোনো প্রশ্নের সরাসরি উত্তর পান।
              </p>
              <div className="bg-cream/40 p-2 rounded-lg text-xs text-ink-faint italic truncate mt-3">
                "ডায়াবেটিসে সকালে কী খাব?"
              </div>
            </div>
            <Link to="/chat" className="mt-4 pt-2 border-t border-ink/5 flex items-center justify-between text-xs text-accent hover:text-accent/80 font-bold">
              <span>AI পুষ্টিবিদ চ্যাট</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 7: Personal Cooker */}
          <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm flex flex-col justify-between hover:border-accent/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-ink/5 pb-2">
                <h3 className="font-bold text-sm text-ink flex items-center gap-1.5">
                  <ChefHat className="w-4.5 h-4.5 text-forest" /> নিজের রান্নাঘর
                </h3>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                আপনার কাছে থাকা উপকরণ দিয়ে নিরাপদ ও কাস্টম রেসিপি তৈরি করুন।
              </p>
              <div className="bg-cream/40 p-2 rounded-lg text-xs text-ink-faint italic truncate mt-3">
                "ডিম, আলু ও টমেটো দিয়ে রেসিপি"
              </div>
            </div>
            <Link to="/personal-cooker" className="mt-4 pt-2 border-t border-ink/5 flex items-center justify-between text-xs text-forest hover:text-forest/80 font-bold">
              <span>রেসিপি জেনারেটর</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Nutrition Target Summary Section (Expanded & Clean) */}
        {targets && (
          <div className="bg-white p-6 rounded-3xl border border-ink/5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-ink/5 pb-3">
              <BarChart2 className="w-5 h-5 text-accent" />
              <h2 className="font-bold text-base text-ink">আপনার দৈনন্দিন পুষ্টি লক্ষ্যমাত্রা (Daily Targets)</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                { label: 'শর্করা (Carbs)', val: `${targets.carbs_g}g`, color: 'bg-accent/10 border-accent/15 text-accent', barColor: 'bg-accent' },
                { label: 'প্রোটিন (Protein)', val: `${targets.protein_g}g`, color: 'bg-forest/10 border-forest/15 text-forest', barColor: 'bg-forest' },
                { label: 'চর্বি (Fat)', val: `${targets.fat_g}g`, color: 'bg-amber-500/10 border-amber-500/15 text-amber-600', barColor: 'bg-amber-500' },
                { label: 'ফাইবার (Fiber)', val: `${targets.fiber_g}g`, color: 'bg-purple-500/10 border-purple-500/15 text-purple-600', barColor: 'bg-purple-500' }
              ].map((t, idx) => (
                <div key={idx} className="bg-cream/20 p-4 rounded-2xl border border-ink/5 flex flex-col justify-between shadow-xs">
                  <span className="text-xs text-ink-faint uppercase font-bold tracking-wider">{t.label}</span>
                  <div className="flex items-end justify-between mt-2 mb-1">
                    <span className="text-xl font-bold text-ink">{t.val}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.color}`}>টার্গেট</span>
                  </div>
                  <div className="w-full h-1.5 bg-cream mt-2 rounded-full overflow-hidden">
                    <div className={`h-full ${t.barColor} w-full`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-ink/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs md:text-sm text-ink-muted">
                <span className="flex items-center gap-1"><Droplet className="w-4 h-4 text-blue-500" /> দৈনিক পানি পান: <b className="text-ink">{targets.water_l}L</b></span>
                <span className="w-1.5 h-1.5 bg-ink/15 rounded-full" />
                <span className="flex items-center gap-1"><Scale className="w-4 h-4 text-forest" /> টার্গেট ক্যালোরি: <b className="text-ink">{targets.target_calories} kcal</b></span>
              </div>
              <Link to="/report" className="text-sm text-accent hover:text-accent/80 font-bold flex items-center gap-1 self-start sm:self-auto">
                <span>বিস্তারিত রিপোর্ট দেখুন</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
