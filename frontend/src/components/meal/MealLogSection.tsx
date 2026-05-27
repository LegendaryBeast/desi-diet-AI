import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Mic,
  Square,
  Loader2,
  Send,
  X,
  Plus,
  Coffee,
  Utensils,
  Apple,
  Moon,
  Sparkles,
  ImagePlus,
  Trash2,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  chatApi,
  mealTrackingApi,
  mealPlanApi,
  type MealTrackingResponse,
  type MealTrackingListItem,
} from '../../lib/api';

const SLOT_OPTIONS: Array<{ value: string; label: string; icon: any }> = [
  { value: 'breakfast', label: 'Breakfast', icon: Coffee },
  { value: 'lunch', label: 'Lunch', icon: Utensils },
  { value: 'snack', label: 'Snack', icon: Apple },
  { value: 'dinner', label: 'Dinner', icon: Moon },
];

type Mode = 'text' | 'voice' | 'photo';

export interface TrackingTotals {
  totalCalories: number;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
}

interface MealLogSectionProps {
  /** Called whenever tracking data changes (new log, initial fetch). */
  onTrackingUpdate?: (totals: TrackingTotals) => void;
  onLogDeleted?: (slotName: string) => void;
}

/**
 * Self-contained meal-logging widget — embedded inside MealPlan today tab.
 *
 * Three input modes:
 *   1. Text   — natural language ("two rotis with dal").
 *   2. Voice  — push-to-talk → Whisper transcribe → fills text field; user reviews then submits.
 *   3. Photo  — pick/snap a food photo → vision LLM identifies items and logs directly.
 *   */
