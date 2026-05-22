import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pill,
  Plus,
  Trash2,
  Clock,
  Utensils,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mic,
  List,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { medicineApi, type MedicineReminderListItem, type MedicineReminderResponse } from '../lib/api';

export const MedicinePage = () => {
  const [tab, setTab] = useState<'add' | 'list'>('list');
  const [reminders, setReminders] = useState<MedicineReminderListItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<MedicineReminderResponse | null>(null);

  const fetchReminders = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await medicineApi.list();
      setReminders(data);
    } catch {
      setError('রিমাইন্ডার লোড করতে সমস্যা হয়েছে');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setLastAdded(null);
    try {
      const result = await medicineApi.add({ input, language: 'bn' });
      setLastAdded(result);
      setSuccess(result.confirmation);
      setInput('');
      fetchReminders();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ওষুধ যোগ করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await medicineApi.delete(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError('মুছতে সমস্যা হয়েছে');
    }
  };

  const EXAMPLES = [
    'সকালে ও রাতে মেটফরমিন ৫০০ mg খাবারের পরে নিতে হবে',
    'রাতে ঘুমানোর আগে ইনসুলিন নিতে হবে',
    'সকালে ৮টায় আমলোডিপিন ৫mg এবং বিকেলে ৪টায় লিসিনোপ্রিল ১০mg',
  ];

  return (
    <DashboardLayout title="ওষুধের রিমাইন্ডার" subtitle="Medicine Reminders">
      <div className="max-w-3xl w-full mx-auto pb-6 space-y-4">
        {/* Tab */}
        <div className="flex justify-center">
          <div className="flex bg-white p-1 rounded-xl border border-ink/5 shadow-sm gap-0.5">
            {[
              { id: 'list' as const, label: 'রিমাইন্ডার সমূহ', icon: List },
              { id: 'add' as const, label: 'নতুন যোগ করুন', icon: Plus },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bn text-xs font-bold transition-all ${
                  tab === id ? 'bg-ink text-cream shadow-md' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile App Notice */}
        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bn font-bold text-amber-800 text-[0.68rem] leading-none">নোট: নোটিফিকেশন ফিচার</p>
            <p className="font-bn text-amber-700 text-[0.62rem] mt-1 leading-normal">ওষুধের রিমাইন্ডার পুশ-নোটিফিকেশন শুধুমাত্র আমাদের মোবাইল অ্যাপ্লিকেশনে ব্যবহার করা যাবে। ওয়েবসাইটে আপনি শুধু তালিকা দেখতে ও যোগ করতে পারবেন।</p>
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg text-red-500 font-bn text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-100 rounded-lg text-green-600 font-bn text-xs"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {tab === 'add' && (
            <motion.div key="add" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Input Form */}
              <div className="bg-white p-3.5 rounded-xl shadow-sm border border-ink/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center text-cream shrink-0">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bn text-xs font-bold text-ink">AI দিয়ে ওষুধ যোগ করুন</h2>
                    <p className="font-bn text-[0.62rem] text-ink-muted">বাংলায় বলুন বা লিখুন কোন ওষুধ কখন নিতে হবে</p>
                  </div>
                </div>

                <form onSubmit={handleAdd} className="space-y-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="যেমন: সকালে মেটফরমিন ৫০০ mg খাবারের পরে এবং রাতে গ্লিমেপিরাইড ২mg..."
                    rows={2}
                    className="w-full bg-cream/40 border border-ink/10 focus:border-accent/30 rounded-lg py-2 px-2.5 font-bn outline-none transition-all resize-none text-xs"
                    required
                  />

                  <button type="submit" disabled={loading || !input.trim()}
                    className="w-full py-2 bg-ink text-cream rounded-lg font-bold font-bn text-xs flex items-center justify-center gap-1.5 hover:bg-accent transition-all shadow-sm disabled:opacity-60"
                  >
                    {loading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> AI বিশ্লেষণ করছে...</>
                    ) : (
                      <><Pill className="w-3.5 h-3.5" /> রিমাইন্ডার যোগ করুন</>
                    )}
                  </button>
                </form>

                {/* Examples */}
                <div className="mt-4">
                  <p className="font-bn text-[0.62rem] text-ink-faint mb-2 uppercase tracking-wider font-bold">উদাহরণ:</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {EXAMPLES.map((ex, i) => (
                      <button key={i} onClick={() => setInput(ex)}
                        className="w-full text-left p-2 rounded-lg bg-cream/30 hover:bg-cream text-ink-muted hover:text-ink transition-colors font-bn text-xs border border-ink/5"
                      >
                        "{ex}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Parsed Result */}
              {lastAdded && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-3.5 rounded-xl shadow-sm border border-green-100"
                >
                  <h3 className="font-bn text-xs font-bold text-ink mb-2.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    যোগ করা হয়েছে
                  </h3>
                  <div className="space-y-2">
                    {lastAdded.medicines.map((med, i) => (
                      <div key={i} className="bg-cream/40 p-2 rounded-lg border border-ink/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-ink font-bn text-xs">{med.name} — {med.dose}</span>
                          <span className={`text-[0.55rem] font-bold px-1 rounded ${med.with_food ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                            {med.with_food ? '🍽️ খাবারের সাথে' : '💊 খালি পেটে'}
                          </span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {med.times.map((t, j) => (
                            <span key={j} className="flex items-center gap-1 text-[0.62rem] bg-white border border-ink/5 px-2 py-0.5 rounded font-mono font-bold text-ink-muted">
                              <Clock className="w-2.5 h-2.5" /> {t}
                            </span>
                          ))}
                        </div>
                        {med.notes && <p className="text-[0.62rem] text-ink-faint font-bn mt-1 italic">{med.notes}</p>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {tab === 'list' && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {listLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
              ) : reminders.length === 0 ? (
                <div className="text-center py-12 font-bn text-ink-muted">
                  <Pill className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="font-bold mb-1 text-xs">কোনো রিমাইন্ডার নেই</p>
                  <p className="text-[0.68rem] opacity-60">নতুন ওষুধ যোগ করুন</p>
                  <button onClick={() => setTab('add')}
                    className="mt-3 px-4 py-2 bg-ink text-cream rounded-lg font-bold font-bn text-xs hover:bg-accent transition-all"
                  >
                    ওষুধ যোগ করুন
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reminders.map((r) => (
                    <motion.div
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white p-3 rounded-xl border border-ink/5 hover:border-accent/15 transition-all group shadow-sm flex items-start justify-between gap-2"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 bg-cream rounded-lg flex items-center justify-center text-accent group-hover:bg-ink group-hover:text-cream transition-colors shrink-0">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bn font-bold text-ink text-xs truncate">{r.name} — {r.dose}</h3>
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {r.times.map((t, i) => (
                              <span key={i} className="flex items-center gap-1 text-[0.62rem] bg-cream border border-ink/5 px-2 py-0.5 rounded font-mono font-bold text-ink-muted">
                                <Clock className="w-2.5 h-2.5" /> {t}
                              </span>
                            ))}
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className={`text-[0.55rem] font-bold px-1 rounded ${r.with_food ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                              {r.with_food ? '🍽️ খাবারের সাথে' : '💊 খালি পেটে'}
                            </span>
                            {r.notes && <span className="text-[0.62rem] text-ink-faint font-bn italic truncate">{r.notes}</span>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded hover:text-red-500 hover:bg-red-50 transition-all shrink-0 text-ink-faint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};
