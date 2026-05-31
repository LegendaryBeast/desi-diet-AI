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
      <div className="max-w-[1400px] w-full mx-auto space-y-6 font-bn pb-12 px-2 md:px-6">
        
        {/* Header Greeting & Quick Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/60 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] border border-ink/5 shadow-sm">
          <div className="flex items-center gap-4">
            <Link to="/profile" className="w-14 h-14 bg-gradient-to-br from-accent/20 to-accent/5 text-accent hover:scale-105 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-inner border border-accent/10 group shrink-0">
              <User size={26} className="group-hover:scale-110 transition-transform" />
            </Link>
            <div>
              <h1 className="text-xl md:text-3xl font-extrabold text-ink leading-tight flex items-center gap-2">
                শুভ দিন, <span className="text-accent">{userName}</span>!
              </h1>
              <p className="text-sm text-ink-muted leading-tight mt-1 font-medium">আজকের লক্ষ্যমাত্রা ও স্বাস্থ্য একনজরে দেখে নিন</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {targets && (
              <>
                <span className="text-[11px] font-bold px-3 py-1.5 bg-white rounded-xl border border-ink/5 text-ink-muted shadow-sm flex items-center gap-1.5">
                  BMI: <span className="text-accent font-extrabold text-sm">{targets.bmi.toFixed(1)}</span> ({targets.bmi_category})
                </span>
                <span className="text-[11px] font-bold px-3 py-1.5 bg-white rounded-xl border border-ink/5 text-ink-muted shadow-sm flex items-center gap-1.5">
                  ওজন লক্ষ্য: <span className="text-forest font-extrabold text-sm">{targets.ideal_body_weight_kg}kg</span>
                </span>
                <span className="text-[11px] font-bold px-3 py-1.5 bg-white rounded-xl border border-ink/5 text-ink-muted shadow-sm flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-blue-500" /> <span className="text-blue-600 font-extrabold text-sm">{targets.water_l}L</span>
                </span>
              </>
            )}
            <Link
              to="/profile"
              className="text-[11px] font-bold px-4 py-2 bg-ink text-cream hover:bg-accent hover:text-white transition-all rounded-xl shadow-md flex items-center gap-1.5 ml-auto md:ml-0"
            >
              <span>প্রোফাইল আপডেট</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Bento Grid Layout - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Calories & Macros (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-ink/5 shadow-sm hover:shadow-md transition-all h-full flex flex-col">
              <div className="flex items-center justify-between mb-6 border-b border-ink/5 pb-3">
                <h3 className="font-extrabold text-lg text-ink flex items-center gap-2.5">
                  <Flame className="w-6 h-6 text-accent" /> ক্যালোরি লক্ষ্যমাত্রা
                </h3>
                <span className="text-[10px] text-accent font-bold bg-accent/10 px-2.5 py-1 rounded-full uppercase tracking-wider">আজকের ট্র্যাকিং</span>
              </div>

              {/* Circular Gauge and Overview */}
              <div className="flex items-center gap-6 mb-8">
                <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-cream" />
                    <circle
                      cx="50%" cy="50%" r="42%"
                      stroke="currentColor" strokeWidth="10" fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 0.42 * 144}`}
                      strokeDashoffset={`${2 * Math.PI * 0.42 * 144 * (1 - caloriePct / 100)}`}
                      className="text-accent transition-all duration-1000 ease-out"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-extrabold text-4xl text-ink leading-none">{caloriePct}%</span>
                    <span className="text-[11px] text-ink-faint uppercase font-bold mt-1">গৃহীত</span>
                  </div>
                </div>
                
                <div className="space-y-3 flex-1">
                  <div className="text-sm text-ink-muted">
                    <p className="text-[11px] uppercase tracking-wider font-bold mb-0.5">গৃহীত ক্যালোরি</p>
                    <span className="text-accent font-extrabold text-2xl">{consumedCal}</span> / <span className="font-bold text-lg">{calorieTarget}</span> kcal
                  </div>
                  <div className="text-[11px] text-ink-muted flex items-center gap-1.5 bg-forest/5 text-forest px-3 py-1.5 rounded-xl border border-forest/10 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    {completedCount} টি খাবার সম্পন্ন (মোট {totalSlots})
                  </div>
                </div>
              </div>

              {/* Macro Progress Bars */}
              {targets && (
                <div className="mt-auto space-y-4">
                  <h4 className="text-[11px] uppercase font-extrabold text-ink-faint tracking-wider">দৈনন্দিন পুষ্টি লক্ষ্যমাত্রা</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'শর্করা (CARBS)', val: `${targets.carbs_g}g`, color: 'bg-accent' },
                      { label: 'প্রোটিন (PROTEIN)', val: `${targets.protein_g}g`, color: 'bg-forest' },
                      { label: 'চর্বি (FAT)', val: `${targets.fat_g}g`, color: 'bg-amber-500' },
                      { label: 'ফাইবার (FIBER)', val: `${targets.fiber_g}g`, color: 'bg-purple-500' }
                    ].map((t, idx) => (
                      <div key={idx} className="bg-cream/30 p-3 rounded-2xl border border-ink/5">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[9px] text-ink-muted uppercase font-bold tracking-wider">{t.label}</span>
                          <span className="text-sm font-extrabold text-ink leading-none">{t.val}</span>
                        </div>
                        <div className="w-full h-1.5 bg-ink/5 rounded-full overflow-hidden">
                          {/* We simulate filling these bars up a bit for visual aesthetic, ideally real data is used */}
                          <div className={`h-full ${t.color} rounded-full`} style={{ width: '60%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link to="/meal-plan" className="mt-6 pt-4 border-t border-ink/5 flex items-center justify-between text-[11px] text-accent hover:text-accent/80 font-extrabold uppercase tracking-wider">
                <span>মিল প্ল্যান এবং খাবার সমূহ দেখুন</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Middle Column: Meals & Meds (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Meal Routine Card */}
            <div className="bg-white p-6 rounded-[2rem] border border-ink/5 shadow-sm hover:shadow-md transition-all flex flex-col h-[50%] min-h-[300px]">
              <div className="flex items-center justify-between mb-4 border-b border-ink/5 pb-3">
                <h3 className="font-extrabold text-lg text-ink flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-forest" /> খাবার রুটিন
                </h3>
                <span className="text-[10px] text-ink-faint font-bold">আজ</span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                {mealPlan && mealPlan.plan_data ? (
                  ((mealPlan.plan_data as any).meals || []).map((m: any, idx: number) => {
                    const isDone = (mealPlan.completed_slots || []).includes(m.slot);
                    return (
                      <div key={idx} className={`flex items-center justify-between p-3.5 rounded-2xl transition-all border ${isDone ? 'bg-forest/5 border-forest/10 text-forest' : 'bg-cream/40 border-ink/5 text-ink-muted'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isDone ? 'bg-forest' : 'bg-ink/20'}`} />
                          <span className="font-bold text-sm">{m.slot_bn || m.slot}</span>
                        </div>
                        <span className="font-mono font-bold text-xs shrink-0">
                          {(m.items || []).reduce((sum: number, item: any) => sum + (item.calories || 0), 0)} kcal
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-sm font-bold text-ink-faint text-center p-4">
                    আজকের জন্য কোনো ডায়েট প্ল্যান প্রস্তুত করা হয়নি।
                  </div>
                )}
              </div>
              
              <Link to="/meal-plan" className="mt-4 pt-4 border-t border-ink/5 flex items-center justify-between text-[11px] text-accent hover:text-accent/80 font-extrabold uppercase tracking-wider">
                <span>ডায়েট প্ল্যান কাস্টমাইজ করুন</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Medicine Reminder Card */}
            <div className="bg-white p-6 rounded-[2rem] border border-ink/5 shadow-sm hover:shadow-md transition-all flex flex-col h-[calc(50%-1.5rem)] min-h-[250px]">
              <div className="flex items-center justify-between mb-4 border-b border-ink/5 pb-3">
                <h3 className="font-extrabold text-lg text-ink flex items-center gap-2">
                  <Pill className="w-5 h-5 text-amber-500" /> ওষুধ রিমাইন্ডার
                </h3>
                <span className="text-[9px] text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-extrabold uppercase tracking-wider">আজকের তালিকা</span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {medicines.length > 0 ? (
                  medicines.slice(0, 4).map((med, idx) => (
                    <div key={idx} className="flex flex-col justify-center bg-cream/40 p-3.5 rounded-2xl border border-ink/5 gap-1.5">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm text-ink truncate pr-2">{med.name} <span className="text-ink-muted text-[10px]">({med.dose})</span></p>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${med.with_food ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {med.with_food ? 'খাবারের পর' : 'খালি পেটে'}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-ink-faint flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-accent" /> {med.times[0]}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-sm font-bold text-ink-faint text-center p-4">
                    কোনো ওষুধের রিমাইন্ডার যোগ করা নেই।
                  </div>
                )}
              </div>

              <Link to="/medicine" className="mt-4 pt-4 border-t border-ink/5 flex items-center justify-between text-[11px] text-accent hover:text-accent/80 font-extrabold uppercase tracking-wider">
                <span>রিমাইন্ডার তালিকা ম্যানেজ করুন</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Column: Report & AI Tools (lg:col-span-3) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Pusti Report Mini Card */}
            <div className="bg-white p-6 rounded-[2rem] border border-ink/5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4 border-b border-ink/5 pb-3">
                <h3 className="font-extrabold text-lg text-ink flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent" /> পুষ্টি রিপোর্ট
                </h3>
                {report && (
                  <span className="text-[10px] text-forest font-extrabold bg-forest/10 px-2 py-1 rounded-full uppercase">
                    অনুমোদন: {report.adherence_pct}%
                  </span>
                )}
              </div>

              {report ? (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1 bg-cream/50 p-3 rounded-2xl border border-ink/5 text-center">
                      <span className="text-[9px] text-ink-faint block mb-0.5 uppercase font-bold tracking-wider">গড় ক্যালোরি</span>
                      <span className="font-extrabold text-ink text-base block font-mono">
                        {Math.round(report.avg_daily_calories)}
                      </span>
                    </div>
                    <div className="flex-1 bg-cream/50 p-3 rounded-2xl border border-ink/5 text-center">
                      <span className="text-[9px] text-ink-faint block mb-0.5 uppercase font-bold tracking-wider">বিশ্লেষিত দিন</span>
                      <span className="font-extrabold text-ink text-base block font-mono">
                        {report.days_with_data}/{report.period_days}
                      </span>
                    </div>
                  </div>

                  {report.ai_verdict && (
                    <div className="p-3 bg-accent/5 rounded-2xl border border-accent/10">
                      <span className="text-[9px] font-extrabold text-accent uppercase tracking-wider block mb-1">
                        এআই মতামত
                      </span>
                      <p className="text-[11px] text-ink-muted font-medium leading-relaxed line-clamp-3 italic">
                        "{report.ai_verdict}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs font-bold text-ink-faint">
                  পুষ্টি রিপোর্টের ডেটা পাওয়া যায়নি।
                </div>
              )}
              <Link to="/report" className="mt-4 pt-4 border-t border-ink/5 flex items-center justify-between text-[11px] text-accent hover:text-accent/80 font-extrabold uppercase tracking-wider">
                <span>বিস্তারিত রিপোর্ট দেখুন</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Quick AI Tools Bento Box */}
            <div className="bg-white p-6 rounded-[2rem] border border-ink/5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-4 border-b border-ink/5 pb-3">
                <Sparkles className="w-5 h-5 text-accent" />
                <h3 className="font-extrabold text-lg text-ink">সহায়ক এআই টুলস</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Link to="/foods" className="bg-cream/40 hover:bg-forest/5 p-4 rounded-2xl border border-ink/5 hover:border-forest/20 transition-all flex flex-col items-center justify-center text-center gap-2 group">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-forest group-hover:scale-110 transition-transform">
                    <Apple className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-extrabold text-ink-muted group-hover:text-forest transition-colors">সেফ ফুড</span>
                </Link>
                
                <Link to="/chat" className="bg-cream/40 hover:bg-accent/5 p-4 rounded-2xl border border-ink/5 hover:border-accent/20 transition-all flex flex-col items-center justify-center text-center gap-2 group">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-extrabold text-ink-muted group-hover:text-accent transition-colors">AI পুষ্টিবিদ</span>
                </Link>

                <Link to="/personal-cooker" className="col-span-2 bg-cream/40 hover:bg-amber-500/5 p-4 rounded-2xl border border-ink/5 hover:border-amber-500/20 transition-all flex flex-col items-center justify-center text-center gap-2 group">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-extrabold text-ink-muted group-hover:text-amber-600 transition-colors">নিজের রান্নাঘর (Radhuni AI)</span>
                </Link>
              </div>

              <div className="mt-4 pt-4 border-t border-ink/5 flex items-center justify-between text-[11px] text-ink-faint">
                <span className="font-extrabold uppercase tracking-wider">সব সার্ভিস দেখুন</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
};