export const MealLogSection: React.FC<MealLogSectionProps> = ({ onTrackingUpdate, onLogDeleted }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const getCleanFoodName = (logInputText: string, planDataList: any[], isBn: boolean) => {
    let clean = logInputText
      .replace(/^📋\s*\[Plan\]\s*/, '')
      .replace(/^📋\s*/, '')
      .replace(/^\[Plan\]\s*/, '')
      .replace(/^\[Manual\]\s*/, '')
      .replace(/^✍️\s*\[Manual\]\s*/, '')
      .replace(/^✍️\s*/, '')
      .replace(/^✅\s*/, '')
      .replace(/^⚠️\s*/, '')
      .replace(/^📷\s*/, '')
      .trim();

    clean = clean.replace(/^\d+g\s+of\s+/i, '');
    clean = clean.replace(/^\d+\s+portion\s+of\s+/i, '');
    clean = clean.replace(/^of\s+/i, '');
    clean = clean.replace(/\s*\[.*?\]/g, '').trim();

    const cleanLower = clean.toLowerCase();

    for (const item of planDataList) {
      const itemEn = (item.name_en || '').toLowerCase();
      const itemBn = (item.name_bn || '').toLowerCase();
      const itemCode = (item.food_code || item.code || '').toLowerCase();
      
      if (
        cleanLower === itemEn ||
        cleanLower === itemBn ||
        (itemCode && cleanLower === itemCode) ||
        cleanLower.includes(itemEn) ||
        cleanLower.includes(itemBn)
      ) {
        return isBn ? (item.name_bn || item.name_en) : (item.name_en || item.name_bn);
      }
    }

    return clean;
  };

  const [mode, setMode] = useState<Mode>('text');
  const [mealSlot, setMealSlot] = useState<string>('snack');
  const [text, setText] = useState('');
  const [strictMode, setStrictMode] = useState(() => localStorage.getItem('strictMode') === 'true');

  useEffect(() => {
    const handleChanged = () => {
      setStrictMode(localStorage.getItem('strictMode') === 'true');
    };
    window.addEventListener('strictModeChanged', handleChanged);
    return () => window.removeEventListener('strictModeChanged', handleChanged);
  }, []);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<MealTrackingResponse | null>(null);

  // Today's logs
  const [todayLogs, setTodayLogs] = useState<MealTrackingListItem[]>([]);
  const [planItems, setPlanItems] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const recorderStreamRef = useRef<MediaStream | null>(null);

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState('');
  const [photoQuantityG, setPhotoQuantityG] = useState('');
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to compute and emit totals
  const emitTotals = useCallback((logs: MealTrackingListItem[]) => {
    if (!onTrackingUpdate) return;
    const totalCalories = logs.reduce((sum, log) => sum + log.total_calories, 0);
    const macros = logs.reduce(
      (acc, l) => ({
        protein_g: acc.protein_g + (l.macros?.protein_g || 0),
        carbs_g: acc.carbs_g + (l.macros?.carbs_g || 0),
        fat_g: acc.fat_g + (l.macros?.fat_g || 0),
      }),
      { protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
    onTrackingUpdate({ totalCalories, macros });
  }, [onTrackingUpdate]);

  // ── Today's logs ─────────────────────────────────────────────────────────
  const fetchTodayLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const [items, planRes] = await Promise.all([
        mealTrackingApi.today(),
        mealPlanApi.getDaily(lang).catch(() => null)
      ]);
      setTodayLogs(items);
      emitTotals(items);

      if (planRes && planRes.plan_data) {
        const meals = (planRes.plan_data as any).meals || [];
        const extracted: any[] = [];
        meals.forEach((m: any) => {
          (m.items || []).forEach((it: any) => {
            extracted.push(it);
          });
        });
        setPlanItems(extracted);
      }
    } catch (err) {
      // soft fail — keep widget usable
      console.warn('Failed to load today\'s meal logs', err);
    } finally {
      setLoadingLogs(false);
    }
  }, [emitTotals, lang]);

  useEffect(() => {
    fetchTodayLogs();
  }, [fetchTodayLogs]);

  // ── Cleanup mic on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      recorderStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Voice ───────────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (isRecording) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recorderChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        recorderStreamRef.current?.getTracks().forEach((t) => t.stop());
        recorderStreamRef.current = null;
        const blob = new Blob(recorderChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size === 0) return;
        setIsTranscribing(true);
        try {
          const { text: transcribed } = await chatApi.transcribe(blob);
          if (transcribed) setText((prev) => (prev ? `${prev} ${transcribed}` : transcribed));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Transcription failed');
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  };

  // ── Photo ────────────────────────────────────────────────────────────────
  const onPhotoPick = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large — keep under 10 MB.');
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoNote('');
    setPhotoQuantityG('');
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedInputText, setConfirmedInputText] = useState('');

  // ── Submit handlers ─────────────────────────────────────────────────────
  const submitText = async (previewMode = true) => {
    const textToSubmit = previewMode ? text.trim() : confirmedInputText;
    if (!textToSubmit) return;
    
    setBusy(true);
    setError(null);
    if (previewMode) {
      setLastResult(null);
      setIsConfirmed(false);
      setConfirmedInputText(textToSubmit);
    }
    
    try {
      const res = await mealTrackingApi.log({
        input: textToSubmit,
        meal_slot: mealSlot,
        language: lang,
        strict_mode: strictMode,
        preview: previewMode,
        is_manual: true,
      });
      setLastResult(res);
      if (!previewMode) {
        setIsConfirmed(true);
        setText('');
        setConfirmedInputText('');
        fetchTodayLogs();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log meal');
    } finally {
      setBusy(false);
    }
  };

  const submitPhoto = async (previewMode = true) => {
    if (!photoFile) return;
    setBusy(true);
    setError(null);
    if (previewMode) {
      setLastResult(null);
      setIsConfirmed(false);
    }
    
    try {
      const qtyG = photoNote.trim() && photoQuantityG ? parseFloat(photoQuantityG) : undefined;
      const res = await mealTrackingApi.logFromImage(photoFile, {
        meal_slot: mealSlot,
        language: lang,
        food_name: photoNote.trim() || undefined,
        quantity_g: qtyG,
        preview: previewMode,
      });
      setLastResult(res);
      if (!previewMode) {
        setIsConfirmed(true);
        clearPhoto();
        fetchTodayLogs();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze photo');
    } finally {
      setBusy(false);
    }
  };

  const deleteLog = async (logId: string | string[], slotName?: string) => {
    setError(null);
    try {
      if (Array.isArray(logId)) {
        for (const id of logId) {
          try {
            await mealTrackingApi.delete(id);
          } catch (e) {
            console.warn(`Failed to delete log item ${id}:`, e);
          }
        }
      } else {
        await mealTrackingApi.delete(logId);
      }
      if (slotName && onLogDeleted) {
        onLogDeleted(slotName);
      }
      fetchTodayLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete log');
    }
  };

  // Aggregate totals for today
  const todayTotal = todayLogs.reduce((sum, log) => sum + log.total_calories, 0);
  const todayMacros = todayLogs.reduce(
    (acc, l) => ({
      protein_g: acc.protein_g + (l.macros?.protein_g || 0),
      carbs_g: acc.carbs_g + (l.macros?.carbs_g || 0),
      fat_g: acc.fat_g + (l.macros?.fat_g || 0),
    }),
    { protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  // Show ALL today's logs (plan-marked + manually added)
  const allLogs = todayLogs;

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-ink/5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-5 bg-accent rounded-full" />
          <div>
            <h2 className="font-display text-lg md:text-xl font-black text-ink">
              আজ আপনি কী খেয়েছেন? <span className="text-ink-muted font-body text-sm">(Log a meal)</span>
            </h2>
            <p className="text-[0.7rem] uppercase tracking-widest text-ink-faint font-body font-bold mt-1">
              Type · Speak · Snap a photo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-muted font-body">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="font-bold uppercase tracking-widest text-[0.6rem]">AI parsed</span>
        </div>
      </div>

      {/* Today's totals strip */}
      {todayLogs.length > 0 && (
        <div className="grid grid-cols-4 gap-2 md:gap-3 bg-cream/50 p-3 md:p-4 rounded-2xl">
          <div className="text-center">
            <div className="font-body text-lg md:text-2xl font-bold text-ink">{todayTotal}</div>
            <div className="font-body text-[0.6rem] uppercase tracking-widest text-ink-faint font-bold">kcal</div>
          </div>
          <div className="text-center">
            <div className="font-body text-lg md:text-2xl font-bold text-ink">
              {Math.round(todayMacros.protein_g)}g
            </div>
            <div className="font-body text-[0.6rem] uppercase tracking-widest text-ink-faint font-bold">protein</div>
          </div>
          <div className="text-center">
            <div className="font-body text-lg md:text-2xl font-bold text-ink">
              {Math.round(todayMacros.carbs_g)}g
            </div>
            <div className="font-body text-[0.6rem] uppercase tracking-widest text-ink-faint font-bold">carbs</div>
          </div>
          <div className="text-center">
            <div className="font-body text-lg md:text-2xl font-bold text-ink">
              {Math.round(todayMacros.fat_g)}g
            </div>
            <div className="font-body text-[0.6rem] uppercase tracking-widest text-ink-faint font-bold">fat</div>
          </div>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-2 p-1 bg-cream/50 rounded-2xl">
        {([
          { id: 'text', label: 'Text', icon: Plus, comingSoon: false },
          { id: 'voice', label: 'Voice 🚧', icon: Mic, comingSoon: true },
          { id: 'photo', label: 'Photo 🚧', icon: Camera, comingSoon: true },
        ] as Array<{ id: Mode; label: string; icon: any; comingSoon: boolean }>).map((opt) => {
          const active = mode === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              onClick={() => {
                if (opt.comingSoon) {
                  alert(lang === 'bn' ? '🚧 শীঘ্রই আসছে! এই ফিচারটি近くtআসছে।' : '🚧 Coming Soon! This feature is under development.');
                  return;
                }
                setMode(opt.id);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bn font-bold text-sm transition-all ${
                active && !opt.comingSoon ? 'bg-white text-ink shadow-sm' : opt.comingSoon ? 'text-ink-faint cursor-not-allowed' : 'text-ink-muted hover:bg-white/50'
              }`}
            >
              <Icon size={16} className={active && !opt.comingSoon ? 'text-accent' : 'text-ink-faint'} />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Slot picker */}
      <div className="flex flex-wrap gap-2">
        {SLOT_OPTIONS.map((s) => {
          const active = mealSlot === s.value;
          const Icon = s.icon;
          return (
            <button
              key={s.value}
              onClick={() => setMealSlot(s.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-bn text-xs font-bold transition-all ${
                active
                  ? 'bg-ink text-cream border-ink shadow-md'
                  : 'bg-white text-ink-muted border-ink/10 hover:border-accent/40'
              }`}
            >
              <Icon size={14} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Mode-specific input area */}
      <div className="min-h-[120px]">
        {mode === 'text' && (
          <div className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='e.g. "এক প্লেট ভাত, ডাল আর মাছ" or "1 banana and a glass of milk"'
              rows={3}
              className="w-full bg-cream/50 border border-ink/10 rounded-2xl p-4 font-bn text-sm focus:outline-none focus:border-accent/60 focus:ring-2 ring-accent/10 resize-none"
            />
            <button
              onClick={() => submitText(true)}
              disabled={!text.trim() || busy}
              className="w-full px-5 py-3 bg-accent text-white rounded-2xl font-bn font-black flex items-center justify-center gap-2 hover:bg-ink transition-all disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
              {lang === 'bn' ? 'খাবার খুঁজুন ও পুষ্টি দেখুন' : 'Search & Preview'}
            </button>
          </div>
        )}

        {mode === 'voice' && (
          <div className="space-y-3">
            <div className="bg-cream/50 border border-ink/10 rounded-2xl p-4 min-h-[80px]">
              <div className="font-bn text-sm text-ink whitespace-pre-wrap min-h-[40px]">
                {text || (
                  <span className="text-ink-faint italic">
                    {isRecording ? '🔴 Recording…' : isTranscribing ? 'Transcribing…' : 'Tap the mic and describe what you ate.'}
                  </span>
                )}
              </div>
              {text && !isRecording && !isTranscribing && (
                <button
                  onClick={() => setText('')}
                  className="mt-2 text-[0.65rem] uppercase tracking-widest font-body font-bold text-ink-faint hover:text-red-500"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing || busy}
                className={`flex-1 px-5 py-3 rounded-2xl font-bn font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-cream text-ink-muted hover:bg-accent hover:text-white'
                }`}
              >
                {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" />
                  : isRecording ? <Square size={16} />
                  : <Mic size={16} />}
                {isRecording ? 'Stop' : isTranscribing ? 'Transcribing' : 'Record'}
              </button>
              <button
                onClick={() => submitText(true)}
                disabled={!text.trim() || busy || isRecording || isTranscribing}
                className="flex-1 px-5 py-3 bg-accent text-white rounded-2xl font-bn font-black flex items-center justify-center gap-2 hover:bg-ink transition-all disabled:opacity-40"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
                {lang === 'bn' ? 'খাবার খুঁজুন ও পুষ্টি দেখুন' : 'Search & Preview'}
              </button>
            </div>
          </div>
        )}

        {mode === 'photo' && (
          <div className="space-y-3">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPhotoPick(f);
              }}
            />
            {!photoFile ? (
              <button
                onClick={() => photoInputRef.current?.click()}
                className="w-full bg-cream/50 border-2 border-dashed border-ink/15 rounded-2xl p-8 flex flex-col items-center gap-2 hover:border-accent/60 hover:bg-cream transition-all"
              >
                <ImagePlus className="w-8 h-8 text-ink-muted" />
                <div className="font-bn font-bold text-ink">Take or upload a meal photo</div>
                <div className="font-body text-[0.65rem] uppercase tracking-widest text-ink-faint font-bold">
                  AI will identify foods via GraphRAG database
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={photoPreview!}
                    alt="meal"
                    className="w-full max-h-60 object-cover rounded-2xl border border-ink/10"
                  />
                  <button
                    onClick={clearPhoto}
                    className="absolute top-2 right-2 w-8 h-8 bg-ink/80 text-cream rounded-full flex items-center justify-center hover:bg-red-500 transition-all"
                    aria-label="Remove photo"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Food Name hint */}
                <div className="space-y-1">
                  <label className="font-body text-[0.65rem] uppercase tracking-widest text-ink-faint font-bold">
                    🍛 Food Name <span className="text-ink-faint/60">(optional — helps GraphRAG find exact match)</span>
                  </label>
                  <input
                    type="text"
                    value={photoNote}
                    onChange={(e) => setPhotoNote(e.target.value)}
                    placeholder='e.g. "ভাত", "Rice", "Chicken curry"'
                    className="w-full bg-cream/50 border border-ink/10 rounded-2xl px-4 py-2.5 font-bn text-sm focus:outline-none focus:border-accent/60"
                  />
                </div>

                {/* Quantity hint */}
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="font-body text-[0.65rem] uppercase tracking-widest text-ink-faint font-bold">
                      ⚖️ Quantity (grams)
                    </label>
                    <input
                      type="number"
                      value={photoQuantityG}
                      onChange={(e) => setPhotoQuantityG(e.target.value)}
                      placeholder="e.g. 150"
                      min="1"
                      className="w-full bg-cream/50 border border-ink/10 rounded-2xl px-4 py-2.5 font-bn text-sm focus:outline-none focus:border-accent/60"
                    />
                  </div>
                </div>

                <button
                  onClick={() => submitPhoto(true)}
                  disabled={busy}
                  className="w-full px-5 py-3 bg-accent text-white rounded-2xl font-bn font-black flex items-center justify-center gap-2 hover:bg-ink transition-all disabled:opacity-40"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={16} />}
                  {busy ? (lang === 'bn' ? 'ডাটাবেজ খুঁজছি...' : 'Searching database…') : (lang === 'bn' ? 'ছবি বিশ্লেষণ ও পুষ্টি দেখুন' : 'Analyze & Preview')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bn">
          {error}
        </div>
      )}

      {/* Last AI result */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`border rounded-2xl p-4 space-y-3 transition-all ${
              isConfirmed 
                ? 'bg-emerald-50/60 border-emerald-100' 
                : 'bg-lime-50/50 border-lime-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-body font-bold text-ink flex items-center gap-2">
                {isConfirmed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Sparkles className="w-4 h-4 text-accent" />
                )}
                {isConfirmed 
                  ? (lang === 'bn' ? 'সফলভাবে ডায়েরিতে যোগ হয়েছে!' : 'Logged Successfully!') 
                  : (lang === 'bn' ? 'খাবারের পুষ্টির বিবরণ (প্রিভিউ)' : 'Food Nutrition Details (Preview)')
                } · {lastResult.total_calories} kcal
              </div>
              <button
                onClick={() => {
                  setLastResult(null);
                  setIsConfirmed(false);
                }}
                className="text-ink-faint hover:text-ink"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
            {lastResult.parsed_items.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {lastResult.parsed_items.map((item, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-white border border-ink/10 rounded-full text-xs font-bn font-bold text-ink"
                  >
                    {item.name}
                    {item.amount_g ? ` · ${Math.round(item.amount_g)}g` : ''}
                    <span className="text-ink-faint ml-1">{Math.round(item.calories)}kcal</span>
                  </span>
                ))}
              </div>
            )}
            {lastResult.ai_feedback && (
              <p className="font-bn text-sm text-ink leading-relaxed">{lastResult.ai_feedback}</p>
            )}
            {!isConfirmed && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    if (mode === 'photo') {
                      submitPhoto(false);
                    } else {
                      submitText(false);
                    }
                  }}
                  disabled={busy}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bn font-black text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-all disabled:opacity-40"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 size={13} />}
                  {lang === 'bn' ? 'নিশ্চিত করুন ও যোগ করুন' : 'Confirm & Add to Tracker'}
                </button>
                <button
                  onClick={() => {
                    setLastResult(null);
                    setIsConfirmed(false);
                  }}
                  className="px-3 py-2 bg-cream text-ink-muted border border-ink/5 rounded-xl font-bn font-bold text-xs hover:bg-cream/80 transition-all"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's logs list — Grouped, Compact & Language-Aware */}
      {allLogs.length > 0 && (() => {
        const isBn = lang === 'bn';
        
        // Group today's logs by meal_slot
        const groupsMap: Record<string, {
          meal_slot: string;
          total_calories: number;
          macros: { protein_g: number; carbs_g: number; fat_g: number };
          ids: string[];
          food_names: string[];
          logged_at: string;
        }> = {};

        for (const log of allLogs) {
          const slot = log.meal_slot || 'other';
          const cleanName = getCleanFoodName(log.input_text, planItems, isBn);
          
          if (!groupsMap[slot]) {
            groupsMap[slot] = {
              meal_slot: slot,
              total_calories: 0,
              macros: { protein_g: 0, carbs_g: 0, fat_g: 0 },
              ids: [],
              food_names: [],
              logged_at: log.logged_at,
            };
          }
          
          groupsMap[slot].total_calories += log.total_calories || 0;
          if (log.macros) {
            groupsMap[slot].macros.protein_g += log.macros.protein_g || 0;
            groupsMap[slot].macros.carbs_g += log.macros.carbs_g || 0;
            groupsMap[slot].macros.fat_g += log.macros.fat_g || 0;
          }
          groupsMap[slot].ids.push(log.id);
          if (!groupsMap[slot].food_names.includes(cleanName)) {
            groupsMap[slot].food_names.push(cleanName);
          }
          if (new Date(log.logged_at) > new Date(groupsMap[slot].logged_at)) {
            groupsMap[slot].logged_at = log.logged_at;
          }
        }

        const groups = Object.values(groupsMap);
        const visibleGroups = showAllLogs ? groups : groups.slice(0, 2);

        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-body text-[0.65rem] uppercase tracking-widest text-ink-faint font-bold">
                {isBn ? `আজকের খাবার লগ · ${groups.length}` : `Today's logs · ${groups.length}`}
              </div>
              {loadingLogs && <Loader2 className="w-3 h-3 animate-spin text-ink-faint" />}
            </div>

            <div className="space-y-2">
              {visibleGroups.map((group) => {
                const slotMeta = SLOT_OPTIONS.find((s) => s.value === group.meal_slot);
                const Icon = slotMeta?.icon || Utensils;
                const time = new Date(group.logged_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const combinedFoodNames = group.food_names.join(', ');
                const SLOT_LABELS_BN: Record<string, string> = {
                  breakfast: 'সকালের নাস্তা',
                  lunch: 'দুপুরের খাবার',
                  snack: 'স্ন্যাক্স',
                  dinner: 'রাতের খাবার',
                  morning_snack: 'সকালের নাস্তা',
                  evening_snack: 'বিকেলের নাস্তা',
                  other: 'অন্যান্য',
                };
                const SLOT_LABELS_EN: Record<string, string> = {
                  breakfast: 'Breakfast',
                  lunch: 'Lunch',
                  snack: 'Snack',
                  dinner: 'Dinner',
                  morning_snack: 'Morning Snack',
                  evening_snack: 'Evening Snack',
                  other: 'Other Food',
                };
                const slotLabel = isBn 
                  ? (SLOT_LABELS_BN[group.meal_slot] || SLOT_LABELS_BN.other)
                  : (SLOT_LABELS_EN[group.meal_slot] || SLOT_LABELS_EN.other);

                return (
                  <div
                    key={group.meal_slot}
                    className="flex flex-col gap-2 bg-cream/40 p-4 rounded-2xl border border-ink/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-ink/5 flex items-center justify-center text-ink-muted shrink-0">
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bn text-sm font-bold text-ink truncate leading-tight">
                          {combinedFoodNames}
                        </div>
                        <div className="text-[0.6rem] uppercase tracking-widest font-body font-bold text-ink-faint mt-0.5">
                          {slotLabel} · {time}
                        </div>
                      </div>
                      <div className="font-body font-bold text-ink shrink-0 flex items-center gap-2">
                        <span>
                          {group.total_calories}
                          <span className="text-[0.6rem] text-ink-faint font-body ml-1">kcal</span>
                        </span>
                        <button
                          onClick={() => deleteLog(group.ids, group.meal_slot)}
                          className="p-1.5 text-ink-faint hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {groups.length > 2 && (
              <button
                onClick={() => setShowAllLogs(!showAllLogs)}
                className="w-full mt-2 py-2.5 bg-cream/40 hover:bg-cream/60 text-ink-muted border border-ink/5 rounded-xl font-bn font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                {showAllLogs 
                  ? (isBn ? 'কম দেখান ▲' : 'Show Less ▲') 
                  : (isBn ? `আরও দেখুন (${groups.length - 2}টি) ▼` : `See More (${groups.length - 2} more) ▼`)}
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
};
