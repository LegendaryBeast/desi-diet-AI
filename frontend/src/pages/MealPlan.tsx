import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  ChevronRight, 
  Coffee, 
  Utensils, 
  Apple, 
  Moon, 
  RefreshCw,
  Info,
  Flame,
  Droplet,
  Zap
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useUserProfile } from '../hooks/useUserProfile';

const MEAL_SLOTS = [
  { 
    id: 'breakfast', 
    nameBn: 'সকালের নাস্তা', 
    nameEn: 'Breakfast', 
    time: '৮:৩০ AM', 
    icon: Coffee, 
    pct: 20,
    foods: [
      { nameBn: 'লাল চালের আটার রুটি', nameEn: 'Whole Wheat Roti', amount: '২টি', cal: 210 },
      { nameBn: 'সবজি ভাজি (কম তেল)', nameEn: 'Mixed Vegetable Fry', amount: '১ কাপ', cal: 85 },
      { nameBn: 'সিদ্ধ ডিম', nameEn: 'Boiled Egg', amount: '১টি', cal: 78 }
    ]
  },
  { 
    id: 'snack1', 
    nameBn: 'সকালের হালকা নাস্তা', 
    nameEn: 'Morning Snack', 
    time: '১১:০০ AM', 
    icon: Apple, 
    pct: 10,
    foods: [
      { nameBn: 'পেয়ারা', nameEn: 'Guava', amount: '১টি (মাঝারি)', cal: 60 },
      { nameBn: 'কাঠবাদাম', nameEn: 'Almonds', amount: '৫-৬টি', cal: 40 }
    ]
  },
  { 
    id: 'lunch', 
    nameBn: 'দুপুরের খাবার', 
    nameEn: 'Lunch', 
    time: '২:০০ PM', 
    icon: Utensils, 
    pct: 35,
    foods: [
      { nameBn: 'ঢেঁকি ছাঁটা চালের ভাত', nameEn: 'Brown Rice', amount: '১.৫ কাপ', cal: 320 },
      { nameBn: 'রুই মাছের ঝোল', nameEn: 'Rui Fish Curry', amount: '১ টুকরা', cal: 180 },
      { nameBn: 'মুগ ডাল', nameEn: 'Mung Dal', amount: '০.৫ কাপ', cal: 90 },
      { nameBn: 'লেবু ও শসা', nameEn: 'Lemon & Cucumber', amount: 'ইচ্ছেমতো', cal: 15 }
    ]
  },
  { 
    id: 'snack2', 
    nameBn: 'বিকেলের নাস্তা', 
    nameEn: 'Evening Snack', 
    time: '৫:৩০ PM', 
    icon: Apple, 
    pct: 10,
    foods: [
      { nameBn: 'টক দই', nameEn: 'Sour Curd', amount: '১০০ গ্রাম', cal: 65 },
      { nameBn: 'চিয়া সিড', nameEn: 'Chia Seeds', amount: '১ চা চামচ', cal: 45 }
    ]
  },
  { 
    id: 'dinner', 
    nameBn: 'রাতের খাবার', 
    nameEn: 'Dinner', 
    time: '৯:০০ PM', 
    icon: Moon, 
    pct: 25,
    foods: [
      { nameBn: 'লাল চালের আটার রুটি', nameEn: 'Whole Wheat Roti', amount: '১টি', cal: 105 },
      { nameBn: 'লাউ দিয়ে শোল মাছ', nameEn: 'Bottle Gourd with Fish', amount: '১ কাপ', cal: 140 },
      { nameBn: 'সবজি সালাদ', nameEn: 'Vegetable Salad', amount: '১ কাপ', cal: 25 }
    ]
  }
];

import { DashboardLayout } from '../components/layout/DashboardLayout';

