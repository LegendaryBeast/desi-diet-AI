import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Zap,
  Utensils,
  Droplet,
  Compass,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { mealPlanApi, type MealPlanResponse } from '../lib/api';

const VITAMIN_NAMES = [
  "Vitamin A", "Ascorbic acids (C)", "Vitamin D", "Vitamin E", "Vitamin K",
  "Thiamine (B1)", "Riboflavin (B2)", "Niacin (B3)", "Total B6", "Folate (total)",
  "Pantothenic acid (B5)", "Biotin (B7)"
];
const FATTY_NAMES = ["Cis ω-6 Fatty acids", "Cis ω-3 Fatty acids"];

const NUTRIENT_METADATA: Record<string, { desc: string; foods: string[]; category: string }> = {
  "Vitamin A": {
    desc: "দৃষ্টিশক্তি ভালো রাখে, রোগ প্রতিরোধ ক্ষমতা বাড়ায় এবং ত্বক সুস্থ রাখে।",
    foods: ["গাজর", "মিষ্টি আলু", "পালং শাক", "পাকা আম", "ডিমের কুসুম", "মলা-ঢেলা মাছ"],
    category: "ভিটামিন"
  },
  "Ascorbic acids (C)": {
    desc: "ত্বক ও হাড়ের গঠনে সাহায্য করে, ক্ষত নিরাময় করে এবং রোগ প্রতিরোধ ক্ষমতা বাড়ায়।",
    foods: ["আমলকী", "পেয়ারা", "লেবু", "কমলা", "কাঁচামরিচ", "টমেটো"],
    category: "ভিটামিন"
  },
  "Vitamin D": {
    desc: "ক্যালসিয়াম শোষণে সাহায্য করে, হাড় ও দাঁত মজবুত করে।",
    foods: ["ডিমের কুসুম", "সামুদ্রিক মাছ", "দুধ", "মাশরুম", "সূর্যালোক"],
    category: "ভিটামিন"
  },
  "Vitamin E": {
    desc: "শক্তিশালী অ্যান্টিঅক্সিডেন্ট যা কোষকে ক্ষতি থেকে রক্ষা করে এবং ত্বক ভালো রাখে।",
    foods: ["কাঠবাদাম", "সূর্যমুখীর বীজ", "পালং শাক", "ব্রকলি", "সবজি তেল"],
    category: "ভিটামিন"
  },
  "Vitamin K": {
    desc: "রক্ত জমাট বাঁধতে সাহায্য করে এবং হাড়ের স্বাস্থ্য ভালো রাখে।",
    foods: ["বাঁধাকপি", "ব্রকলি", "পালং শাক", "সরিষা শাক", "সবুজ শাকসবজি"],
    category: "ভিটামিন"
  },
  "Thiamine (B1)": {
    desc: "কার্বোহাইড্রেট থেকে শক্তি উৎপাদনে সাহায্য করে এবং স্নায়ুতন্ত্র সচল রাখে।",
    foods: ["লাল চালের ভাত", "ঢেঁকি ছাঁটা চাল", "আস্ত গম", "ডাল", "বাদাম"],
    category: "ভিটামিন"
  },
  "Riboflavin (B2)": {
    desc: "শক্তি উৎপাদন, কোষের বৃদ্ধি এবং লাল রক্তকণিকা তৈরিতে সাহায্য করে।",
    foods: ["দুধ", "দই", "ডিম", "কলিজা", "সবুজ শাকসবজি"],
    category: "ভিটামিন"
  },
  "Niacin (B3)": {
    desc: "হজম প্রক্রিয়া উন্নত করে, ত্বক ভালো রাখে এবং স্নায়ুতন্ত্রের কার্যকারিতা বজায় রাখে।",
    foods: ["মুরগির মাংস", "মাছ", "বাদাম", "আস্ত শস্যদানা", "ডাল"],
    category: "ভিটামিন"
  },
  "Total B6": {
    desc: "মস্তিষ্কের বিকাশ, হরমোন নিয়ন্ত্রণ এবং হিমোগ্লোবিন তৈরিতে সাহায্য করে।",
    foods: ["কলা", "আলু", "মুরগির মাংস", "মাছ", "লাল চাল"],
    category: "ভিটামিন"
  },
  "Folate (total)": {
    desc: "ডিএনএ তৈরি এবং নতুন কোষ গঠনে অত্যন্ত গুরুত্বপূর্ণ, বিশেষ করে গর্ভবতী নারীদের জন্য।",
    foods: ["পালং শাক", "ডাল", "কমলা", "ব্রকলি", "ডিম", "সবুজ শাকসবজি"],
    category: "ভিটামিন"
  },
  "Pantothenic acid (B5)": {
    desc: "হরমোন ও কোলেস্টেরল তৈরিতে এবং খাদ্য থেকে শক্তি রূপান্তরে সাহায্য করে।",
    foods: ["ডিম", "মুরগির মাংস", "মাশরুম", "মিষ্টি আলু", "বাদাম"],
    category: "ভিটামিন"
  },
  "Biotin (B7)": {
    desc: "চুল, নখ এবং ত্বকের স্বাস্থ্য রক্ষায় ও শক্তি বিপাকে ভূমিকা রাখে।",
    foods: ["ডিমের কুসুম", "বাদাম", "মিষ্টি আলু", "ফুলকপি", "কলা"],
    category: "ভিটামিন"
  },
  "Calcium (Ca)": {
    desc: "হাড় ও দাঁত শক্ত করে এবং পেশী ও স্নায়ুর সঠিক কার্যকারিতা নিয়ন্ত্রণ করে।",
    foods: ["দুধ", "দই", "পনির", "ছোট মাছ (কাঁটাসহ)", "পালং শাক", "বাদাম"],
    category: "খনিজ"
  },
  "Iron (Fe)": {
    desc: "হিমোগ্লোবিন তৈরিতে সাহায্য করে যা সারা শরীরে অক্সিজেন বহন করে।",
    foods: ["কলিজা", "লাল মাংস", "কচু শাক", "পালং শাক", "ডাল", "আনার (বেদানা)"],
    category: "খনিজ"
  },
  "Magnesium (Mg)": {
    desc: "৩০০টিরও বেশি এনজাইম বিক্রিয়া নিয়ন্ত্রণ করে এবং স্নায়ু ও পেশীর শক্তি জোগায়।",
    foods: ["কাঠবাদাম", "পালং শাক", "কাজুবাদাম", "লাল চালের ভাত", "কলা"],
    category: "খনিজ"
  },
  "Phosphorus (P)": {
    desc: "হাড়ের গঠন মজবুত করে এবং শরীরের কোষ ও কলা মেরামতে সাহায্য করে।",
    foods: ["মাছ", "মুরগির মাংস", "দুধ", "ডিম", "বাদাম", "গম"],
    category: "খনিজ"
  },
  "Potassium (K)": {
    desc: "রক্তচাপ নিয়ন্ত্রণ করে, হৃদযন্ত্র সুস্থ রাখে এবং তরলের ভারসাম্য বজায় রাখে।",
    foods: ["ডাবের পানি", "কলা", "মিষ্টি আলু", "পালং শাক", "টমেটো", "ডাল"],
    category: "খনিজ"
  },
  "Sodium (Na)": {
    desc: "শরীরে তরলের ভারসাম্য বজায় রাখে এবং পেশী ও স্নায়ুর সংকোচন-প্রসারণ নিয়ন্ত্রণ করে।",
    foods: ["খাবার লবণ", "দুধ", "বিট শাক", "সামুদ্রিক মাছ"],
    category: "খনিজ"
  },
  "Zinc (Zn)": {
    desc: "রোগ প্রতিরোধ ক্ষমতা শক্তিশালী করে, ক্ষত নিরাময় ত্বরান্বিত করে এবং কোষ বিভাজনে সাহায্য করে।",
    foods: ["লাল মাংস", "মুরগির মাংস", "ডাল", "বাদাম", "আস্ত শস্যদানা"],
    category: "খনিজ"
  },
  "Copper (Cu)": {
    desc: "লোহা শোষণে, রক্তনালী ও স্নায়ুতন্ত্রের স্বাস্থ্য বজায় রাখতে ভূমিকা রাখে।",
    foods: ["কলিজা", "বাদাম", "আস্ত শস্যদানা", "সবুজ শাকসবজি", "ডার্ক চকলেট"],
    category: "খনিজ"
  },
  "Manganese (Mn)": {
    desc: "হাড়ের গঠনে, অ্যামিনো অ্যাসিড ও কার্বোহাইড্রেট বিপাকে সাহায্য করে।",
    foods: ["বাদাম", "ডাল", "আস্ত শস্যদানা", "সবুজ চা", "সবুজ শাকসবজি"],
    category: "খনিজ"
  },
  "Selenium (Se)": {
    desc: "কোষকে জারণ ক্ষতি থেকে রক্ষা করে এবং থাইরয়েড গ্রন্থির কার্যকারিতা সচল রাখে।",
    foods: ["সামুদ্রিক মাছ", "ডিম", "মুরগির মাংস", "লাল চালের ভাত", "বাদাম"],
    category: "খনিজ"
  },
  "Cis ω-6 Fatty acids": {
    desc: "মস্তিষ্কের সঠিক কার্যকারিতা বজায় রাখতে এবং কোষের বৃদ্ধিতে সাহায্য করে।",
    foods: ["সূর্যমুখী তেল", "সয়াবিন তেল", "বাদাম", "তিল তেল"],
    category: "ফ্যাটি অ্যাসিড"
  },
  "Cis ω-3 Fatty acids": {
    desc: "হৃদযন্ত্রের সুরক্ষা দেয়, কোলেস্টেরল কমায় এবং প্রদাহ দূর করতে সাহায্য করে।",
    foods: ["ইলিশ মাছ", "রুই মাছ", "তিসির তেল", "আখরোট", "চিয়া সিড"],
    category: "ফ্যাটি অ্যাসিড"
  }
};

