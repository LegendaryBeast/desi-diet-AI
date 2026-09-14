import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Utensils, Camera, Trash2, Loader2, AlertCircle, CheckCircle2,
  X, Flame, Beef, Wheat, Droplets, Eye,
  Mic, Coffee, Apple, Moon, Plus,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { mealTrackingApi, type MealTrackingListItem, type MealTrackingResponse } from '../lib/api';

const MEAL_SLOTS = [
  { id: 'breakfast', label: 'সকালের নাস্তা', en: 'Breakfast', icon: Coffee },
  { id: 'lunch', label: 'দুপুরের খাবার', en: 'Lunch', icon: Utensils },
  { id: 'snack', label: 'স্ন্যাক', en: 'Snack', icon: Apple },
  { id: 'dinner', label: 'রাতের খাবার', en: 'Dinner', icon: Moon },
];

export const MealTracking = () => {
  const { i18n } = useTranslation();
  const isBn = i18n.language === 'bn';

  const [, setTab] = useState<'log' | 'history'>('history');
  const [logMode, setLogMode] = useState<'text' | 'image'>('text');
  const [todayLogs, setTodayLogs] = useState<MealTrackingListItem[]>([]);
  const [, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<MealTrackingResponse | null>(null);

  // Text form
  const [textInput, setTextInput] = useState('');
  const [mealSlot, setMealSlot] = useState('lunch');
  const [isManual] = useState(false);
  const [manualCal, setManualCal] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualName, setManualName] = useState('');

  // Image form
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [, setImagePreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchToday = useCallback(async () => {
    setLoading(true);
    try {
      const data = await mealTrackingApi.today();
      setTodayLogs(data);
    } catch {
      setError(isBn ? 'ডেটা লোড করতে সমস্যা হয়েছে' : 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  }, [isBn]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handlePreview = async () => {
    if (!textInput.trim() && !isManual) return;
    setSubmitting(true); setError(null);
    try {
      const data = isManual
        ? await mealTrackingApi.log({
            input: manualName || 'Manual entry',
            meal_slot: mealSlot,
            language: isBn ? 'bn' : 'en',
            is_manual: true,
            direct_calories: manualCal ? parseFloat(manualCal) : undefined,
            direct_protein: manualProtein ? parseFloat(manualProtein) : undefined,
            direct_carbs: manualCarbs ? parseFloat(manualCarbs) : undefined,
            direct_fat: manualFat ? parseFloat(manualFat) : undefined,
            direct_name: manualName || undefined,
            preview: true,
          })
        : await mealTrackingApi.log({ input: textInput, meal_slot: mealSlot, language: isBn ? 'bn' : 'en', preview: true });
      setPreview(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (isBn ? 'বিশ্লেষণ করতে সমস্যা হয়েছে' : 'Failed to analyze meal'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true); setError(null);
    try {
      if (logMode === 'image' && imageFile) {
        await mealTrackingApi.logFromImage(imageFile, { meal_slot: mealSlot, language: isBn ? 'bn' : 'en' });
      } else {
        const params = isManual
          ? {
              input: manualName || 'Manual entry', meal_slot: mealSlot, language: isBn ? 'bn' : 'en', is_manual: true,
              direct_calories: manualCal ? parseFloat(manualCal) : undefined,
              direct_protein: manualProtein ? parseFloat(manualProtein) : undefined,
              direct_carbs: manualCarbs ? parseFloat(manualCarbs) : undefined,
              direct_fat: manualFat ? parseFloat(manualFat) : undefined,
              direct_name: manualName || undefined,
            }
          : { input: textInput, meal_slot: mealSlot, language: isBn ? 'bn' : 'en' };
        await mealTrackingApi.log(params);
      }
      setSuccess(isBn ? 'খাবার সফলভাবে লগ করা হয়েছে!' : 'Meal logged successfully!');
      setTextInput(''); setManualName(''); setManualCal('');
      setManualProtein(''); setManualCarbs(''); setManualFat('');
      setImageFile(null); setImagePreviewUrl(null); setPreview(null);
      setTab('history');
      fetchToday();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (isBn ? 'লগ করতে সমস্যা হয়েছে' : 'Failed to log meal'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await mealTrackingApi.delete(id);
      setTodayLogs(prev => prev.filter(l => l.id !== id));
    } catch {
      setError(isBn ? 'মুছতে সমস্যা হয়েছে' : 'Failed to delete entry');
    }
  };

  return (
    <DashboardLayout
      title={isBn ? "খাবার ট্র্যাকিং" : "Meal Tracking"}
      subtitle={isBn ? "দৈনিক আহার ও ক্যালোরি ট্র্যাকিং" : "Daily Meal & Calorie Tracking"}
    >
      <div className="max-w-3xl mx-auto space-y-6 pb-10">
        
        {/* Feedback Messages */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={`flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 ${isBn ? 'font-bn' : ''} text-xs`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
              <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={`flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 ${isBn ? 'font-bn' : ''} text-xs`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
              <button onClick={() => setSuccess(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Log Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-ink/5">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-6 bg-[#d94a38] rounded-full mt-1"></div>
              <div>
                <h2 className={`${isBn ? 'font-bn font-black' : 'font-bold'} text-xl md:text-2xl text-ink`}>
                  {isBn ? 'আজ আপনি কী খেয়েছেন?' : 'What did you eat today?'}
                  {isBn && <span className="text-ink-muted text-sm md:text-lg font-bold"> (Log a meal)</span>}
                </h2>
                <p className="font-bold text-[0.65rem] md:text-xs text-ink-faint tracking-widest mt-0.5 uppercase">
                  TYPE • SPEAK • SNAP A PHOTO
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[#d94a38] text-[0.65rem] font-bold tracking-widest font-bn mt-2">
              <Flame className="w-3 h-3" /> AI PARSED
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-[#fcf9f5] p-1.5 rounded-2xl mb-6">
            {[
              { id: 'text' as const, icon: Plus, label: isBn ? 'টেক্সট' : 'Text', active: true },
              { id: 'voice' as const, icon: Mic, label: isBn ? 'ভয়েস (শীঘ্রই)' : 'Voice (Coming Soon)', active: false },
              { id: 'image' as const, icon: Camera, label: isBn ? 'ছবি (শীঘ্রই)' : 'Photo (Coming Soon)', active: false },
            ].map(({ id, icon: Icon, label, active }) => (
              <button key={id} onClick={() => { if(id === 'text') setLogMode('text'); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                  active ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:bg-white/50'
                }`}
              >
                <Icon size={16} className={id === 'text' ? 'text-[#d94a38]' : ''} />
                {label}
              </button>
            ))}
          </div>

          {/* Meal Slot Selector */}
          <div className="flex gap-2 flex-wrap mb-6">
            {MEAL_SLOTS.map(({ id, icon: Icon, label, en }) => (
              <button key={id} onClick={() => setMealSlot(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                  mealSlot === id ? 'bg-ink text-white border-ink' : 'bg-white border-ink/10 text-ink-muted hover:border-ink/30'
                }`}
              >
                <Icon size={13} /> {isBn ? label : en}
              </button>
            ))}
          </div>

          {/* Text Area */}
          <textarea rows={4}
            placeholder={isBn ? 'যেমন: "এক প্লেট ভাত, ডাল আর মাছ" অথবা "1 banana and a glass of milk"' : 'e.g. "1 plate rice, dal, and fish" or "1 banana and a glass of milk"'}
            value={textInput} onChange={e => { setTextInput(e.target.value); setPreview(null); }}
            className={`w-full bg-[#fcf9f5] border border-ink/10 rounded-2xl p-4 ${isBn ? 'font-bn' : ''} text-sm md:text-base text-ink outline-none focus:border-accent/40 resize-none mb-6 placeholder:text-ink/30`}
          />

          {/* Action Button */}
          {preview ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 space-y-3 mb-6"
            >
              <h4 className={`${isBn ? 'font-bn' : ''} font-bold text-xs text-ink flex items-center gap-1.5`}>
                <Eye className="w-3.5 h-3.5 text-accent" /> {isBn ? 'AI বিশ্লেষণ' : 'AI Analysis'}
              </h4>
              <div className="flex gap-3 flex-wrap">
                {[
                  { icon: Flame, label: isBn ? 'ক্যালোরি' : 'Calories', val: `${Math.round(preview.total_calories)} kcal`, color: 'text-orange-500' },
                  { icon: Beef, label: isBn ? 'প্রোটিন' : 'Protein', val: `${preview.macros.protein_g.toFixed(1)}g`, color: 'text-blue-500' },
                  { icon: Wheat, label: isBn ? 'কার্বস' : 'Carbs', val: `${preview.macros.carbs_g.toFixed(1)}g`, color: 'text-amber-500' },
                  { icon: Droplets, label: isBn ? 'ফ্যাট' : 'Fat', val: `${preview.macros.fat_g.toFixed(1)}g`, color: 'text-pink-500' },
                ].map(({ icon: Icon, label, val, color }) => (
                  <div key={label} className="bg-cream/50 rounded-xl px-3 py-2 text-center">
                    <Icon className={`w-3.5 h-3.5 ${color} mx-auto mb-0.5`} />
                    <div className="font-bold text-xs text-ink">{val}</div>
                    <div className="text-[0.55rem] text-ink-faint">{label}</div>
                  </div>
                ))}
              </div>
              {preview.ai_feedback && <p className={`${isBn ? 'font-bn' : ''} text-[0.68rem] text-ink-muted`}>{preview.ai_feedback}</p>}
              <button onClick={handleConfirm} disabled={submitting}
                className={`w-full py-3 bg-[#e6a89c] text-white rounded-2xl ${isBn ? 'font-bn' : ''} font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#d94a38] transition-all disabled:opacity-60`}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isBn ? 'খাবার লগ করুন' : 'Log Meal'}
              </button>
            </motion.div>
          ) : (
            <button onClick={handlePreview} disabled={submitting || !textInput.trim()}
              className={`w-full py-4 bg-[#e6a89c] text-white rounded-2xl ${isBn ? 'font-bn' : ''} font-bold text-base md:text-lg flex items-center justify-center gap-2 hover:bg-[#d94a38] transition-all disabled:opacity-60`}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
              {isBn ? 'অনুসন্ধান ও প্রিভিউ' : 'Search & Preview'}
            </button>
          )}
        </div>

        {/* Rating Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-ink/5 flex flex-col items-center justify-center max-w-sm mx-auto">
          <p className={`${isBn ? 'font-bn' : ''} font-bold text-ink mb-3 text-sm`}>
            {isBn ? 'এই লগিং অভিজ্ঞতা কেমন লাগলো?' : 'How was your logging experience?'}
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <svg key={i} className="w-6 h-6 text-ink/20 cursor-pointer hover:text-accent transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" />
              </svg>
            ))}
          </div>
        </div>

        {/* Today's Log History */}
        {todayLogs.length > 0 && (
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-ink/5 mt-8">
            <h3 className={`${isBn ? 'font-bn font-black' : 'font-bold'} text-lg text-ink mb-4`}>
              {isBn ? 'আজকের লগ হিস্ট্রি' : "Today's Log History"}
            </h3>
            <div className="space-y-3">
              {todayLogs.map((log, i) => {
                const slotObj = MEAL_SLOTS.find(s => s.id === log.meal_slot);
                const slotLabel = isBn ? (slotObj?.label || log.meal_slot) : (slotObj?.en || log.meal_slot);
                return (
                  <motion.div key={log.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-cream/30 rounded-2xl border border-ink/5 p-4 flex items-start gap-3 hover:border-accent/20 transition-all group"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <Utensils className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`${isBn ? 'font-bn' : ''} font-bold text-sm text-ink truncate`}>{log.input_text}</div>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[0.65rem] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                          <Flame className="w-3 h-3" /> {Math.round(log.total_calories)} kcal
                        </span>
                        <span className="flex items-center gap-1 text-[0.65rem] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                          <Beef className="w-3 h-3" /> {log.macros?.protein_g?.toFixed(1)}g
                        </span>
                        {slotLabel && (
                          <span className={`text-[0.65rem] font-bold text-ink-muted bg-white border border-ink/10 px-2 py-0.5 rounded-full ${isBn ? 'font-bn' : ''}`}>
                            {slotLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(log.id)}
                      className="p-2 rounded-xl text-ink-faint hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
