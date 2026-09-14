import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Plus, Save, Scale, Droplets, Heart, ClipboardList,
  TrendingUp, TrendingDown, Minus, ChevronUp, Loader2, AlertCircle, CheckCircle2, X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { healthLogApi, type HealthLogResponse, type HealthTrendsResponse } from '../lib/api';

const SYMPTOM_OPTIONS = [
  { bn: 'মাথাব্যথা', en: 'Headache' },
  { bn: 'ক্লান্তি', en: 'Fatigue' },
  { bn: 'বমি ভাব', en: 'Nausea' },
  { bn: 'মাথা ঘোরা', en: 'Dizziness' },
  { bn: 'বুক ব্যথা', en: 'Chest Pain' },
  { bn: 'শ্বাস কষ্ট', en: 'Shortness of Breath' },
  { bn: 'ঘাম', en: 'Excessive Sweating' },
  { bn: 'অস্থিরতা', en: 'Restlessness' },
  { bn: 'দুর্বলতা', en: 'Weakness' },
  { bn: 'ক্ষুধামন্দা', en: 'Loss of Appetite' },
];

export const HealthLog = () => {
  const { i18n } = useTranslation();
  const isBn = i18n.language === 'bn';

  const [showForm, setShowForm] = useState(false);
  const [logs, setLogs] = useState<HealthLogResponse[]>([]);
  const [trends, setTrends] = useState<HealthTrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [weight, setWeight] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [sugar, setSugar] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsData, trendsData] = await Promise.all([
        healthLogApi.list(30),
        healthLogApi.trends(),
      ]);
      setLogs(logsData);
      setTrends(trendsData);
    } catch {
      setError(isBn ? 'ডেটা লোড করতে সমস্যা হয়েছে' : 'Failed to load health records');
    } finally {
      setLoading(false);
    }
  }, [isBn]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSymptom = (symptomKey: string) =>
    setSelectedSymptoms(prev => prev.includes(symptomKey) ? prev.filter(x => x !== symptomKey) : [...prev, symptomKey]);

  const formatSymptom = (s: string) => {
    const found = SYMPTOM_OPTIONS.find(o => o.bn === s || o.en === s);
    if (found) return isBn ? found.bn : found.en;
    return s;
  };

  const resetForm = () => {
    setWeight(''); setBpSys(''); setBpDia(''); setSugar('');
    setHba1c(''); setNotes(''); setSelectedSymptoms([]);
    setLogDate(new Date().toISOString().slice(0, 10));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = { log_date: logDate };
    if (weight.trim()) data.weight_kg = parseFloat(weight);
    if (bpSys.trim() && bpDia.trim()) data.blood_pressure = `${bpSys}/${bpDia}`;
    if (sugar.trim()) data.blood_sugar = parseFloat(sugar);
    if (hba1c.trim()) data.hba1c = parseFloat(hba1c);
    if (notes.trim()) data.notes = notes;
    if (selectedSymptoms.length) data.symptoms = selectedSymptoms;

    if (Object.keys(data).length <= 1) {
      setError(isBn ? 'কমপক্ষে একটি তথ্য দিন' : 'Please provide at least one measurement');
      return;
    }

    setSaving(true); setError(null); setSuccess(null);
    try {
      await healthLogApi.create(data as Parameters<typeof healthLogApi.create>[0]);
      setSuccess(isBn ? 'রেকর্ড সফলভাবে সংরক্ষিত হয়েছে!' : 'Record saved successfully!');
      resetForm();
      setShowForm(false);
      fetchData();
    } catch {
      setError(isBn ? 'সংরক্ষণ করতে সমস্যা হয়েছে' : 'Failed to save health record');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  const weightChange = trends?.weight_trend?.change_kg ?? null;

  const statCards = [
    {
      icon: Scale,
      label: isBn ? 'সর্বশেষ ওজন' : 'Latest Weight',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      value: trends?.weight_trend?.latest_kg != null ? `${trends.weight_trend.latest_kg} kg` : '—',
      sub: weightChange != null ? (
        <span className={`flex items-center gap-0.5 text-[0.6rem] font-bold ${weightChange > 0 ? 'text-red-500' : weightChange < 0 ? 'text-emerald-500' : 'text-ink-faint'}`}>
          {weightChange > 0 ? <TrendingUp className="w-3 h-3" /> : weightChange < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {weightChange > 0 ? '+' : ''}{weightChange} kg
        </span>
      ) : null,
    },
    {
      icon: Droplets,
      label: isBn ? 'রক্তে শর্করা রেকর্ড' : 'Blood Sugar Logs',
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-500',
      value: `${trends?.blood_sugar_trend?.data_points ?? 0}`,
      sub: <span className="text-[0.6rem] text-ink-faint">{isBn ? 'মোট পরিমাপ' : 'Total logs'}</span>,
    },
    {
      icon: Heart,
      label: isBn ? 'মোট এন্ট্রি' : 'Total Entries',
      bg: 'bg-pink-50',
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-500',
      value: `${logs.length}`,
      sub: <span className="text-[0.6rem] text-ink-faint">{isBn ? 'শেষ ৩০ দিন' : 'Last 30 days'}</span>,
    },
  ];

  return (
    <DashboardLayout
      title={isBn ? 'স্বাস্থ্য ট্র্যাকার' : 'Health Log'}
      subtitle={isBn ? 'Health Log — ওজন, রক্তচাপ, রক্তে শর্করা' : 'Track your weight, blood pressure, and blood sugar'}
      headerActions={
        <button
          onClick={() => setShowForm(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 bg-ink text-cream rounded-xl ${isBn ? 'font-bn' : ''} text-xs font-bold hover:bg-accent transition-all shadow-sm`}
        >
          {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? (isBn ? 'বন্ধ করুন' : 'Close') : (isBn ? 'নতুন রেকর্ড' : 'New Log')}
        </button>
      }
    >
      <div className="max-w-3xl mx-auto space-y-4 pb-10">

        {/* Feedback */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 ${isBn ? 'font-bn' : ''} text-xs`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
              <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 ${isBn ? 'font-bn' : ''} text-xs`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
              <button onClick={() => setSuccess(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trend Cards */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3">
            {statCards.map(({ label, bg, iconBg, iconColor, value, sub }, idx) => {
              const Icon = statCards[idx].icon;
              return (
                <div key={label} className={`${bg} rounded-2xl p-4 border border-ink/5`}>
                  <div className={`w-8 h-8 ${iconBg} rounded-xl flex items-center justify-center mb-2`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <div className="font-bold text-lg text-ink leading-tight">{value}</div>
                  {sub}
                  <div className={`text-[0.6rem] text-ink-faint ${isBn ? 'font-bn' : ''} mt-0.5 uppercase tracking-wide`}>{label}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Form */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSave}
              className="bg-white rounded-2xl border border-ink/5 shadow-sm p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className={`${isBn ? 'font-bn' : ''} font-bold text-sm text-ink flex items-center gap-2`}>
                  <Activity className="w-4 h-4 text-accent" /> {isBn ? 'নতুন স্বাস্থ্য রেকর্ড' : 'New Health Record'}
                </h3>
                <span className={`text-[0.6rem] text-ink-muted ${isBn ? 'font-bn' : ''}`}>
                  {isBn ? 'যেকোনো একটি তথ্য দিন' : 'Provide at least one measurement'}
                </span>
              </div>

              {/* Date */}
              <div>
                <label className={`${isBn ? 'font-bn' : ''} text-[0.65rem] font-bold text-ink-faint uppercase tracking-wider mb-1 block`}>
                  {isBn ? 'তারিখ' : 'Date'}
                </label>
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                  className={`w-full bg-cream/40 border border-ink/10 rounded-xl py-2 px-3 ${isBn ? 'font-bn' : ''} text-xs outline-none focus:border-accent/40`}
                />
              </div>

              {/* Weight + Sugar */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${isBn ? 'font-bn' : ''} text-[0.65rem] font-bold text-ink-faint uppercase tracking-wider mb-1 block`}>
                    {isBn ? 'ওজন (kg)' : 'Weight (kg)'}
                  </label>
                  <input type="number" step="0.1" min="10" max="300" placeholder="70.5" value={weight} onChange={e => setWeight(e.target.value)}
                    className={`w-full bg-cream/40 border border-ink/10 rounded-xl py-2 px-3 ${isBn ? 'font-bn' : ''} text-xs outline-none focus:border-accent/40`}
                  />
                </div>
                <div>
                  <label className={`${isBn ? 'font-bn' : ''} text-[0.65rem] font-bold text-ink-faint uppercase tracking-wider mb-1 block`}>
                    {isBn ? 'রক্তে শর্করা (mg/dL)' : 'Blood Sugar (mg/dL)'}
                  </label>
                  <input type="number" step="0.1" min="20" max="600" placeholder="120" value={sugar} onChange={e => setSugar(e.target.value)}
                    className={`w-full bg-cream/40 border border-ink/10 rounded-xl py-2 px-3 ${isBn ? 'font-bn' : ''} text-xs outline-none focus:border-accent/40`}
                  />
                </div>
              </div>

              {/* BP */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${isBn ? 'font-bn' : ''} text-[0.65rem] font-bold text-ink-faint uppercase tracking-wider mb-1 block`}>
                    {isBn ? 'রক্তচাপ সিস্টোলিক' : 'Systolic BP (mmHg)'}
                  </label>
                  <input type="number" min="60" max="250" placeholder="120" value={bpSys} onChange={e => setBpSys(e.target.value)}
                    className={`w-full bg-cream/40 border border-ink/10 rounded-xl py-2 px-3 ${isBn ? 'font-bn' : ''} text-xs outline-none focus:border-accent/40`}
                  />
                </div>
                <div>
                  <label className={`${isBn ? 'font-bn' : ''} text-[0.65rem] font-bold text-ink-faint uppercase tracking-wider mb-1 block`}>
                    {isBn ? 'রক্তচাপ ডায়াস্টোলিক' : 'Diastolic BP (mmHg)'}
                  </label>
                  <input type="number" min="40" max="150" placeholder="80" value={bpDia} onChange={e => setBpDia(e.target.value)}
                    className={`w-full bg-cream/40 border border-ink/10 rounded-xl py-2 px-3 ${isBn ? 'font-bn' : ''} text-xs outline-none focus:border-accent/40`}
                  />
                </div>
              </div>

              {/* HbA1c */}
              <div>
                <label className={`${isBn ? 'font-bn' : ''} text-[0.65rem] font-bold text-ink-faint uppercase tracking-wider mb-1 block`}>
                  {isBn ? 'HbA1c (%)' : 'HbA1c (%)'}
                </label>
                <input type="number" step="0.1" min="3" max="15" placeholder="5.7" value={hba1c} onChange={e => setHba1c(e.target.value)}
                  className={`w-full bg-cream/40 border border-ink/10 rounded-xl py-2 px-3 ${isBn ? 'font-bn' : ''} text-xs outline-none focus:border-accent/40`}
                />
              </div>

              {/* Symptoms */}
              <div>
                <label className={`${isBn ? 'font-bn' : ''} text-[0.65rem] font-bold text-ink-faint uppercase tracking-wider mb-2 block`}>
                  {isBn ? 'লক্ষণ (ঐচ্ছিক)' : 'Symptoms (Optional)'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SYMPTOM_OPTIONS.map(s => {
                    const isSelected = selectedSymptoms.includes(s.en) || selectedSymptoms.includes(s.bn);
                    const label = isBn ? s.bn : s.en;
                    return (
                      <button
                        key={s.en}
                        type="button"
                        onClick={() => toggleSymptom(isBn ? s.bn : s.en)}
                        className={`px-3 py-2 rounded-xl text-[0.75rem] ${isBn ? 'font-bn' : ''} font-bold border transition-all ${isSelected ? 'bg-ink text-cream border-ink' : 'bg-cream border-ink/10 text-ink-muted hover:border-ink/30'}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`${isBn ? 'font-bn' : ''} text-[0.65rem] font-bold text-ink-faint uppercase tracking-wider mb-1 block`}>
                  {isBn ? 'নোট' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isBn ? 'অতিরিক্ত তথ্য...' : 'Additional notes...'}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className={`w-full bg-cream/40 border border-ink/10 rounded-xl py-2 px-3 ${isBn ? 'font-bn' : ''} text-xs outline-none focus:border-accent/40 resize-none`}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className={`w-full py-2.5 bg-ink text-cream rounded-xl ${isBn ? 'font-bn' : ''} font-bold text-xs flex items-center justify-center gap-2 hover:bg-accent transition-all disabled:opacity-60`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'রেকর্ড সংরক্ষণ করুন' : 'Save Health Record')}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* History */}
        <div>
          <h3 className={`${isBn ? 'font-bn' : ''} font-bold text-sm text-ink mb-3 flex items-center gap-2`}>
            <ClipboardList className="w-4 h-4 text-accent" /> {isBn ? 'সাম্প্রতিক রেকর্ড' : 'Recent Records'}
          </h3>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-ink/5">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-15 text-ink" />
              <p className={`${isBn ? 'font-bn' : ''} font-bold text-ink-muted text-sm`}>
                {isBn ? 'কোনো রেকর্ড পাওয়া যায়নি' : 'No records found'}
              </p>
              <p className={`${isBn ? 'font-bn' : ''} text-xs text-ink-faint mt-1`}>
                {isBn ? 'প্রথম রেকর্ড যোগ করতে উপরের বোতাম টিপুন' : 'Click the button above to add your first record'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, i) => (
                <motion.div
                  key={log.log_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-2xl border border-ink/5 p-4 hover:border-accent/20 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-3.5 h-3.5 text-accent" />
                    <span className={`${isBn ? 'font-bn' : ''} font-bold text-xs text-ink`}>{formatDate(log.log_date)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {log.weight_kg != null && (
                      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[0.65rem] font-bold border border-emerald-100">
                        <Scale className="w-3 h-3" /> {log.weight_kg} kg
                      </span>
                    )}
                    {log.blood_pressure && (
                      <span className="flex items-center gap-1 bg-pink-50 text-pink-700 px-2.5 py-1 rounded-full text-[0.65rem] font-bold border border-pink-100">
                        <Heart className="w-3 h-3" /> {log.blood_pressure} mmHg
                      </span>
                    )}
                    {log.blood_sugar != null && (
                      <span className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full text-[0.65rem] font-bold border border-orange-100">
                        <Droplets className="w-3 h-3" /> {log.blood_sugar} mg/dL
                      </span>
                    )}
                    {log.hba1c != null && (
                      <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[0.65rem] font-bold border border-blue-100">
                        HbA1c {log.hba1c}%
                      </span>
                    )}
                  </div>
                  {log.symptoms && log.symptoms.length > 0 && (
                    <p className={`${isBn ? 'font-bn' : ''} text-[0.62rem] text-ink-muted mt-2`}>
                      {isBn ? 'লক্ষণ: ' : 'Symptoms: '}{log.symptoms.map(formatSymptom).join(', ')}
                    </p>
                  )}
                  {log.notes && (
                    <p className={`${isBn ? 'font-bn' : ''} text-[0.62rem] text-ink-faint mt-1`}>{log.notes}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