export const MealPlan = () => {
  const { t } = useTranslation();
  const { targets } = useUserProfile();

  return (
    <DashboardLayout 
      title="আজকের মিল প্ল্যান" 
      subtitle="Nutrition Strategy"
    >
      <div className="max-w-5xl mx-auto space-y-10 pb-20">
        {/* Header with Circular Progress */}
        <header className="flex flex-col lg:flex-row items-center gap-8 md:gap-12 bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-ink/5">
          <div className="relative w-40 h-40 md:w-48 md:h-48 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80" cy="80" r="72"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-cream"
                style={{ cx: '50%', cy: '50%', r: '45%' }}
              />
              <circle
                cx="80" cy="80" r="72"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 80}
                strokeDashoffset={2 * Math.PI * 80 * (1 - 0.65)}
                className="text-accent"
                style={{ cx: '50%', cy: '50%', r: '45%' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-display text-3xl md:text-4xl font-black text-ink leading-none">৬৫%</span>
              <span className="font-bn text-[0.6rem] md:text-xs text-ink-muted mt-1 uppercase tracking-wider font-bold">গৃহীত</span>
            </div>
          </div>

          <div className="flex-1 text-center lg:text-left">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-ink mb-4 leading-tight">
              আজকের <em className="italic text-ink-muted">খাবার</em>
            </h1>
            <p className="font-bn text-base md:text-lg text-ink-muted mb-8 max-w-lg mx-auto lg:mx-0">
              আপনার শরীর ও স্বাস্থ্যের লক্ষ্য অনুযায়ী তৈরি করা আজকের পুষ্টি পরিকল্পনা।
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { icon: Flame, label: 'লক্ষ্য', val: `${targets.targetCalories} kcal`, color: 'text-ink' },
                { icon: Zap, label: 'শর্করা', val: `${targets.carbsG}g`, color: 'text-accent' },
                { icon: Utensils, label: 'প্রোটিন', val: `${targets.proteinG}g`, color: 'text-forest' },
                { icon: Droplet, label: 'চর্বি', val: `${targets.fatG}g`, color: 'text-gold' },
              ].map((item, i) => (
                <div key={i} className="bg-cream/50 p-4 rounded-2xl border border-ink/5">
                  <div className="flex items-center gap-2 text-ink-faint mb-1 justify-center lg:justify-start">
                    <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                    <span className="font-bn text-[0.65rem] font-bold uppercase tracking-wider">{item.label}</span>
                  </div>
                  <div className="font-bold text-base md:text-lg text-ink">{item.val}</div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Meal Cards */}
        <div className="space-y-4 md:space-y-6">
          {MEAL_SLOTS.map((slot, i) => (
            <motion.div 
              key={slot.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 flex flex-col lg:flex-row gap-6 md:gap-8 border border-ink/5 hover:border-accent/10 transition-all group shadow-sm"
            >
              <div className="lg:w-48 flex lg:flex-col items-center lg:items-start justify-between lg:justify-center border-b lg:border-b-0 lg:border-r border-ink/5 pb-4 lg:pb-0 lg:pr-8">
                <div className="bg-cream p-3 md:p-4 rounded-2xl group-hover:bg-ink group-hover:text-cream transition-colors">
                  <slot.icon className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div className="mt-0 lg:mt-4 text-right lg:text-left">
                  <div className="font-bn text-base md:text-lg font-bold text-ink">{slot.nameBn}</div>
                  <div className="font-body text-[0.6rem] md:text-[0.65rem] uppercase tracking-widest text-ink-faint font-bold">{slot.time}</div>
                </div>
              </div>

              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {slot.foods.map((food, j) => (
                    <div key={j} className="flex items-center justify-between p-4 bg-cream/30 rounded-2xl hover:bg-cream/60 transition-colors border border-transparent hover:border-ink/5">
                      <div>
                        <div className="font-bn text-ink font-bold text-sm md:text-base">{food.nameBn}</div>
                        <div className="font-bn text-[0.7rem] md:text-xs text-ink-faint font-medium">{food.amount}</div>
                      </div>
                      <div className="font-bold text-ink-muted text-xs md:text-sm bg-white px-2 py-1 rounded-lg border border-ink/5">{food.cal} cal</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:w-40 flex lg:flex-col items-center justify-center gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-ink/5">
                <div className="text-center">
                  <div className="text-[0.6rem] text-ink-faint font-bn font-bold uppercase tracking-wider mb-1">Total Cal</div>
                  <div className="font-display text-2xl md:text-3xl font-black text-ink">
                    {slot.foods.reduce((acc, f) => acc + f.cal, 0)}
                  </div>
                </div>
                <button className="flex items-center gap-2 font-bn text-[0.65rem] font-bold uppercase tracking-wider text-ink-muted hover:text-accent transition-colors bg-cream px-4 py-2 rounded-xl group-hover:bg-cream-dark">
                  <RefreshCw className="w-3 h-3" />
                  Swap
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Nutritional Summary Footer */}
        <footer className="bg-ink text-cream p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Info className="w-48 h-48 md:w-64 md:h-64" />
          </div>
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
            <div className="md:col-span-1">
              <h3 className="font-bn text-xl md:text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                পুষ্টির বিস্তারিত
              </h3>
              <p className="font-bn text-sm md:text-base text-cream/60 leading-relaxed">
                আপনার আজকের ডায়েটে ফাইবার এবং মাইক্রো-নিউট্রিয়েন্ট ব্যালেন্স করার জন্য পর্যাপ্ত শাকসবজি রাখা হয়েছে। পর্যাপ্ত পানি (৩.২ লিটার) পান করতে ভুলবেন না।
              </p>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 self-end">
              {[
                { label: 'প্রোটিন', pct: 75, color: 'bg-forest' },
                { label: 'শর্করা', pct: 60, color: 'bg-accent' },
                { label: 'চর্বি', pct: 45, color: 'bg-gold' },
              ].map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between font-bn text-[0.7rem] md:text-xs mb-3 font-bold uppercase tracking-widest opacity-60">
                    <span>{m.label}</span><span>{m.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: `${m.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.5 + (i * 0.2) }}
                      className={`h-full ${m.color}`} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </DashboardLayout>
  );
};
