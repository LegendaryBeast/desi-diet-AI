import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ReferenceLine
} from 'recharts';
import {
  BarChart2, Flame, Zap, Droplet, Wind, AlertCircle,
  RefreshCw, Scale, Activity, TrendingUp, Target,
  CheckCircle2, ChevronRight, Loader2, Calendar,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { reportsApi, type HealthSummaryReport } from '../lib/api';

type Period = 3 | 7 | 10;

const PERIOD_LABELS: Record<Period, string> = {
  3: 'শেষ ৩ দিন',
  7: 'শেষ ৭ দিন',
  10: 'শেষ ১০ দিন',
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return percent > 0.05 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

export const ReportPage = () => {
  const [period, setPeriod] = useState<Period>(7);
  const [weight, setWeight] = useState('');
  const [report, setReport] = useState<HealthSummaryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = useCallback(async () => {
    const wKg = parseFloat(weight);
    if (!weight || isNaN(wKg) || wKg < 20 || wKg > 300) {
      setError('অনুগ্রহ করে সঠিক ওজন দিন (২০–৩০০ কেজি)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.healthSummary(period, wKg);
      setReport(data);
      setGenerated(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'রিপোর্ট তৈরিতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, [period, weight]);

  return (
    <DashboardLayout
      title="স্বাস্থ্য রিপোর্ট"
      subtitle="Health Report"
      headerActions={
        generated ? (
          <button onClick={() => { setGenerated(false); setReport(null); }}
            className="p-2.5 bg-cream rounded-2xl text-ink-muted hover:bg-accent hover:text-white transition-all"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        ) : undefined
      }
    >
      <div className="max-w-5xl mx-auto pb-24 space-y-6">

        {/* ── Weight Input + Period Selector ── */}
        {!generated && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] border border-ink/5 shadow-sm p-8 space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="font-display font-black text-lg text-ink">স্বাস্থ্য রিপোর্ট তৈরি করুন</h2>
                <p className="text-xs text-ink-faint font-bn">আপনার পুষ্টি ও ক্যালোরি গ্রহণের বিস্তারিত বিশ্লেষণ</p>
              </div>
            </div>

            {/* Period tabs */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-3 font-body">রিপোর্টের সময়কাল</p>
              <div className="flex gap-2">
                {([3, 7, 10] as Period[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`flex-1 py-3 rounded-2xl font-display font-black text-sm transition-all ${
                      period === p ? 'bg-ink text-cream shadow-lg' : 'bg-cream text-ink hover:bg-ink/5'
                    }`}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-faint mb-2 font-body">
                আজকের ওজন (কেজি) <span className="text-accent">*</span>
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" />
                  <input
                    type="number"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    placeholder="যেমন: ৬৮.৫"
                    min={20} max={300} step={0.1}
                    className="w-full pl-12 pr-4 py-4 bg-cream/50 border-2 border-transparent focus:border-accent/30 rounded-2xl font-display font-bold text-lg outline-none transition-all"
                  />
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={loading || !weight}
                  className="px-8 py-4 bg-accent text-white rounded-2xl font-display font-black flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shrink-0"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                  রিপোর্ট তৈরি করুন
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-500 font-bn flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative w-16 h-16">
              <Loader2 className="w-16 h-16 animate-spin text-accent/20 absolute" />
              <Loader2 className="w-16 h-16 animate-spin text-accent absolute" style={{ animationDuration: '0.8s' }} />
            </div>
            <p className="font-bn text-ink-muted text-center">
              আপনার স্বাস্থ্য ডেটা বিশ্লেষণ করা হচ্ছে...<br />
              <span className="text-xs opacity-60">গত {period} দিনের মিল প্ল্যান ও ওজন তথ্য প্রসেস করছে</span>
            </p>
          </div>
        )}

        {/* ── Report ── */}
        {report && !loading && (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

              {/* Summary Hero */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-ink text-cream p-8 rounded-[2.5rem] relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-5">
                  <BarChart2 className="w-80 h-80 absolute -right-10 -top-10" />
                </div>
                <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { icon: Calendar, label: 'বিশ্লেষিত দিন', val: `${report.days_with_data}/${report.period_days}`, unit: 'দিন', color: 'text-accent' },
                    { icon: Flame, label: 'গড় ক্যালোরি/দিন', val: report.avg_daily_calories.toLocaleString(), unit: 'kcal', color: 'text-amber-400' },
                    { icon: Target, label: 'লক্ষ্য', val: report.target_calories.toLocaleString(), unit: 'kcal/দিন', color: 'text-blue-400' },
                    { icon: CheckCircle2, label: 'অনুসরণ', val: `${report.adherence_pct}%`, unit: 'adherence', color: 'text-green-400' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 opacity-50 mb-1">
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                        <span className="text-[0.65rem] font-bold uppercase tracking-wider font-bn">{item.label}</span>
                      </div>
                      <div className="font-display text-3xl font-black">{item.val}</div>
                      <div className={`text-xs ${item.color} font-bold mt-0.5`}>{item.unit}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* ── Ogive Chart 1: Calorie Intake Per Day ── */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-ink/5 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-5 bg-accent rounded-full" />
                  <h2 className="font-display font-black text-lg text-ink">ক্যালোরি গ্রহণ — প্রতিদিন</h2>
                </div>
                {report.calorie_history.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={report.calorie_history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e05a1c" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#e05a1c" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ece8" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fontFamily: 'sans-serif' }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        formatter={(val: number, name: string) => [
                          `${val} kcal`,
                          name === 'calories_consumed' ? 'গ্রহণ করা' : 'লক্ষ্য'
                        ]}
                        labelStyle={{ fontWeight: 'bold' }}
                      />
                      <ReferenceLine y={report.target_calories} stroke="#3b82f6" strokeDasharray="4 4"
                        label={{ value: 'লক্ষ্য', position: 'insideTopRight', fontSize: 11, fill: '#3b82f6' }} />
                      <Area type="monotone" dataKey="calories_consumed" stroke="#e05a1c" strokeWidth={2.5}
                        fill="url(#calGrad)" dot={{ r: 4, fill: '#e05a1c' }} activeDot={{ r: 6 }} name="calories_consumed" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center">
                    <p className="font-bn text-ink-faint text-sm">এই সময়কালে কোনো মিল প্ল্যান সম্পন্ন করা হয়নি</p>
                  </div>
                )}
              </motion.div>

              {/* ── Ogive Chart 2: Weight Curve ── */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-ink/5 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
                  <h2 className="font-display font-black text-lg text-ink">ওজনের পরিবর্তন</h2>
                </div>
                {report.weight_history.length > 1 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={report.weight_history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ece8" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${v}kg`} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        formatter={(val: number) => [`${val} kg`, 'ওজন']}
                        labelStyle={{ fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="weight_kg" stroke="#3b82f6" strokeWidth={2.5}
                        dot={{ r: 5, fill: '#3b82f6', stroke: 'white', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex flex-col items-center justify-center gap-2">
                    <TrendingUp className="w-10 h-10 text-ink/10" />
                    <p className="font-bn text-ink-faint text-sm text-center">
                      ওজনের পরিবর্তন দেখতে আরও কয়েকদিন ওজন লগ করুন<br />
                      <span className="text-xs opacity-60">আজ লগ করা হয়েছে: {report.current_weight_kg} কেজি</span>
                    </p>
                  </div>
                )}
              </motion.div>

              {/* ── Macro Row: Pie + Bar ── */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Pie Chart */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-ink/5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1.5 h-5 bg-amber-500 rounded-full" />
                    <h2 className="font-display font-black text-base text-ink">ম্যাক্রো বিভাজন</h2>
                  </div>
                  {report.pie_data.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={report.pie_data} cx="50%" cy="50%" outerRadius={80}
                            dataKey="value" labelLine={false} label={renderCustomLabel}>
                            {report.pie_data.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                            formatter={(val: number, _: string, props: any) => [
                              `${val}% (${props.payload.grams}g)`,
                              props.payload.name
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center gap-4 flex-wrap mt-2">
                        {report.pie_data.map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                            <span className="text-xs font-bn font-bold text-ink">{d.name}</span>
                            <span className="text-xs text-ink-faint">{d.grams}g</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center">
                      <p className="font-bn text-ink-faint text-sm">পর্যাপ্ত ডেটা নেই</p>
                    </div>
                  )}
                </div>

                {/* Macro vs Target Bar */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-ink/5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1.5 h-5 bg-green-500 rounded-full" />
                    <h2 className="font-display font-black text-base text-ink">ম্যাক্রো গ্রহণ বনাম লক্ষ্য</h2>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'প্রোটিন', consumed: report.macro_summary.protein_g, target: report.macro_summary.target_protein_g, color: 'bg-amber-400', unit: 'g' },
                      { label: 'শর্করা', consumed: report.macro_summary.carbs_g, target: report.macro_summary.target_carbs_g, color: 'bg-red-400', unit: 'g' },
                      { label: 'চর্বি', consumed: report.macro_summary.fat_g, target: report.macro_summary.target_fat_g, color: 'bg-blue-400', unit: 'g' },
                      { label: 'ফাইবার', consumed: report.macro_summary.fiber_g, target: report.period_days * 30, color: 'bg-green-400', unit: 'g' },
                    ].map((m, i) => {
                      const pct = m.target > 0 ? Math.min(100, Math.round((m.consumed / m.target) * 100)) : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-xs font-bn mb-1">
                            <span className="font-bold text-ink">{m.label}</span>
                            <span className="text-ink-faint">{m.consumed.toFixed(0)}{m.unit} / {m.target.toFixed(0)}{m.unit} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-cream rounded-full overflow-hidden">
                            <div className={`h-full ${m.color} rounded-full transition-all duration-700`}
                              style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              {/* ── Micronutrient Progress ── */}
              {report.micronutrient_targets.length > 0 && (() => {
                const VITAMIN_NAMES = [
                  "Vitamin A", "Ascorbic acids (C)", "Vitamin D", "Vitamin E", "Vitamin K",
                  "Thiamine (B1)", "Riboflavin (B2)", "Niacin (B3)", "Total B6", "Folate (total)",
                  "Pantothenic acid (B5)", "Biotin (B7)"
                ];
                const EXCLUDE_NAMES = ["Choline", "Vitamin B12", "Chloride (Cl)", "Iodine (I)"];
                const FATTY_NAMES = ["Cis ω-6 Fatty acids", "Cis ω-3 Fatty acids"];
                const all = report.micronutrient_targets;
                const vitamins = all.filter(n => VITAMIN_NAMES.includes(n.name));
                const minerals = all.filter(n => !VITAMIN_NAMES.includes(n.name) && !FATTY_NAMES.includes(n.name) && !EXCLUDE_NAMES.includes(n.name));
                const fatty = all.filter(n => FATTY_NAMES.includes(n.name));
                const groups = [
                  { id: 'v', label: 'ভিটামিন', items: vitamins, color: 'bg-amber-500', light: 'bg-amber-50' },
                  { id: 'm', label: 'খনিজ', items: minerals, color: 'bg-blue-500', light: 'bg-blue-50' },
                  { id: 'f', label: 'ফ্যাটি অ্যাসিড', items: fatty, color: 'bg-green-500', light: 'bg-green-50' },
                ];
                return (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-ink/5 shadow-sm space-y-5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-5 bg-purple-500 rounded-full" />
                      <h2 className="font-display font-black text-lg text-ink">মাইক্রোনিউট্রিয়েন্ট ট্র্যাকার</h2>
                    </div>
                    {groups.map(g => g.items.length > 0 && (
                      <div key={g.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${g.color}`} />
                          <h3 className="font-display font-black text-sm text-ink">{g.label}</h3>
                          <div className="flex-1 h-px bg-ink/5" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                          {g.items.map((nut, i) => {
                            let barColor = g.color;
                            if (nut.percentage >= 100) barColor = 'bg-green-500';
                            else if (nut.percentage >= 50) barColor = 'bg-amber-500';
                            return (
                              <div key={i} className="bg-cream/50 p-3 rounded-2xl border border-ink/5 space-y-2">
                                <div className="flex justify-between items-start gap-1">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bn font-bold text-xs text-ink leading-tight truncate">{nut.name_bn}</p>
                                    <p className="text-[0.6rem] text-ink-faint uppercase truncate">{nut.name}</p>
                                  </div>
                                  <span className={`text-xs font-black shrink-0 px-1.5 py-0.5 rounded-lg ${
                                    nut.percentage >= 100 ? 'text-green-700 bg-green-50' : nut.percentage >= 50 ? 'text-amber-700 bg-amber-50' : 'text-ink-muted bg-cream'
                                  }`}>{nut.percentage}%</span>
                                </div>
                                <div className="h-1.5 bg-cream rounded-full overflow-hidden border border-ink/5">
                                  <div className={`h-full ${barColor} transition-all duration-700 rounded-full`}
                                    style={{ width: `${Math.min(100, nut.percentage)}%` }} />
                                </div>
                                <div className="flex justify-between text-[0.6rem] font-bn text-ink-faint">
                                  <span>{nut.consumed} {nut.unit}</span>
                                  <span>{nut.target} {nut.unit}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                );
              })()}

              {/* Regenerate button */}
              <div className="flex justify-center pt-2">
                <button onClick={() => { setGenerated(false); setReport(null); }}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-ink/10 rounded-2xl font-bn text-sm text-ink-muted hover:border-accent/30 hover:text-accent transition-all"
                >
                  <RefreshCw className="w-4 h-4" /> নতুন রিপোর্ট তৈরি করুন
                </button>
              </div>

            </motion.div>
          </AnimatePresence>
        )}

      </div>
    </DashboardLayout>
  );
};
