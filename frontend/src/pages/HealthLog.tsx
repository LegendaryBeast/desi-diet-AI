import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Calendar, Activity, Droplets, Weight, Plus, History } from 'lucide-react';
import { Button } from '../components/ui/Button';

const MOCK_HISTORY = [
  { date: '2024-05-01', weight: 72.5, sugar: 6.2, bp: '120/80' },
  { date: '2024-05-03', weight: 72.1, sugar: 5.8, bp: '118/78' },
  { date: '2024-05-05', weight: 71.8, sugar: 6.5, bp: '122/82' },
  { date: '2024-05-07', weight: 71.5, sugar: 6.0, bp: '119/79' },
  { date: '2024-05-09', weight: 71.2, sugar: 5.9, bp: '120/80' },
  { date: '2024-05-10', weight: 71.0, sugar: 6.1, bp: '121/81' },
];

import { DashboardLayout } from '../components/layout/DashboardLayout';

export const HealthLog = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'log' | 'history'>('log');

  const today = new Date().toLocaleDateString('bn-BD', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <DashboardLayout 
      title="স্বাস্থ্য লগ" 
      subtitle={today}
    >
      <div className="max-w-5xl mx-auto pb-20">
        {/* Tab Toggle */}
        <div className="flex justify-center mb-10">
          <div className="flex bg-cream-dark/50 p-1 rounded-2xl border border-ink/5 backdrop-blur-sm">
            <button 
              onClick={() => setActiveTab('log')}
              className={`px-8 py-3 rounded-xl font-bn text-sm font-bold transition-all ${
                activeTab === 'log' ? 'bg-ink text-cream shadow-xl' : 'text-ink-muted hover:text-ink'
              }`}
            >
              আজকের লগ
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-8 py-3 rounded-xl font-bn text-sm font-bold transition-all ${
                activeTab === 'history' ? 'bg-ink text-cream shadow-xl' : 'text-ink-muted hover:text-ink'
              }`}
            >
              ইতিহাস
            </button>
          </div>
        </div>

        {activeTab === 'log' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Log Form */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-5 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-ink/5 h-fit"
            >
              <h2 className="font-bn text-xl md:text-2xl font-bold text-ink mb-8 flex items-center gap-3">
                <Plus className="w-6 h-6 text-accent" />
                নতুন এন্ট্রি
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block font-bn text-xs md:text-sm font-bold uppercase tracking-widest text-ink-faint mb-3 px-1">ওজন (কেজি)</label>
                  <div className="relative group">
                    <Weight className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint group-focus-within:text-accent transition-colors" />
                    <input 
                      type="number" 
                      placeholder="যেমন: ৭০.৫"
                      className="w-full bg-cream/50 border-2 border-transparent rounded-2xl py-4 pl-12 pr-4 font-bn focus:bg-white focus:border-accent/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bn text-xs md:text-sm font-bold uppercase tracking-widest text-ink-faint mb-3 px-1">রক্তের শর্করা (mmol/L)</label>
                  <div className="relative group">
                    <Droplets className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent" />
                    <input 
                      type="number" 
                      placeholder="যেমন: ৬.৫"
                      className="w-full bg-cream/50 border-2 border-transparent rounded-2xl py-4 pl-12 pr-4 font-bn focus:bg-white focus:border-accent/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bn text-xs md:text-sm font-bold uppercase tracking-widest text-ink-faint mb-3 px-1">রক্তচাপ (systolic/diastolic)</label>
                  <div className="relative group">
                    <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint group-focus-within:text-accent transition-colors" />
                    <input 
                      type="text" 
                      placeholder="যেমন: ১২০/৮০"
                      className="w-full bg-cream/50 border-2 border-transparent rounded-2xl py-4 pl-12 pr-4 font-bn focus:bg-white focus:border-accent/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <Button variant="primary" className="w-full py-5 text-lg font-bn font-bold shadow-xl shadow-accent/10">
                  এন্ট্রি সংরক্ষণ করুন
                </Button>
              </div>
            </motion.div>

            {/* Trends Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-7 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-ink/5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
                <h2 className="font-bn text-xl md:text-2xl font-bold text-ink flex items-center gap-3">
                  <Activity className="w-6 h-6 text-accent" />
                  ওজন পরিবর্তনের ট্রেন্ড
                </h2>
                <span className="font-bn text-[0.65rem] font-bold uppercase tracking-widest text-ink-faint bg-cream px-4 py-2 rounded-xl self-start sm:self-auto">Last 30 Days</span>
              </div>

              <div className="h-[300px] md:h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MOCK_HISTORY}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F0E8" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9E9890', fontSize: 10, fontFamily: 'Space Grotesk' }}
                      dy={10}
                    />
                    <YAxis 
                      hide
                      domain={['dataMin - 1', 'dataMax + 1']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                        fontFamily: 'Hind Siliguri',
                        padding: '12px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#C8472A" 
                      strokeWidth={4} 
                      dot={{ r: 4, fill: '#C8472A', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { label: 'সর্বনিম্ন', val: '৭১.০', unit: 'কেজি', color: 'text-ink' },
                  { label: 'সর্বোচ্চ', val: '৭২.৫', unit: 'কেজি', color: 'text-ink' },
                  { label: 'পরিবর্তন', val: '-১.৫', unit: 'কেজি', color: 'text-accent' },
                ].map((stat, i) => (
                  <div key={i} className="bg-cream/50 p-4 rounded-2xl text-center border border-ink/5">
                    <div className="text-ink-faint font-bn text-[0.6rem] md:text-[0.65rem] font-bold uppercase tracking-wider mb-1">{stat.label}</div>
                    <div className={`${stat.color} font-bold text-base md:text-xl`}>{stat.val} <span className="text-[0.6rem] md:text-xs opacity-60">{stat.unit}</span></div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          /* History View */
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {[...MOCK_HISTORY].reverse().map((entry, i) => (
              <div 
                key={i}
                className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between border border-ink/5 hover:border-accent/20 transition-all group gap-6"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-cream rounded-2xl flex flex-col items-center justify-center text-ink group-hover:bg-accent group-hover:text-cream transition-all duration-300 transform group-hover:rotate-3 shadow-sm">
                    <span className="text-[0.6rem] uppercase font-body font-black opacity-40">MAY</span>
                    <span className="text-xl md:text-2xl font-black leading-none">{entry.date.split('-')[2]}</span>
                  </div>
                  <div>
                    <div className="font-bn font-bold text-base md:text-lg text-ink">সাপ্তাহিক স্বাস্থ্য পরীক্ষা</div>
                    <div className="font-bn text-xs md:text-sm text-ink-faint">সকাল ৯:৩০ এ লগ করা হয়েছে</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 md:gap-10 border-t md:border-t-0 pt-4 md:pt-0 border-ink/5">
                  <div className="text-center">
                    <div className="text-[0.6rem] md:text-xs text-ink-faint font-bn font-bold uppercase tracking-wider mb-1">ওজন</div>
                    <div className="font-bold text-ink text-sm md:text-base">{entry.weight} kg</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[0.6rem] md:text-xs text-ink-faint font-bn font-bold uppercase tracking-wider mb-1">শর্করা</div>
                    <div className="font-bold text-accent text-sm md:text-base">{entry.sugar}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[0.6rem] md:text-xs text-ink-faint font-bn font-bold uppercase tracking-wider mb-1">রক্তচাপ</div>
                    <div className="font-bold text-ink text-sm md:text-base">{entry.bp}</div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};