export const Micronutrients: React.FC = () => {
  const { i18n } = useTranslation();
  const isBn = i18n.language === 'bn';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [micronutrients, setMicronutrients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'vitamins' | 'minerals' | 'fats'>('all');
  const [selectedNutrient, setSelectedNutrient] = useState<any | null>(null);

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        setLoading(true);
        const data = await mealPlanApi.getDaily('bn');
        if (data && data.plan_data) {
          const parsed = typeof data.plan_data === 'string'
            ? JSON.parse(data.plan_data)
            : data.plan_data;
          if (parsed && parsed.micronutrient_targets) {
            setMicronutrients(parsed.micronutrient_targets);
            return;
          }
        }
        setError(isBn ? 'কোন পুষ্টি তথ্য পাওয়া যায়নি।' : 'No micronutrient data found.');
      } catch (err) {
        setError(isBn ? 'তথ্য লোড করতে ব্যর্থ হয়েছে।' : 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlanData();
  }, [isBn]);

  const EXCLUDE_NAMES = ["Choline", "Vitamin B12", "Chloride (Cl)", "Energy", "Vitamin B", "Chloride", "Vitamin B12 (Cobalamin)", "Iodine (I)"];
  const vitamins = micronutrients.filter(n => VITAMIN_NAMES.includes(n.name) && !EXCLUDE_NAMES.includes(n.name));
  const minerals = micronutrients.filter(n => !VITAMIN_NAMES.includes(n.name) && !FATTY_NAMES.includes(n.name) && !EXCLUDE_NAMES.includes(n.name));
  const fatty = micronutrients.filter(n => FATTY_NAMES.includes(n.name) && !EXCLUDE_NAMES.includes(n.name));

  const getFilteredItems = () => {
    let items = micronutrients.filter(n => !EXCLUDE_NAMES.includes(n.name));
    if (activeTab === 'vitamins') items = vitamins;
    else if (activeTab === 'minerals') items = minerals;
    else if (activeTab === 'fats') items = fatty;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.name_bn.toLowerCase().includes(q)
      );
    }
    return items;
  };

  const filteredItems = getFilteredItems();

  // Find the top deficiencies (percentage < 100, sorted ascending)
  const activeMicronutrients = micronutrients.filter(n => !EXCLUDE_NAMES.includes(n.name));
  const deficiencies = [...activeMicronutrients]
    .filter(n => n.percentage < 100)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 3);

  const metCount = activeMicronutrients.filter(n => n.percentage >= 100).length;
  const totalCount = activeMicronutrients.length;
  const metPercentage = totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 0;

  return (
    <DashboardLayout
      title={isBn ? "পুষ্টি উপাদান ট্র্যাকার" : "Micronutrient Tracker"}
      subtitle={isBn ? "আপনার শরীরের ভিটামিন ও মিনারেলসের সঠিক মাত্রা ট্র্যাক করুন" : "Track and optimize your vitamins and minerals intake"}
      headerActions={
        <button
          onClick={() => navigate('/meal-plan')}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-cream border border-ink/10 rounded-2xl font-bn font-bold text-xs text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {isBn ? 'মিল প্ল্যানে ফিরে যান' : 'Back to Meal Plan'}
        </button>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="font-bn text-sm text-ink-muted">লোডিং হচ্ছে...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-white border border-ink/5 rounded-[2.5rem] space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h3 className="font-bn font-bold text-lg text-ink">{error}</h3>
          <button
            onClick={() => navigate('/meal-plan')}
            className="px-5 py-2.5 bg-accent text-white rounded-2xl font-bn font-bold text-sm"
          >
            মিল প্ল্যান তৈরি করুন
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Left / Main Dashboard Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Core Stats Overview Card */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-ink/5 shadow-sm flex flex-col md:flex-row items-center gap-6 md:gap-8">
              {/* Progress Radial Gauge */}
              <div className="relative w-32 h-32 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-cream" />
                  <circle
                    cx="50%" cy="50%" r="42%"
                    stroke="currentColor" strokeWidth="8" fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 0.42 * 128}`}
                    strokeDashoffset={`${2 * Math.PI * 0.42 * 128 * (1 - metPercentage / 100)}`}
                    className="text-accent transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-body text-3xl font-bold text-ink leading-none">{metPercentage}%</span>
                  <span className="font-bn text-[0.55rem] text-ink-faint mt-1.5 font-bold uppercase tracking-wider">
                    {isBn ? 'লক্ষ্য অর্জিত' : 'Targets Met'}
                  </span>
                </div>
              </div>

              {/* Progress Summary Text */}
              <div className="flex-1 text-center md:text-left space-y-2">
                <h3 className="font-display font-black text-xl text-ink">
                  {isBn ? 'দৈনিক পুষ্টি স্কোর' : 'Daily Nutrition Score'}
                </h3>
                <p className="font-bn text-xs text-ink-muted leading-relaxed">
                  {isBn 
                    ? `আপনি আজ মোট ${totalCount}টি প্রয়োজনীয় উপাদানের মধ্যে ${metCount}টি উপাদান সম্পূর্ণ গ্রহণ করেছেন। সুস্থ ও সতেজ থাকতে আপনার প্রতিদিনের ডায়েটে বাকি উপাদানগুলো যোগ করুন।`
                    : `You have successfully completed ${metCount} out of ${totalCount} target micronutrients today. Keep monitoring and fuel your body correctly.`
                  }
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-1">
                  <span className="font-bn text-[0.6rem] font-bold px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full">
                    ভিটামিন: {vitamins.filter(n => n.percentage >= 100).length}/{vitamins.length}
                  </span>
                  <span className="font-bn text-[0.6rem] font-bold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
                    খনিজ: {minerals.filter(n => n.percentage >= 100).length}/{minerals.length}
                  </span>
                  <span className="font-bn text-[0.6rem] font-bold px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full">
                    ফ্যাটি অ্যাসিড: {fatty.filter(n => n.percentage >= 100).length}/{fatty.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-ink/5">
              <div className="flex-1 flex gap-1 p-1 bg-cream/50 rounded-xl overflow-x-auto hide-scrollbar">
                {([
                  { id: 'all', label: isBn ? 'সব' : 'All' },
                  { id: 'vitamins', label: isBn ? 'ভিটামিন' : 'Vitamins' },
                  { id: 'minerals', label: isBn ? 'খনিজ' : 'Minerals' },
                  { id: 'fats', label: isBn ? 'ফ্যাটি অ্যাসিড' : 'Fatty Acids' }
                ] as const).map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`whitespace-nowrap px-4 py-2 rounded-lg font-bn text-xs font-bold transition-all ${
                        active 
                          ? 'bg-white text-ink shadow-sm' 
                          : 'text-ink-muted hover:bg-white/50 hover:text-ink'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-ink-faint" />
                <input
                  type="text"
                  placeholder={isBn ? "পুষ্টির নাম খুঁজুন..." : "Search nutrients..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-60 bg-cream/50 border border-ink/10 rounded-xl pl-9 pr-4 py-2.5 font-bn text-xs focus:outline-none focus:border-accent/40 focus:ring-2 ring-accent/10"
                />
              </div>
            </div>

            {/* Grid of Nutrient Cards */}
            <motion.div 
              layout 
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5"
            >
              <AnimatePresence mode="popLayout">
                {filteredItems.map((nut) => {
                  let barColor = "bg-accent";
                  let bgBadge = "bg-accent/10 text-accent";
                  if (nut.percentage >= 100) {
                    barColor = "bg-emerald-500";
                    bgBadge = "bg-emerald-50 text-emerald-700";
                  } else if (nut.percentage >= 50) {
                    barColor = "bg-amber-500";
                    bgBadge = "bg-amber-50 text-amber-700";
                  } else if (nut.percentage > 0) {
                    barColor = "bg-accent";
                    bgBadge = "bg-red-50 text-red-700";
                  } else {
                    barColor = "bg-ink/10";
                    bgBadge = "bg-cream text-ink-muted";
                  }

                  return (
                    <motion.div
                      key={nut.name}
                      layoutId={`nutrient-card-${nut.name}`}
                      onClick={() => setSelectedNutrient(nut)}
                      className="bg-white p-4 rounded-2xl border border-ink/5 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 cursor-pointer transition-all flex flex-col justify-between h-[120px] relative overflow-hidden group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bn font-bold text-sm text-ink leading-snug truncate group-hover:text-accent transition-colors">{nut.name_bn}</h4>
                          <span className="text-[0.6rem] text-ink-faint uppercase font-bold tracking-wider truncate block mt-0.5">{nut.name}</span>
                        </div>
                        <span className={`font-body text-[0.65rem] font-bold shrink-0 px-2 py-0.5 rounded-lg transition-all ${bgBadge}`}>
                          {nut.percentage}%
                        </span>
                      </div>

                      <div className="space-y-1.5 mt-auto">
                        <div className="w-full bg-cream rounded-full h-1.5 overflow-hidden border border-ink/5">
                          <div
                            className={`h-full ${barColor} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min(100, nut.percentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[0.58rem] font-bn text-ink-faint">
                          <span>{isBn ? 'গৃহীত: ' : 'Cons: '} <b className="text-ink-muted font-body font-bold">{nut.consumed} {nut.unit}</b></span>
                          <span>{isBn ? 'লক্ষ্য: ' : 'Target: '} <b className="text-ink-muted font-body font-bold">{nut.target} {nut.unit}</b></span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12 bg-white rounded-3xl border border-ink/5">
                <HelpCircle className="w-8 h-8 text-ink-faint mx-auto mb-2" />
                <p className="font-bn text-xs text-ink-muted">{isBn ? 'কোন পুষ্টি উপাদান পাওয়া যায়নি।' : 'No nutrients found matching your search.'}</p>
              </div>
            )}

          </div>

          {/* Right Sidebar Column */}
          <div className="space-y-6">
            
            {/* Gap Analysis Panel */}
            <div className="bg-white p-6 md:p-7 rounded-[2.5rem] border border-ink/5 shadow-sm space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-red-500 rounded-full" />
                <h3 className="font-display font-black text-base text-ink">
                  {isBn ? 'পুষ্টি ঘাটতি বিশ্লেষণ' : 'Nutritional Gap Analysis'}
                </h3>
              </div>
              
              <p className="font-bn text-xs text-ink-muted leading-relaxed">
                {isBn 
                  ? 'আপনার আজকের মিল প্ল্যান অনুযায়ী নিচের ৩টি উপাদানের ঘাটতি সবচেয়ে বেশি। এগুলো পূরণ করার জন্য সেরা পরামর্শ:'
                  : 'Based on your logs, you are most deficient in these 3 micronutrients today. Consider adding these foods:'
                }
              </p>

              <div className="space-y-3.5">
                {deficiencies.map((def) => {
                  const meta = NUTRIENT_METADATA[def.name];
                  return (
                    <div key={def.name} className="p-3 bg-cream/30 rounded-2xl border border-ink/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bn text-xs font-bold text-ink">{def.name_bn}</span>
                        <span className="font-body text-[0.62rem] font-bold px-1.5 py-0.5 bg-red-50 text-red-600 rounded">
                          {def.percentage}%
                        </span>
                      </div>
                      {meta && (
                        <div className="space-y-1">
                          <p className="font-bn text-[0.65rem] text-ink-muted leading-normal">{meta.desc}</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {meta.foods.slice(0, 3).map((f) => (
                              <span key={f} className="font-bn text-[0.58rem] bg-white border border-ink/5 px-1.5 py-0.5 rounded text-accent font-bold">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {deficiencies.length === 0 && (
                  <div className="text-center py-6 text-emerald-600 font-bn text-xs font-bold bg-emerald-50 rounded-2xl flex items-center justify-center gap-1.5 border border-emerald-100">
                    <CheckCircle className="w-4 h-4" /> {isBn ? 'সব পুষ্টি উপাদান সফলভাবে পূর্ণ!' : 'All nutrient targets met!'}
                  </div>
                )}
              </div>
            </div>

            {/* Health Education Info Panel */}
            <div className="bg-gradient-to-br from-ink to-ink-muted text-cream p-6 md:p-7 rounded-[2.5rem] shadow-lg relative overflow-hidden">
              <div className="absolute right-[-2rem] bottom-[-2rem] font-display text-[7rem] font-black opacity-[0.03] select-none pointer-events-none">
                NDG
              </div>
              <div className="relative z-10 space-y-3">
                <BookOpen className="w-7 h-7 text-accent" />
                <h3 className="font-display font-black text-base">
                  {isBn ? 'মাইক্রোনিউট্রিয়েন্ট কেন জরুরী?' : 'Why Micronutrients Matter?'}
                </h3>
                <p className="font-bn text-xs text-cream/70 leading-relaxed">
                  {isBn
                    ? 'ভিটামিন ও মিনারেল শরীরের রোগ প্রতিরোধ ক্ষমতা বাড়ানো, হরমোন নিয়ন্ত্রণ এবং শক্তির মাত্রা ঠিক রাখতে সাহায্য করে। ক্যালোরি বা ম্যাক্রোর পাশাপাশি পর্যাপ্ত মাইক্রো পুষ্টি গ্রহণ আপনাকে রোগমুক্ত এবং কর্মক্ষম রাখবে।'
                    : 'Vitamins and minerals support immune system health, cell production, metabolism, and organic stability. Focus on micro-density alongside macros.'
                  }
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Detail Slide-over / Modal (on nutrient card click) */}
      <AnimatePresence>
        {selectedNutrient && (() => {
          const meta = NUTRIENT_METADATA[selectedNutrient.name];
          const isDone = selectedNutrient.percentage >= 100;
          return (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedNutrient(null)}
                className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-[99999]"
              />

              {/* Detail Card Container */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white z-[99999] shadow-2xl border-l border-ink/5 flex flex-col p-6 md:p-8 justify-between"
              >
                <div className="space-y-6">
                  {/* Close header */}
                  <div className="flex items-center justify-between">
                    <span className="font-bn text-xs font-bold text-ink-faint uppercase tracking-wider">
                      {selectedNutrient.name.includes('Fat') ? 'ফ্যাটি অ্যাসিড' : selectedNutrient.name.match(/Vitamin/i) ? 'ভিটামিন' : 'মিনারেল/খনিজ'}
                    </span>
                    <button
                      onClick={() => setSelectedNutrient(null)}
                      className="p-1.5 hover:bg-cream rounded-xl text-ink-muted hover:text-ink transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 rotate-180" />
                    </button>
                  </div>

                  {/* Title */}
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-2xl text-ink leading-tight">
                      {selectedNutrient.name_bn}
                    </h3>
                    <p className="font-body font-semibold text-xs text-accent uppercase tracking-widest">
                      {selectedNutrient.name}
                    </p>
                  </div>

                  {/* Target ring/card */}
                  <div className="p-4 bg-cream/40 rounded-2xl border border-ink/5 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[0.62rem] text-ink-faint font-bn font-bold uppercase tracking-wider">
                        {isBn ? 'গৃহীত / লক্ষ্য' : 'Consumed / Target'}
                      </div>
                      <div className="font-body text-lg font-bold text-ink">
                        {selectedNutrient.consumed} <span className="text-xs font-normal text-ink-muted">{selectedNutrient.unit}</span>
                        <span className="text-ink-faint font-normal mx-1.5">/</span>
                        {selectedNutrient.target} <span className="text-xs font-normal text-ink-muted">{selectedNutrient.unit}</span>
                      </div>
                    </div>
                    <span className={`font-body text-sm font-bold px-2.5 py-1 rounded-xl ${isDone ? 'bg-green-50 text-green-700' : 'bg-accent/5 text-accent'}`}>
                      {selectedNutrient.percentage}%
                    </span>
                  </div>

                  {/* Why it is needed */}
                  {meta && (
                    <div className="space-y-2">
                      <h4 className="font-bn font-bold text-sm text-ink">{isBn ? 'কেন এটি প্রয়োজন?' : 'Why is it needed?'}</h4>
                      <p className="font-bn text-xs text-ink-muted leading-relaxed">{meta.desc}</p>
                    </div>
                  )}

                  {/* Recommended food sources */}
                  {meta && (
                    <div className="space-y-3">
                      <h4 className="font-bn font-bold text-sm text-ink">{isBn ? 'সেরা খাদ্য উৎস (দেশী খাবার):' : 'Top local food sources:'}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {meta.foods.map((foodName) => (
                          <div key={foodName} className="p-2 bg-cream/20 rounded-xl border border-ink/5 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                            <span className="font-bn text-xs font-bold text-ink-muted">{foodName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-ink/5 text-center">
                  <button
                    onClick={() => setSelectedNutrient(null)}
                    className="w-full py-3 bg-ink hover:bg-accent text-white rounded-2xl font-bn font-bold text-sm transition-colors"
                  >
                    {isBn ? 'ঠিক আছে' : 'Close'}
                  </button>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </DashboardLayout>
  );
};
