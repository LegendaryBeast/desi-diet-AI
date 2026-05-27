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
  Zap,
  CheckCircle2,
  Clock,
  Utensils,
  Search,
  Sparkles,
  ChefHat,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import {
  mealPlanApi,
  healthLogApi,
  medicineApi,
  type MealPlanResponse,
  type HealthLogResponse,
  type MedicineReminderListItem,
} from '../lib/api';

export const Dashboard = () => {
  const { profileData, user } = useAuth();
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [healthLogs, setHealthLogs] = useState<HealthLogResponse[]>([]);
  const [medicines, setMedicines] = useState<MedicineReminderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [todayPlan, logsList, medsList] = await Promise.all([
        mealPlanApi.getDaily('bn').catch(() => null),
        healthLogApi.list(5).catch(() => []),
        medicineApi.list().catch(() => []),
      ]);
      setMealPlan(todayPlan);
      setHealthLogs(logsList);
      setMedicines(medsList);
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

  // Prep mini sparkline data for weight (reverse so chronological)
  const sparklineData = [...healthLogs].reverse().map(l => ({
    val: l.weight_kg || 0
  })).filter(d => d.val > 0);

  return (
    <DashboardLayout title="ড্যাশবোর্ড" subtitle="Overview">
      <div className="max-w-3xl w-full mx-auto space-y-4 font-bn">
        {/* Header Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-ink/5 shadow-sm">
          <div>
            <h1 className="text-base font-bold text-ink leading-tight">
              শুভ দিন, <span className="text-accent">{userName}</span>!
            </h1>
            <p className="text-[0.68rem] text-ink-muted leading-tight">আজকের লক্ষ্যমাত্রা ও স্বাস্থ্য একনজরে</p>
          </div>
          {targets && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[0.62rem] font-bold px-2 py-0.5 bg-cream rounded border border-ink/5">
                BMI: <span className="text-accent">{targets.bmi.toFixed(1)}</span> ({targets.bmi_category})
              </span>
              <span className="text-[0.62rem] font-bold px-2 py-0.5 bg-cream rounded border border-ink/5">
                ওজন লক্ষ্য: <span className="text-forest">{targets.ideal_body_weight_kg}kg</span>
              </span>
            </div>
          )}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Card 1: Calorie progress */}
          <div className="bg-white p-3 rounded-xl border border-ink/5 shadow-sm flex flex-col justify-between hover:border-accent/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-ink/5 pb-1">
                <h3 className="font-bold text-xs text-ink flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-accent" /> ক্যালোরি লক্ষ্য
                </h3>
                <span className="text-[0.55rem] text-accent font-bold">আজ</span>
              </div>

              <div className="flex items-center gap-3 py-1">
                <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="40%" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-cream" />
                    <circle
                      cx="50%" cy="50%" r="40%"
                      stroke="currentColor" strokeWidth="4" fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 0.40 * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 0.40 * 56 * (1 - caloriePct / 100)}`}
                      className="text-accent transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-bold text-xs text-ink">{caloriePct}%</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[0.7rem] text-ink-muted">
                    গৃহীত: <span className="text-accent font-bold">{consumedCal}</span> / {calorieTarget} kcal
                  </div>
                  <div className="text-[0.62rem] text-ink-faint mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-forest" /> {completedCount}/{totalSlots} সম্পন্ন
                  </div>
                </div>
              </div>
            </div>
            <Link to="/meal-plan" className="mt-3 pt-2 border-t border-ink/5 flex items-center justify-between text-[0.68rem] text-accent hover:text-accent/80 font-bold">
              <span>মিল প্ল্যান দেখুন</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Card 2: Meal slots preview */}
          <div className="bg-white p-3 rounded-xl border border-ink/5 shadow-sm flex flex-col justify-between hover:border-accent/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-ink/5 pb-1">
                <h3 className="font-bold text-xs text-ink flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-forest" /> খাবার রুটিন
                </h3>
                <span className="text-[0.55rem] text-ink-faint">আজ</span>
              </div>

              {mealPlan && mealPlan.plan_data ? (
                <div className="space-y-1.5">
                  {((mealPlan.plan_data as any).meals || []).slice(0, 3).map((m: any, idx: number) => {
                    const isDone = (mealPlan.completed_slots || []).includes(m.slot);
                    return (
                      <div key={idx} className={`flex items-center justify-between px-2 py-1 rounded text-[0.68rem] ${isDone ? 'bg-green-50/50 border border-green-100' : 'bg-cream/40 border border-transparent'}`}>
                        <span className="font-bold text-ink-muted truncate mr-1">{m.slot_bn || m.slot}</span>
                        <span className="font-mono text-ink-faint text-[0.6rem] shrink-0">
                          {(m.items || []).reduce((sum: number, item: any) => sum + (item.calories || 0), 0)} kcal
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-2 text-center text-[0.68rem] text-ink-faint">
                  প্ল্যান প্রস্তুত করা হয়নি।
                </div>
              )}
            </div>
            <Link to="/meal-plan" className="mt-3 pt-2 border-t border-ink/5 flex items-center justify-between text-[0.68rem] text-accent hover:text-accent/80 font-bold">
              <span>ডায়েট প্ল্যান কাস্টমাইজ</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Card 3: Health logs & Visual Sparkline */}
          <div className="bg-white p-3 rounded-xl border border-ink/5 shadow-sm flex flex-col justify-between hover:border-accent/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-ink/5 pb-1">
                <h3 className="font-bold text-xs text-ink flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-accent" /> স্বাস্থ্য পরিমাপ
                </h3>
                {latestLog && (
                  <span className="text-[0.62rem] text-ink-faint">{latestLog.weight_kg ? `${latestLog.weight_kg}kg` : ''}</span>
                )}
              </div>

              {latestLog ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1 text-[0.68rem]">
                    <div className="bg-cream/40 px-1.5 py-1 rounded border border-ink/5 text-center">
                      <span className="text-[0.55rem] text-ink-faint block">রক্তচাপ</span>
                      <span className="font-bold text-ink truncate block">{latestLog.blood_pressure || '--'}</span>
                    </div>
                    <div className="bg-cream/40 px-1.5 py-1 rounded border border-ink/5 text-center">
                      <span className="text-[0.55rem] text-ink-faint block">শর্করা</span>
                      <span className="font-bold text-ink truncate block">{latestLog.blood_sugar ? `${latestLog.blood_sugar} mmol` : '--'}</span>
                    </div>
                  </div>
                  {/* Visual weight sparkline */}
                  {sparklineData.length > 1 && (
                    <div className="h-6 w-full opacity-75">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparklineData}>
                          <defs>
                            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="val" stroke="#3b82f6" fill="url(#sparkGrad)" strokeWidth={1.5} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-2 text-center text-[0.68rem] text-ink-faint">
                  কোনো লগ সাবমিট করা হয়নি।
                </div>
              )}
            </div>
            <Link to="/health-log" className="mt-3 pt-2 border-t border-ink/5 flex items-center justify-between text-[0.68rem] text-accent hover:text-accent/80 font-bold">
              <span>লগ আপডেট করুন</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Card 4: Medicine Reminders */}
          <div className="bg-white p-3 rounded-xl border border-ink/5 shadow-sm flex flex-col justify-between hover:border-accent/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-ink/5 pb-1">
                <h3 className="font-bold text-xs text-ink flex items-center gap-1">
                  <Pill className="w-3.5 h-3.5 text-amber-500" /> ওষুধ রিমাইন্ডার
                </h3>
                <span className="text-[0.55rem] text-amber-600 bg-amber-50 px-1 py-0.5 rounded font-bold">আজ</span>
              </div>

              {medicines.length > 0 ? (
                <div className="space-y-1">
                  {medicines.slice(0, 2).map((med, idx) => (
                    <div key={idx} className="flex items-start justify-between bg-cream/40 p-1.5 rounded text-[0.68rem] gap-1">
                      <div className="min-w-0">
                        <p className="font-bold text-ink truncate">{med.name} ({med.dose})</p>
                        <p className="text-[0.55rem] text-ink-faint mt-0.5 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5 text-accent" /> {med.times[0]}
                        </p>
                      </div>
                      <span className={`text-[0.55rem] font-bold px-1 rounded shrink-0 ${med.with_food ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                        {med.with_food ? 'খাবারের পর' : 'খালি পেটে'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-2 text-center text-[0.68rem] text-ink-faint">
                  ওষুধের তালিকা নেই।
                </div>
              )}
            </div>
            <Link to="/medicine" className="mt-3 pt-2 border-t border-ink/5 flex items-center justify-between text-[0.68rem] text-accent hover:text-accent/80 font-bold">
              <span>রিমাইন্ডারসমূহ দেখুন</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Card 5: Safe Foods / Nutrition DB */}
          <div className="bg-white p-3 rounded-xl border border-ink/5 shadow-sm flex flex-col justify-between hover:border-accent/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-ink/5 pb-1">
                <h3 className="font-bold text-xs text-ink flex items-center gap-1">
                  <Apple className="w-3.5 h-3.5 text-forest" /> সেফ ফুড ডাটাবেজ
                </h3>
                <span className="text-[0.55rem] text-ink-faint">নির্দেশিকা</span>
              </div>
              <p className="text-[0.68rem] text-ink-muted leading-snug py-1">
                শারীরিক অবস্থা অনুযায়ী কোন দেশি খাবার নিরাপদ, সতর্ক বা পরিহারযোগ্য তা তালিকা থেকে মিলিয়ে নিন।
              </p>
              <div className="flex items-center gap-1 bg-cream/40 p-1.5 rounded text-[0.62rem] text-ink-faint mt-1">
                <Search className="w-3 h-3 text-accent shrink-0" />
                <span className="truncate">যেমন: লাল চালের ভাত, রুই মাছ</span>
              </div>
            </div>
            <Link to="/foods" className="mt-3 pt-2 border-t border-ink/5 flex items-center justify-between text-[0.68rem] text-accent hover:text-accent/80 font-bold">
              <span>নিরাপদ খাবার খুঁজুন</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Card 6: AI Assistant */}
          <div className="bg-white p-3 rounded-xl border border-ink/5 shadow-sm flex flex-col justify-between hover:border-accent/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-ink/5 pb-1">
                <h3 className="font-bold text-xs text-ink flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-accent" /> এআই পুষ্টিবিদ
                </h3>
                <span className="text-[0.55rem] text-accent font-bold bg-accent/5 px-1 rounded flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
              </div>
              <p className="text-[0.68rem] text-ink-muted leading-snug py-1">
                পুষ্টি, দেশি রেসিপি বা রোগভিত্তিক ডায়েট সংক্রান্ত যেকোনো পরামর্শের জন্য সরাসরি কথা বলুন।
              </p>
              <div className="bg-cream/40 p-1.5 rounded text-[0.62rem] text-ink-faint italic truncate mt-1">
                "ডায়াবেটিসে সকালে ভাতের বিকল্প কি?"
              </div>
            </div>
            <Link to="/chat" className="mt-3 pt-2 border-t border-ink/5 flex items-center justify-between text-[0.68rem] text-accent hover:text-accent/80 font-bold">
              <span>AI পুষ্টিবিদ চ্যাট</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Card 7: Personal Cooker */}
          <div className="bg-white p-3 rounded-xl border border-ink/5 shadow-sm flex flex-col justify-between hover:border-accent/15 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-ink/5 pb-1">
                <h3 className="font-bold text-xs text-ink flex items-center gap-1">
                  <ChefHat className="w-3.5 h-3.5 text-forest" /> নিজের রান্নাঘর
                </h3>
                <span className="text-[0.55rem] text-forest font-bold bg-forest/5 px-1 rounded flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> RAG
                </span>
              </div>
              <p className="text-[0.68rem] text-ink-muted leading-snug py-1">
                আপনার রোগ অনুযায়ী নিরাপদ রেসিপি, রান্নার পদ্ধতি এবং খাবারের নিরাপত্তা জানুন।
              </p>
              <div className="bg-cream/40 p-1.5 rounded text-[0.62rem] text-ink-faint italic truncate mt-1">
                "কিডনি রোগে লাউ কি খেতে পারব?"
              </div>
            </div>
            <Link to="/personal-cooker" className="mt-3 pt-2 border-t border-ink/5 flex items-center justify-between text-[0.68rem] text-forest hover:text-forest/80 font-bold">
              <span>নুট্রিসাথী চ্যাট</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

        </div>

        {/* Nutrition Target Summary Section */}
        {targets && (
          <div className="bg-white p-3.5 rounded-xl border border-ink/5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2.5 border-b border-ink/5 pb-1.5">
              <BarChart2 className="w-4 h-4 text-accent" />
              <h2 className="font-bold text-xs text-ink">আপনার দৈনন্দিন পুষ্টি লক্ষ্যমাত্রা (Daily Targets)</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'শর্করা (Carbs)', val: `${targets.carbs_g}g`, color: 'bg-accent/10 border-accent/15 text-accent', barColor: 'bg-accent' },
                { label: 'প্রোটিন (Protein)', val: `${targets.protein_g}g`, color: 'bg-forest/10 border-forest/15 text-forest', barColor: 'bg-forest' },
                { label: 'চর্বি (Fat)', val: `${targets.fat_g}g`, color: 'bg-amber-500/10 border-amber-500/15 text-amber-600', barColor: 'bg-amber-500' },
                { label: 'ফাইবার (Fiber)', val: `${targets.fiber_g}g`, color: 'bg-purple-500/10 border-purple-500/15 text-purple-600', barColor: 'bg-purple-500' }
              ].map((t, idx) => (
                <div key={idx} className="bg-cream/20 p-2 rounded border border-ink/5 flex flex-col justify-between">
                  <span className="text-[0.55rem] text-ink-faint uppercase font-bold tracking-wider">{t.label}</span>
                  <div className="flex items-end justify-between mt-1">
                    <span className="text-sm font-bold text-ink">{t.val}</span>
                    <span className={`text-[0.5rem] font-bold px-1 rounded ${t.color}`}>টার্গেট</span>
                  </div>
                  <div className="w-full h-1 bg-cream mt-1 rounded overflow-hidden">
                    <div className={`h-full ${t.barColor} w-full`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-ink/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[0.68rem] text-ink-muted">
                <span className="flex items-center gap-0.5"><Droplet className="w-3 h-3 text-blue-500" /> পানি পান: <b>{targets.water_l}L</b></span>
                <span className="w-1 h-1 bg-ink/15 rounded-full" />
                <span className="flex items-center gap-0.5"><Scale className="w-3 h-3 text-forest" /> টার্গেট ক্যালোরি: <b>{targets.target_calories} kcal</b></span>
              </div>
              <Link to="/report" className="text-[0.68rem] text-accent hover:text-accent/80 font-bold flex items-center gap-0.5 self-start sm:self-auto">
                <span>বিস্তারিত রিপোর্ট দেখুন</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
