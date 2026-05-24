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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  chatApi,
  mealTrackingApi,
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
}

/**
 * Self-contained meal-logging widget — embedded inside MealPlan today tab.
 *
 * Three input modes:
 *   1. Text   — natural language ("two rotis with dal").
 *   2. Voice  — push-to-talk → Whisper transcribe → fills text field; user reviews then submits.
 *   3. Photo  — pick/snap a food photo → vision LLM identifies items and logs directly.
 */
export const MealLogSection: React.FC<MealLogSectionProps> = ({ onTrackingUpdate }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const [mode, setMode] = useState<Mode>('text');
  const [mealSlot, setMealSlot] = useState<string>('snack');
  const [text, setText] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<MealTrackingResponse | null>(null);

  // Today's logs
  const [todayLogs, setTodayLogs] = useState<MealTrackingListItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

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
      const items = await mealTrackingApi.today();
      setTodayLogs(items);
      emitTotals(items);
    } catch (err) {
      // soft fail — keep widget usable
      console.warn('Failed to load today\'s meal logs', err);
    } finally {
      setLoadingLogs(false);
    }
  }, [emitTotals]);

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
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // ── Submit handlers ─────────────────────────────────────────────────────
  const submitText = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await mealTrackingApi.log({
        input: text.trim(),
        meal_slot: mealSlot,
        language: lang,
      });
      setLastResult(res);
      setText('');
      fetchTodayLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log meal');
    } finally {
      setBusy(false);
    }
  };

  const submitPhoto = async () => {
    if (!photoFile) return;
    setBusy(true);
    setError(null);
    try {
      const res = await mealTrackingApi.logFromImage(photoFile, {
        meal_slot: mealSlot,
        language: lang,
        note: photoNote || undefined,
      });
      setLastResult(res);
      clearPhoto();
      fetchTodayLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze photo');
    } finally {
      setBusy(false);
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
            <div className="font-display text-lg md:text-2xl font-black text-ink">{todayTotal}</div>
            <div className="font-body text-[0.6rem] uppercase tracking-widest text-ink-faint font-bold">kcal</div>
          </div>
          <div className="text-center">
            <div className="font-display text-lg md:text-2xl font-black text-ink">
              {Math.round(todayMacros.protein_g)}g
            </div>
            <div className="font-body text-[0.6rem] uppercase tracking-widest text-ink-faint font-bold">protein</div>
          </div>
          <div className="text-center">
            <div className="font-display text-lg md:text-2xl font-black text-ink">
              {Math.round(todayMacros.carbs_g)}g
            </div>
            <div className="font-body text-[0.6rem] uppercase tracking-widest text-ink-faint font-bold">carbs</div>
          </div>
          <div className="text-center">
            <div className="font-display text-lg md:text-2xl font-black text-ink">
              {Math.round(todayMacros.fat_g)}g
            </div>
            <div className="font-body text-[0.6rem] uppercase tracking-widest text-ink-faint font-bold">fat</div>
          </div>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-2 p-1 bg-cream/50 rounded-2xl">
        {([
          { id: 'text', label: 'Text', icon: Plus },
          { id: 'voice', label: 'Voice', icon: Mic },
          { id: 'photo', label: 'Photo', icon: Camera },
        ] as Array<{ id: Mode; label: string; icon: any }>).map((opt) => {
          const active = mode === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bn font-bold text-sm transition-all ${
                active ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:bg-white/50'
              }`}
            >
              <Icon size={16} className={active ? 'text-accent' : ''} />
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
              onClick={submitText}
              disabled={!text.trim() || busy}
              className="w-full px-5 py-3 bg-accent text-white rounded-2xl font-bn font-black flex items-center justify-center gap-2 hover:bg-ink transition-all disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
              Log meal
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
                onClick={submitText}
                disabled={!text.trim() || busy || isRecording || isTranscribing}
                className="flex-1 px-5 py-3 bg-accent text-white rounded-2xl font-bn font-black flex items-center justify-center gap-2 hover:bg-ink transition-all disabled:opacity-40"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
                Log meal
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
                  AI will identify foods and portions
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={photoPreview!}
                    alt="meal"
                    className="w-full max-h-72 object-cover rounded-2xl border border-ink/10"
                  />
                  <button
                    onClick={clearPhoto}
                    className="absolute top-2 right-2 w-8 h-8 bg-ink/80 text-cream rounded-full flex items-center justify-center hover:bg-red-500 transition-all"
                    aria-label="Remove photo"
                  >
                    <X size={16} />
                  </button>
                </div>
                <input
                  type="text"
                  value={photoNote}
                  onChange={(e) => setPhotoNote(e.target.value)}
                  placeholder="Optional note (e.g. portion size, special prep)"
                  className="w-full bg-cream/50 border border-ink/10 rounded-2xl px-4 py-2.5 font-bn text-sm focus:outline-none focus:border-accent/60"
                />
                <button
                  onClick={submitPhoto}
                  disabled={busy}
                  className="w-full px-5 py-3 bg-accent text-white rounded-2xl font-bn font-black flex items-center justify-center gap-2 hover:bg-ink transition-all disabled:opacity-40"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={16} />}
                  {busy ? 'Analyzing photo…' : 'Identify & log meal'}
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
            className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="font-display font-black text-ink flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                Logged · {lastResult.total_calories} kcal
              </div>
              <button
                onClick={() => setLastResult(null)}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's logs list */}
      {todayLogs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-body text-[0.65rem] uppercase tracking-widest text-ink-faint font-bold">
              Today's logs · {todayLogs.length}
            </div>
            {loadingLogs && <Loader2 className="w-3 h-3 animate-spin text-ink-faint" />}
          </div>
          <div className="space-y-1.5">
            {todayLogs.map((log) => {
              const slotMeta = SLOT_OPTIONS.find((s) => s.value === log.meal_slot);
              const Icon = slotMeta?.icon || Utensils;
              const time = new Date(log.logged_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 bg-cream/40 hover:bg-cream/70 transition-colors p-3 rounded-2xl border border-ink/5"
                >
                  <div className="w-8 h-8 rounded-xl bg-white border border-ink/5 flex items-center justify-center text-ink-muted shrink-0">
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bn text-sm font-bold text-ink truncate">{log.input_text}</div>
                    <div className="text-[0.6rem] uppercase tracking-widest font-body font-bold text-ink-faint">
                      {(log.meal_slot || 'snack')} · {time}
                    </div>
                  </div>
                  <div className="font-display font-black text-ink shrink-0">
                    {log.total_calories}
                    <span className="text-[0.6rem] text-ink-faint font-body ml-1">kcal</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
