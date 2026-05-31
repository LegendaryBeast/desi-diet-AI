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
  Shield,
  ShoppingCart,
  Play,
  Bot,
  Bell
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

const CustomBarChart = ({ consumed, target }: { consumed: number; target: number }) => {
  const bars = 24;
  const progressBars = target > 0 ? Math.floor((consumed / target) * bars) : 0;
  return (
    <div className="flex gap-1 h-10 w-full mt-2 mb-4">
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} className={`flex-1 rounded-sm ${i < progressBars ? 'bg-accent' : 'bg-ink/10'}`} />
      ))}
    </div>
  );
};

const WaveChart = () => (
  <div className="h-20 w-full mt-4 -mb-2">
    <svg height="100%" width="100%" viewBox="0 0 200 60" preserveAspectRatio="none">
      <path d="M0,40 Q25,10 50,30 T100,20 T150,40 T200,20 L200,60 L0,60 Z" fill="none" stroke="currentColor" className="text-accent opacity-30" strokeWidth="1.5" />
      <path d="M0,35 Q25,15 50,35 T100,25 T150,45 T200,25" fill="none" stroke="currentColor" className="text-accent" strokeWidth="3" />
      <circle cx="50" cy="35" r="5" fill="currentColor" className="text-accent" />
      <circle cx="50" cy="35" r="2" fill="white" />
    </svg>
  </div>
);

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
    const onVisible = () => { if (!document.hidden) fetchData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('data:refresh', handleRefresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchData]);

  const targets = profileData?.targets;
  const profile = profileData?.profile;
  const userName = profile?.name_bn || profile?.name_en || user?.phone || user?.email || 'ব্যবহারকারী';
  const weight = profile?.weight_kg || 0;
  const height = profile?.height_cm || 0;

  let calorieTarget = targets?.target_calories || 2000;
  let consumedCal = 0;
  let consumedCarbs = 0;
  let consumedProtein = 0;
  let consumedFat = 0;

  if (mealPlan && mealPlan.plan_data) {
    const meals = (mealPlan.plan_data as any).meals || [];
    if (mealPlan.user_choice_cal) calorieTarget = mealPlan.user_choice_cal;
    else if (mealPlan.ai_suggestion_cal) calorieTarget = mealPlan.ai_suggestion_cal;
    else if (mealPlan.calorie_target) calorieTarget = mealPlan.calorie_target;

    meals.filter((m: any) => (mealPlan.completed_slots || []).includes(m.slot)).forEach((m: any) => {
      (m.items || []).forEach((item: any) => {
        consumedCal += item.calories || 0;
        consumedCarbs += item.macros?.carbs_g || 0;
        consumedProtein += item.macros?.protein_g || 0;
        consumedFat += item.macros?.fat_g || 0;
      });
    });
  }

  const QUICK_ACTIONS = [
    { label: 'সেফ ফুড', icon: Apple, route: '/foods', bg: 'bg-[#EBF0D8]', color: 'text-forest' },
    { label: 'হেলথ লগ', icon: Activity, route: '/health-log', bg: 'bg-[#E2F2F5]', color: 'text-accent' },
    { label: 'ওষুধ', icon: Pill, route: '/medicine', bg: 'bg-[#FFF7E6]', color: 'text-amber-600' },
    { label: 'পুষ্টি', icon: Shield, route: '/report', bg: 'bg-[#EAF7EE]', color: 'text-forest' },
    { label: 'রান্নাঘর', icon: ChefHat, route: '/personal-cooker', bg: 'bg-[#F0F8E2]', color: 'text-green-700' },
    { label: 'বাজার', icon: ShoppingCart, route: '/grocery', bg: 'bg-[#FFF0F5]', color: 'text-pink-600' }
  ];

  return (
    <DashboardLayout title="ড্যাশবোর্ড" subtitle="Overview">
      <div className="max-w-[1200px] w-full mx-auto space-y-6 font-bn pb-12 px-4 md:px-6">
        
        {/* Header Greeting */}
        <div className="flex justify-between items-end mb-2">
           <div>
             <h1 className="text-3xl font-extrabold text-ink leading-tight">হ্যালো, {userName}!</h1>
             <p className="text-sm text-ink-muted mt-1 font-medium">আজকের দৈনন্দিন অ্যাক্টিভিটি ওভারভিউ দেখে নিন।</p>
           </div>
        </div>

        {/* HERO CARD */}
        <Link to="/meal-plan" className="block bg-gradient-to-br from-[#1C2123] to-[#2D3436] rounded-[2rem] p-6 md:p-8 relative overflow-hidden shadow-xl hover:shadow-2xl transition-all group">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-5 leading-tight text-white">আপনার ডায়েট প্ল্যান<br/>এখান থেকেই শুরু!</h2>
              <div className="inline-flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center border border-accent/40 group-hover:scale-110 transition-transform">
                  <Play fill="#A7C924" color="#A7C924" size={18} />
                </div>
                <span className="text-white font-medium text-lg">এক্সপ্লোর করুন</span>
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end">
               <span className="text-xs text-white/70 mb-3">আমাদের প্রোগ্রামে যুক্ত আছেন:</span>
               <div className="flex items-center gap-3 mb-5">
                 <div className="flex -space-x-3">
                    <div className="w-10 h-10 rounded-full border-2 border-[#1C2123] bg-[#FFD1DC]"></div>
                    <div className="w-10 h-10 rounded-full border-2 border-[#1C2123] bg-[#B2F5EA]"></div>
                    <div className="w-10 h-10 rounded-full border-2 border-[#1C2123] bg-[#FEEBC8]"></div>
                 </div>
                 <div>
                   <div className="text-white font-extrabold text-lg leading-none">৫.৮ হাজার+</div>
                   <div className="text-white/60 text-[10px]">মেম্বারস</div>
                 </div>
               </div>
               <div className="flex items-center gap-2 text-sm font-extrabold bg-accent text-white px-5 py-2.5 rounded-full hover:bg-white hover:text-ink transition-colors">
                 শুরু করুন <ChevronRight size={18} />
               </div>
            </div>
          </div>
          {/* Decorative graphic */}
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>
        </Link>

        {/* QUICK ACTIONS ROW */}
        <div className="bg-white/60 backdrop-blur-xl border border-ink/5 rounded-[1.5rem] p-3 shadow-sm overflow-x-auto no-scrollbar">
          <div className="flex justify-between items-center gap-2 min-w-[500px]">
            {QUICK_ACTIONS.map((act, i) => (
              <Link key={i} to={act.route} className="flex-1 flex flex-col items-center gap-2 py-2 hover:opacity-80 transition-opacity">
                <div className={`w-12 h-12 rounded-[14px] ${act.bg} flex items-center justify-center ${act.color}`}>
                   <act.icon size={20} />
                </div>
                <span className="text-[11px] font-extrabold text-ink">{act.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 2-COLUMN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* PUSTI AI COMPANION CARD */}
          <Link to="/chat" className="bg-[#EBF0D8]/40 border border-[#A7C924]/30 rounded-[2rem] p-6 flex flex-col justify-between h-full relative overflow-hidden hover:shadow-md transition-all group">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-[14px] bg-accent/15 flex items-center justify-center border border-accent/20 text-accent">
                   <Bot size={22} />
                </div>
                <div>
                   <h3 className="font-extrabold text-xl text-ink">পুষ্টি এআই</h3>
                   <p className="text-xs text-ink-muted mt-0.5">আপনার স্বাস্থ্য সহচর</p>
                </div>
             </div>
             <p className="text-[13px] text-ink font-medium leading-relaxed mb-10 z-10 relative pr-4">
                আপনার ডায়েট বা স্বাস্থ্য সংক্রান্ত যেকোনো প্রশ্ন জিজ্ঞাসা করুন এবং তাৎক্ষণিক বিজ্ঞানভিত্তিক সমাধান পান।
             </p>
             
             <div className="bg-white rounded-[1.25rem] p-2 pl-4 flex items-center justify-between border border-accent/20 z-10 relative shadow-sm">
                <span className="text-[13px] text-ink-faint">কীভাবে সাহায্য করতে পারি?</span>
                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                   <ChevronRight size={16} />
                </div>
             </div>
             <Bot className="absolute bottom-14 right-4 w-28 h-28 text-accent/10 pointer-events-none transform rotate-12" />
          </Link>

          <div className="space-y-6">
            {/* CALORIES CARD */}
            <Link to="/report" className="block bg-white rounded-[2rem] p-6 border border-ink/5 shadow-sm hover:shadow-md transition-all">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                     <div className="w-7 h-7 bg-[#1C2123] rounded-full flex items-center justify-center text-white">
                        <Flame size={12} fill="currentColor" />
                     </div>
                     <span className="font-extrabold text-lg text-ink">ক্যালোরি</span>
                  </div>
                  <div className="text-right">
                     <span className="font-extrabold text-xl">{calorieTarget.toLocaleString()}</span> <span className="text-xs text-ink-muted">Kcal</span>
                  </div>
               </div>
               
               <div className="flex justify-between text-[11px] text-ink-faint mb-2 mt-4">
                  <span>অভাবনীয় পুষ্টি</span>
                  <span>দৈনিক লক্ষ্যমাত্রা</span>
               </div>
               
               <div className="flex items-end gap-1">
                  <span className="font-bn text-5xl font-bold leading-none tracking-tight text-ink">{Math.round(consumedCal).toLocaleString()}</span>
                  <span className="text-base text-ink-muted mb-1">/ Kcal</span>
               </div>
               
               <div className="flex justify-between text-[10px] font-extrabold text-ink mt-3">
                  <span>0</span>
                  <span>{calorieTarget.toLocaleString()}</span>
               </div>
               
               <CustomBarChart consumed={consumedCal} target={calorieTarget} />
               
               <div className="flex justify-between mt-2">
                  <div className="text-left">
                     <div className="font-extrabold text-lg text-ink">{Math.round(consumedCarbs)} <span className="text-[10px] text-ink-muted font-normal">g</span></div>
                     <div className="text-[11px] text-ink-muted mt-0.5">Carbs</div>
                  </div>
                  <div className="text-center">
                     <div className="font-extrabold text-lg text-ink">{Math.round(consumedProtein)} <span className="text-[10px] text-ink-muted font-normal">g</span></div>
                     <div className="text-[11px] text-ink-muted mt-0.5">Proteins</div>
                  </div>
                  <div className="text-right">
                     <div className="font-extrabold text-lg text-ink">{Math.round(consumedFat)} <span className="text-[10px] text-ink-muted font-normal">g</span></div>
                     <div className="text-[11px] text-ink-muted mt-0.5">Fats</div>
                  </div>
               </div>
            </Link>
          </div>

          {/* WEIGHT CARD */}
          <Link to="/health-log" className="block bg-white rounded-[2rem] p-6 border border-ink/5 shadow-sm hover:shadow-md transition-all">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                   <div className="w-7 h-7 bg-[#1C2123] rounded-full flex items-center justify-center text-white">
                      <span className="text-[10px] font-extrabold">↔</span>
                   </div>
                   <span className="font-extrabold text-lg text-ink">ওজন ট্র্যাকিং</span>
                </div>
                <div className="text-right">
                   <span className="font-extrabold text-xl">{height}</span> <span className="text-xs text-ink-muted">cm</span>
                </div>
             </div>
             
             <div className="flex justify-between text-[11px] text-ink-faint mb-2 mt-4">
                <span>লক্ষ্য: {targets?.ideal_body_weight_kg || 65}kg</span>
                <span>উচ্চতা</span>
             </div>
             
             <WaveChart />
             
             <div className="flex justify-between items-end mt-4">
                <div className="flex items-end gap-1">
                   <span className="font-bn text-[56px] font-bold leading-none tracking-tight text-ink">{weight}</span>
                   <span className="text-xl text-ink-muted mb-2">kg</span>
                </div>
                <div className="text-right pb-1">
                   <span className="block text-[10px] text-ink-muted">সাপ্তাহিক ট্র্যাকিং</span>
                   <span className="block text-[10px] text-ink-muted">সম্পন্ন হয়েছে</span>
                   <span className="block text-xs font-extrabold text-ink mt-0.5">চালিয়ে যান!</span>
                </div>
             </div>
          </Link>

          {/* MEDICINE REMINDER CARD */}
          <Link to="/medicine" className="block bg-[#FFF7E6] rounded-[2rem] p-6 border border-[#B06000]/20 shadow-sm hover:shadow-md transition-all h-full">
             <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-[#B06000]/10 rounded-[14px] flex items-center justify-center border border-[#B06000]/20 text-[#B06000]">
                      <Pill size={18} />
                   </div>
                   <div>
                      <h3 className="font-extrabold text-lg text-ink">ওষুধ রিমাইন্ডার</h3>
                      <p className="text-[11px] text-ink-muted mt-0.5">আপনার দৈনন্দিন রুটিন</p>
                   </div>
                </div>
                <div className="bg-[#B06000] text-white font-extrabold text-sm min-w-[28px] h-7 rounded-full flex items-center justify-center px-2">
                   {medicines.length}
                </div>
             </div>
             
             <div className="flex-1 space-y-2.5 mb-4">
                {medicines.length > 0 ? medicines.slice(0, 3).map((med, i) => (
                   <div key={i} className="flex items-center justify-between bg-[#B06000]/5 border border-[#B06000]/10 rounded-2xl p-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                         <div className="w-2 h-2 rounded-full bg-[#B06000]"></div>
                         <div>
                            <div className="font-extrabold text-sm text-ink truncate max-w-[120px]">{med.name} {med.dose && <span className="font-normal text-[10px] text-ink-muted">- {med.dose}</span>}</div>
                            <div className="text-[11px] text-ink-muted mt-0.5">{med.with_food ? 'খাবারের পর' : 'খালি পেটে'}</div>
                         </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                         {med.times.slice(0, 2).map((t: string, ti: number) => (
                            <div key={ti} className="bg-white flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-[#B06000]/20 text-[#B06000] text-[10px] font-extrabold shadow-sm">
                               <Clock size={9} strokeWidth={3} /> {t}
                            </div>
                         ))}
                      </div>
                   </div>
                )) : (
                   <div className="h-full flex flex-col items-center justify-center text-[#B06000]/50 gap-2 py-6">
                       <Pill size={32} />
                       <span className="text-[13px] font-extrabold text-ink-muted">কোনো ওষুধ যোগ করা নেই</span>
                   </div>
                )}
             </div>
             
             <div className="flex items-center gap-1.5 mt-auto pt-3 text-[11px] text-[#B06000] font-bold">
                <Bell size={12} /> রিমাইন্ডার ম্যানেজ করুন <ChevronRight size={14} className="ml-auto" />
             </div>
          </Link>

        </div>
      </div>
    </DashboardLayout>
  );
};
