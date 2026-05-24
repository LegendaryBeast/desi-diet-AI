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
            className="p-1.5 bg-cream rounded-lg text-ink-muted hover:bg-accent hover:text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        ) : undefined
      }
    >
      <div className="max-w-3xl w-full mx-auto pb-6 space-y-4">

        {/* ── Weight Input + Period Selector ── */}
        {!generated && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-ink/5 shadow-sm p-3.5 space-y-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h2 className="font-display font-black text-sm text-ink leading-none">স্বাস্থ্য রিপোর্ট তৈরি করুন</h2>
                <p className="text-[0.62rem] text-ink-faint font-bn mt-1">আপনার পুষ্টি ও ক্যালোরি গ্রহণের বিস্তারিত বিশ্লেষণ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Period tabs */}
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-ink-faint mb-1.5 font-body">রিপোর্টের সময়কাল</p>
                <div className="flex gap-1.5">
                  {([3, 7, 10] as Period[]).map(p => (
                    <button key={p} onClick={() => setPeriod(p)}
                      className={`flex-1 py-1.5 rounded-lg font-display font-bold text-xs transition-all ${
                        period === p ? 'bg-ink text-cream shadow-sm' : 'bg-cream text-ink hover:bg-ink/5'
                      }`}
                    >
                      {PERIOD_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight input */}
              <div>
                <label className="block text-[0.62rem] font-bold uppercase tracking-wider text-ink-faint mb-1.5 font-body">
                  আজকের ওজন (কেজি) <span className="text-accent">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Scale className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
                    <input
                      type="number"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      placeholder="যেমন: ৬৮.৫"
                      min={20} max={300} step={0.1}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-cream/40 border border-ink/10 focus:border-accent/30 rounded-lg font-display font-bold text-xs outline-none transition-all"
                    />
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !weight}
                    className="px-3.5 py-1.5 bg-accent text-white rounded-lg font-display font-bold text-xs flex items-center gap-1 hover:opacity-90 transition-all disabled:opacity-50 shrink-0"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                    রিপোর্ট তৈরি করুন
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 font-bn flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </motion.div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
            <p className="font-bn text-xs text-ink-muted text-center">
              আপনার স্বাস্থ্য ডেটা বিশ্লেষণ করা হচ্ছে...<br />
              <span className="text-[0.62rem] opacity-60">গত {period} দিনের মিল প্ল্যান ও ওজন তথ্য প্রসেস করছে</span>
            </p>
          </div>
        )}

        {/* ── Report ── */}
        {report && !loading && (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

              {/* Summary Hero */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-ink text-cream p-3.5 rounded-xl relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-5">
                  <BarChart2 className="w-40 h-40 absolute -right-5 -top-5" />
                </div>
                <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Calendar, label: 'বিশ্লেষিত দিন', val: `${report.days_with_data}/${report.period_days}`, unit: 'দিন', color: 'text-accent' },
                    { icon: Flame, label: 'গড় ক্যালোরি/দিন', val: report.avg_daily_calories.toLocaleString(), unit: 'kcal', color: 'text-amber-400' },
                    { icon: Target, label: 'লক্ষ্য ক্যালোরি', val: report.target_calories.toLocaleString(), unit: 'kcal/দিন', color: 'text-blue-400' },
                    { icon: CheckCircle2, label: 'অনুসরণ হার', val: `${report.adherence_pct}%`, unit: 'adherence', color: 'text-green-400' },
                  ].map((item, i) => (
                    <div key={i} className="font-bn">
                      <div className="flex items-center gap-1.5 opacity-60 mb-0.5">
                        <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                        <span className="text-[0.58rem] font-bold uppercase tracking-wider">{item.label}</span>
                      </div>
                      <div className="font-display text-xl font-black leading-none mt-1">{item.val}</div>
                      <div className={`text-[0.58rem] ${item.color} font-bold mt-0.5`}>{item.unit}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Side-by-side Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ── Calorie Intake Per Day Chart ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="bg-white p-3 rounded-xl border border-ink/5 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-3.5 bg-accent rounded-full" />
                    <h2 className="font-bn font-bold text-xs text-ink">ক্যালোরি গ্রহণ (প্রতিদিন)</h2>
                  </div>
                  {report.calorie_history.length > 0 ? (
                    <ResponsiveContainer width="100%" height={150}>
                      <AreaChart data={report.calorie_history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e05a1c" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#e05a1c" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ece8" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: 'none', fontSize: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          formatter={(val: number) => [`${val} kcal`, 'ক্যালোরি']}
                        />
                        <ReferenceLine y={report.target_calories} stroke="#3b82f6" strokeDasharray="4 4" />
                        <Area type="monotone" dataKey="calories_consumed" stroke="#e05a1c" strokeWidth={2}
                          fill="url(#calGrad)" dot={{ r: 2.5, fill: '#e05a1c' }} activeDot={{ r: 4 }} name="calories" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[150px] flex items-center justify-center">
                      <p className="font-bn text-ink-faint text-[0.68rem]">কোনো মিল প্ল্যান সম্পন্ন করা হয়নি</p>
                    </div>
                  )}
                </motion.div>

                {/* ── Weight Curve Chart ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="bg-white p-3 rounded-xl border border-ink/5 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-3.5 bg-blue-500 rounded-full" />
                    <h2 className="font-bn font-bold text-xs text-ink">ওজনের পরিবর্তন</h2>
                  </div>
                  {report.weight_history.length > 1 ? (
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={report.weight_history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ece8" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}kg`} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: 'none', fontSize: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          formatter={(val: number) => [`${val} kg`, 'ওজন']}
                        />
                        <Line type="monotone" dataKey="weight_kg" stroke="#3b82f6" strokeWidth={2}
                          dot={{ r: 3, fill: '#3b82f6', stroke: 'white', strokeWidth: 1 }} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[150px] flex flex-col items-center justify-center gap-1 text-center">
                      <TrendingUp className="w-6 h-6 text-ink/10" />
                      <p className="font-bn text-ink-faint text-[0.68rem]">
                        ওজন লগ করুন পরিবর্তন দেখতে<br />
                        <span className="opacity-60 text-[0.62rem]">আজ: {report.current_weight_kg} কেজি</span>
                      </p>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* ── Macro Row: Pie + Bar ── */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* Pie Chart */}
                <div className="bg-white p-3 rounded-xl border border-ink/5 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-3.5 bg-amber-500 rounded-full" />
                    <h2 className="font-bn font-bold text-xs text-ink">ম্যাক্রো বিভাজন</h2>
                  </div>
                  {report.pie_data.length > 0 ? (
                    <>
                      <div className="h-[120px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={report.pie_data} cx="50%" cy="50%" outerRadius={50}
                              dataKey="value" labelLine={false} label={renderCustomLabel}>
                              {report.pie_data.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: 8, border: 'none', fontSize: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                              formatter={(val: number, _: string, props: any) => [
                                `${val}% (${props.payload.grams}g)`,
                                props.payload.name
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-3 flex-wrap mt-1">
                        {report.pie_data.map((d, i) => (
                          <div key={i} className="flex items-center gap-1 text-[0.62rem] font-bn">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                            <span className="font-bold text-ink">{d.name}</span>
                            <span className="text-ink-faint">{d.grams}g</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-[140px] flex items-center justify-center">
                      <p className="font-bn text-ink-faint text-[0.68rem]">পর্যাপ্ত ডেটা নেই</p>
                    </div>
                  )}
                </div>

                {/* Macro vs Target Bar */}
                <div className="bg-white p-3 rounded-xl border border-ink/5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-3.5 bg-green-500 rounded-full" />
                    <h2 className="font-bn font-bold text-xs text-ink">ম্যাক্রো গ্রহণ বনাম লক্ষ্য</h2>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: 'প্রোটিন', consumed: report.macro_summary.protein_g, target: report.macro_summary.target_protein_g, color: 'bg-emerald-500', unit: 'g' },
                      { label: 'শর্করা', consumed: report.macro_summary.carbs_g, target: report.macro_summary.target_carbs_g, color: 'bg-blue-500', unit: 'g' },
                      { label: 'চর্বি', consumed: report.macro_summary.fat_g, target: report.macro_summary.target_fat_g, color: 'bg-amber-500', unit: 'g' },
                      { label: 'ফাইবার', consumed: report.macro_summary.fiber_g, target: report.period_days * 30, color: 'bg-green-500', unit: 'g' },
                    ].map((m, i) => {
                      const pct = m.target > 0 ? Math.min(100, Math.round((m.consumed / m.target) * 100)) : 0;
                      return (
                        <div key={i} className="font-bn">
                          <div className="flex justify-between text-[0.68rem] mb-0.5">
                            <span className="font-bold text-ink">{m.label}</span>
                            <span className="text-ink-faint">{m.consumed.toFixed(0)}{m.unit} / {m.target.toFixed(0)}{m.unit} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-cream rounded-full overflow-hidden">
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
                  { id: 'v', label: 'ভিটামিন', items: vitamins, color: 'bg-amber-500' },
                  { id: 'm', label: 'খনিজ', items: minerals, color: 'bg-blue-500' },
                  { id: 'f', label: 'ফ্যাটি অ্যাসিড', items: fatty, color: 'bg-green-500' },
                ];
                return (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="bg-white p-3 rounded-xl border border-ink/5 shadow-sm space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-3.5 bg-purple-500 rounded-full" />
                      <h2 className="font-bn font-bold text-xs text-ink">মাইক্রোনিউট্রিয়েন্ট ট্র্যাকার</h2>
                    </div>
                    {groups.map(g => g.items.length > 0 && (
                      <div key={g.id} className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${g.color}`} />
                          <h3 className="font-bn font-bold text-[0.68rem] text-ink">{g.label}</h3>
                          <div className="flex-1 h-px bg-ink/5" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {g.items.map((nut, i) => {
                            let barColor = g.color;
                            if (nut.percentage >= 100) barColor = 'bg-green-500';
                            else if (nut.percentage >= 50) barColor = 'bg-amber-500';
                            return (
                              <div key={i} className="bg-cream/30 p-2 rounded-lg border border-ink/5 space-y-1.5 flex flex-col justify-between">
                                <div className="flex justify-between items-start gap-1">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bn font-bold text-[0.62rem] text-ink leading-tight truncate">{nut.name_bn}</p>
                                    <p className="text-[0.52rem] text-ink-faint uppercase truncate leading-none mt-0.5">{nut.name}</p>
                                  </div>
                                  <span className={`text-[0.58rem] font-bold shrink-0 px-1 rounded ${
                                    nut.percentage >= 100 ? 'text-green-700 bg-green-50' : nut.percentage >= 50 ? 'text-amber-700 bg-amber-50' : 'text-ink-muted bg-cream'
                                  }`}>{nut.percentage}%</span>
                                </div>
                                <div className="space-y-1">
                                  <div className="h-1 bg-cream rounded-full overflow-hidden">
                                    <div className={`h-full ${barColor} transition-all duration-700 rounded-full`}
                                      style={{ width: `${Math.min(100, nut.percentage)}%` }} />
                                  </div>
                                  <div className="flex justify-between text-[0.52rem] font-bn text-ink-faint leading-none">
                                    <span>{nut.consumed} {nut.unit}</span>
                                    <span>{nut.target} {nut.unit}</span>
                                  </div>
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
              <div className="flex justify-center pt-1">
                <button onClick={() => { setGenerated(false); setReport(null); }}
                  className="flex items-center gap-1.5 px-4 py-2 border border-ink/10 rounded-lg font-bn text-xs text-ink-muted hover:border-accent/30 hover:text-accent transition-all"
                >
                  <RefreshCw className="w-3 h-3" /> নতুন রিপোর্ট তৈরি করুন
                </button>
              </div>

            </motion.div>
          </AnimatePresence>
        )}

      </div>
    </DashboardLayout>
  );
};
