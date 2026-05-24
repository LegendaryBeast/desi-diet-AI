import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  Calendar,
  Activity,
  Droplets,
  Weight,
  Plus,
  History,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { healthLogApi, type HealthLogResponse, type HealthTrendsResponse } from '../lib/api';

export const HealthLog = () => {
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'trends'>('log');
  const [logs, setLogs] = useState<HealthLogResponse[]>([]);
  const [trends, setTrends] = useState<HealthTrendsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [weightKg, setWeightKg] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [notes, setNotes] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await healthLogApi.list(30);
      setLogs(data);
    } catch {
      setError('লগ লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await healthLogApi.trends();
      setTrends(data);
    } catch {
      setError('ট্রেন্ড লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') fetchLogs();
    else if (activeTab === 'trends') fetchTrends();
  }, [activeTab, fetchLogs, fetchTrends]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await healthLogApi.create({
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
        blood_sugar: bloodSugar ? parseFloat(bloodSugar) : undefined,
        blood_pressure: bloodPressure || undefined,
        hba1c: hba1c ? parseFloat(hba1c) : undefined,
        notes: notes || undefined,
      });
      setSuccess('স্বাস্থ্য লগ সংরক্ষণ হয়েছে!');
      setWeightKg('');
      setBloodSugar('');
      setBloodPressure('');
      setHba1c('');
      setNotes('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setSaveLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('bn-BD', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Prepare chart data from trends
  const weightChartData = (trends?.weight_trend?.history || []).map(([date, val]) => ({
    date: new Date(date).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' }),
    weight: val,
  }));

  const sugarChartData = (trends?.blood_sugar_trend?.history || []).map(([date, val]) => ({
    date: new Date(date).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' }),
    sugar: val,
  }));

  return (
    <DashboardLayout title="স্বাস্থ্য লগ" subtitle={today}>
      <div className="max-w-3xl w-full mx-auto pb-6">
        {/* Tab Toggle */}
        <div className="flex justify-center mb-4">
          <div className="flex bg-white p-1 rounded-xl border border-ink/5 shadow-sm gap-0.5">
            {[
              { id: 'log' as const, label: 'আজকের লগ', icon: Plus },
              { id: 'history' as const, label: 'ইতিহাস', icon: History },
              { id: 'trends' as const, label: 'ট্রেন্ড', icon: Activity },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bn text-xs font-bold transition-all ${
                  activeTab === id ? 'bg-ink text-cream shadow-xl' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-500 font-bn text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl text-green-600 font-bn text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'log' && (
            <motion.div key="log" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4"
            >
              {/* Log Form */}
              <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-ink/5 h-fit">
                <h2 className="font-bn text-sm font-bold text-ink mb-4 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-accent" />
                  নতুন স্বাস্থ্য এন্ট্রি
                </h2>

                <form onSubmit={handleSave} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bn text-[0.62rem] font-bold uppercase tracking-wider text-ink-faint mb-1">ওজন (কেজি)</label>
                      <input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)}
                        placeholder="যেমন: ৭০.৫"
                        className="w-full bg-cream/40 border border-ink/10 rounded-lg py-1.5 px-2.5 font-bn text-xs focus:bg-white focus:border-accent/30 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block font-bn text-[0.62rem] font-bold uppercase tracking-wider text-ink-faint mb-1">শর্করা (mmol/L)</label>
                      <input type="number" step="0.1" value={bloodSugar} onChange={(e) => setBloodSugar(e.target.value)}
                        placeholder="যেমন: ৬.৫"
                        className="w-full bg-cream/40 border border-ink/10 rounded-lg py-1.5 px-2.5 font-bn text-xs focus:bg-white focus:border-accent/30 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bn text-[0.62rem] font-bold uppercase tracking-wider text-ink-faint mb-1">রক্তচাপ (BP)</label>
                      <input type="text" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)}
                        placeholder="যেমন: ১২০/৮০"
                        className="w-full bg-cream/40 border border-ink/10 rounded-lg py-1.5 px-2.5 font-bn text-xs focus:bg-white focus:border-accent/30 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block font-bn text-[0.62rem] font-bold uppercase tracking-wider text-ink-faint mb-1">HbA1c (%)</label>
                      <input type="number" step="0.1" value={hba1c} onChange={(e) => setHba1c(e.target.value)}
                        placeholder="যেমন: ৭.২"
                        className="w-full bg-cream/40 border border-ink/10 rounded-lg py-1.5 px-2.5 font-bn text-xs focus:bg-white focus:border-accent/30 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bn text-[0.62rem] font-bold uppercase tracking-wider text-ink-faint mb-1">নোট</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="আজ কেমন অনুভব করছেন..."
                      rows={2}
                      className="w-full bg-cream/40 border border-ink/10 rounded-lg py-1.5 px-2.5 font-bn text-xs focus:bg-white focus:border-accent/30 outline-none transition-all resize-none"
                    />
                  </div>

                  <button type="submit" disabled={saveLoading}
                    className="w-full py-2 bg-ink text-cream rounded-lg font-bold font-bn text-xs flex items-center justify-center gap-1.5 hover:bg-accent transition-all shadow-sm disabled:opacity-60"
                  >
                    {saveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'এন্ট্রি সংরক্ষণ করুন'}
                  </button>
                </form>
              </div>

              {/* Quick Stats / Guide */}
              <div className="lg:col-span-7 space-y-3">
                <div className="bg-white p-4 rounded-xl border border-ink/5">
                  <h3 className="font-bn text-xs font-bold text-ink mb-3 flex items-center gap-1">
                    <span className="w-1 h-3 bg-accent rounded-full inline-block" />
                    স্বাস্থ্য ও ডায়াবেটিস নির্দেশিকা
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      {
                        label: 'রক্তে শর্করা',
                        val: '৪.০ - ৭.৮ mmol/L',
                        bg: 'bg-emerald-50/50',
                        border: 'border-emerald-100',
                        labelColor: 'text-emerald-700',
                        valColor: 'text-emerald-900',
                      },
                      {
                        label: 'রক্তচাপ',
                        val: '< ১২০/৮০ mmHg',
                        bg: 'bg-blue-50/50',
                        border: 'border-blue-100',
                        labelColor: 'text-blue-700',
                        valColor: 'text-blue-900',
                      },
                      {
                        label: 'HbA1c লক্ষ্য',
                        val: '< ৭% (ডায়াবেটিস)',
                        bg: 'bg-amber-50/50',
                        border: 'border-amber-100',
                        labelColor: 'text-amber-700',
                        valColor: 'text-amber-900',
                      },
                      {
                        label: 'BMI লক্ষ্যমাত্রা',
                        val: '১৮.৫ - ২৩.০ IBW',
                        bg: 'bg-purple-50/50',
                        border: 'border-purple-100',
                        labelColor: 'text-purple-700',
                        valColor: 'text-purple-900',
                      },
                    ].map((item, i) => (
                      <div key={i} className={`p-2.5 rounded-lg border ${item.bg} ${item.border}`}>
                        <p className={`text-[0.55rem] font-bold uppercase tracking-wider mb-0.5 ${item.labelColor}`}>{item.label}</p>
                        <p className={`font-black text-xs ${item.valColor}`}>{item.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 font-bn text-ink-muted">
                  <History className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">কোনো লগ পাওয়া যায়নি। প্রথমে একটি এন্ট্রি যোগ করুন।</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((entry) => (
                    <div key={entry.log_id} className="bg-white p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between border border-ink/5 hover:border-accent/15 transition-all gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cream rounded-lg flex flex-col items-center justify-center text-ink shrink-0 border border-ink/5">
                          <span className="text-[0.5rem] uppercase font-body font-bold opacity-50">
                            {new Date(entry.log_date).toLocaleDateString('en', { month: 'short' })}
                          </span>
                          <span className="text-sm font-bold leading-none">{new Date(entry.log_date).getDate()}</span>
                        </div>
                        <div>
                          <div className="font-bn font-bold text-xs text-ink">স্বাস্থ্য এন্ট্রি</div>
                          <div className="font-bn text-[0.62rem] text-ink-faint">
                            {new Date(entry.created_at).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })} এ লগ করা হয়েছে
                          </div>
                          {entry.notes && <div className="font-bn text-[0.68rem] text-ink-muted mt-0.5 italic">"{entry.notes}"</div>}
                        </div>
                      </div>

                      <div className="flex gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-ink/5 font-bn">
                        {entry.weight_kg && (
                          <div>
                            <div className="text-[0.55rem] text-ink-faint font-bold uppercase tracking-wider">ওজন</div>
                            <div className="font-bold text-ink text-xs">{entry.weight_kg} kg</div>
                          </div>
                        )}
                        {entry.blood_sugar && (
                          <div>
                            <div className="text-[0.55rem] text-ink-faint font-bold uppercase tracking-wider">শর্করা</div>
                            <div className={`font-bold text-xs ${entry.blood_sugar > 7.8 ? 'text-red-500' : 'text-green-600'}`}>
                              {entry.blood_sugar} mmol
                            </div>
                          </div>
                        )}
                        {entry.blood_pressure && (
                          <div>
                            <div className="text-[0.55rem] text-ink-faint font-bold uppercase tracking-wider">BP</div>
                            <div className="font-bold text-ink text-xs">{entry.blood_pressure}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'trends' && (
            <motion.div key="trends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Weight Trend */}
                  <div className="bg-white p-4 rounded-xl border border-ink/5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-bn text-xs font-bold text-ink flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-accent" />
                        ওজন পরিবর্তনের ট্রেন্ড
                      </h2>
                      {trends?.weight_trend?.change_kg != null && (
                        <div className={`flex items-center gap-1 text-[0.62rem] font-bold px-2 py-0.5 rounded ${
                          trends.weight_trend.change_kg < 0
                            ? 'bg-green-50 text-green-600'
                            : 'bg-red-50 text-red-500'
                        }`}>
                          {trends.weight_trend.change_kg < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                          {trends.weight_trend.change_kg > 0 ? '+' : ''}{trends.weight_trend.change_kg} kg
                        </div>
                      )}
                    </div>

                    {weightChartData.length > 0 ? (
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={weightChartData}>
                            <defs>
                              <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#C8472A" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#C8472A" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F0E8" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9E9890', fontSize: 8 }} dy={5} />
                            <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                            <Area type="monotone" dataKey="weight" stroke="#C8472A" strokeWidth={2} fill="url(#wGrad)" dot={{ r: 3, fill: '#C8472A', strokeWidth: 1, stroke: '#fff' }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[150px] flex items-center justify-center text-ink-muted font-bn text-xs">
                        পর্যাপ্ত ডেটা নেই
                      </div>
                    )}
                  </div>

                  {/* Blood Sugar Trend */}
                  <div className="bg-white p-4 rounded-xl border border-ink/5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-bn text-xs font-bold text-ink flex items-center gap-1.5">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        রক্তের শর্করার ট্রেন্ড
                      </h2>
                    </div>

                    {sugarChartData.length > 0 ? (
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sugarChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F0E8" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9E9890', fontSize: 8 }} dy={5} />
                            <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                            <Line type="monotone" dataKey="sugar" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6', strokeWidth: 1, stroke: '#fff' }} activeDot={{ r: 4, strokeWidth: 0 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[150px] flex items-center justify-center text-ink-muted font-bn text-xs">
                        পর্যাপ্ত ডেটা নেই
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};
