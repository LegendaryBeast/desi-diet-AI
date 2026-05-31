import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat, Plus, Trash2, Search, Loader2, AlertCircle, X,
  Flame, Beef, Wheat, Droplets, ShieldCheck, ShieldAlert, Star,
  ArrowLeftRight, RefreshCw,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { mealBuilderApi, foodsApi, type MealBuilderItem, type MealBuilderAnalyzeResponse, type FoodSearchResponse } from '../lib/api';

const MEAL_SLOTS = [
  { id: 'breakfast', label: 'সকালের নাস্তা' },
  { id: 'lunch', label: 'দুপুরের খাবার' },
  { id: 'dinner', label: 'রাতের খাবার' },
  { id: 'snack', label: 'স্ন্যাক' },
];

interface MealItem extends MealBuilderItem {
  name_display: string;
}

export const MealBuilder = () => {
  const [mealSlot, setMealSlot] = useState('lunch');
  const [items, setItems] = useState<MealItem[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResponse[]>([]);
  const [searching, setSearching] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<MealBuilderAnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [swapTarget, setSwapTarget] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await foodsApi.search(searchQ.trim());
      setSearchResults(res);
    } catch {
      setError('খুঁজতে সমস্যা হয়েছে');
    } finally {
      setSearching(false);
    }
  }, [searchQ]);

  const addItem = (food: FoodSearchResponse) => {
    if (items.find(i => i.food_code === food.code)) return;
    setItems(prev => [...prev, { food_code: food.code, amount_g: 100, name_en: food.name_en, name_bn: food.name_bn, name_display: food.name_bn || food.name_en }]);
    setSearchResults([]);
    setSearchQ('');
    setResult(null);
  };

  const updateAmount = (code: string, val: number) =>
    setItems(prev => prev.map(i => i.food_code === code ? { ...i, amount_g: Math.max(1, val) } : i));

  const removeItem = (code: string) => {
    setItems(prev => prev.filter(i => i.food_code !== code));
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (items.length === 0) return;
    setAnalyzing(true); setError(null);
    try {
      const res = await mealBuilderApi.analyze({ meal_slot: mealSlot, items, language: 'bn' });
      setResult(res);
      setSwapTarget(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'বিশ্লেষণ করতে সমস্যা হয়েছে');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSwap = async (replacedCode: string, newFood: FoodSearchResponse) => {
    if (items.length === 0) return;
    setAnalyzing(true); setError(null);
    const replaced = items.find(i => i.food_code === replacedCode);
    try {
      const res = await mealBuilderApi.analyze({
        meal_slot: mealSlot,
        items: items.filter(i => i.food_code !== replacedCode).concat({ food_code: newFood.code, amount_g: replaced?.amount_g ?? 100, name_en: newFood.name_en, name_bn: newFood.name_bn, name_display: newFood.name_bn || newFood.name_en }),
        replaced_item: replaced,
        language: 'bn',
      });
      setResult(res);
      setSwapTarget(null);
      setItems(prev => prev.map(i => i.food_code === replacedCode ? { ...i, food_code: newFood.code, name_en: newFood.name_en, name_bn: newFood.name_bn, name_display: newFood.name_bn || newFood.name_en } : i));
    } catch {
      setError('সোয়াপ করতে সমস্যা হয়েছে');
    } finally {
      setAnalyzing(false);
    }
  };

  const scoreColor = (score: number) => score >= 8 ? 'text-emerald-600' : score >= 5 ? 'text-amber-500' : 'text-red-500';
  const scoreBg = (score: number) => score >= 8 ? 'bg-emerald-50 border-emerald-100' : score >= 5 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';

  return (
    <DashboardLayout title="মিল বিল্ডার" subtitle="Meal Builder — AI খাবার বিশ্লেষণ">
      <div className="max-w-3xl mx-auto space-y-4 pb-10">

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 font-bn text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Meal Slot */}
        <div className="bg-white rounded-2xl border border-ink/5 shadow-sm p-4">
          <label className="font-bn text-[0.65rem] font-bold text-ink-faint uppercase tracking-wider mb-2 block">মিল স্লট বেছে নিন</label>
          <div className="flex gap-2 flex-wrap">
            {MEAL_SLOTS.map(s => (
              <button key={s.id} onClick={() => setMealSlot(s.id)}
                className={`px-3 py-1.5 rounded-xl font-bn text-xs font-bold border transition-all ${mealSlot === s.id ? 'bg-ink text-cream border-ink' : 'border-ink/10 text-ink-muted hover:border-ink/30'}`}
              >{s.label}</button>
            ))}
          </div>
        </div>

        {/* Food Search */}
        <div className="bg-white rounded-2xl border border-ink/5 shadow-sm p-4 space-y-3">
          <h3 className="font-bn font-bold text-xs text-ink flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 text-accent" /> খাবার যোগ করুন
          </h3>
          <div className="flex gap-2">
            <input placeholder="খাবার খুঁজুন (যেমন: ভাত, ডাল, মুরগি)..."
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1 bg-cream/40 border border-ink/10 rounded-xl py-2 px-3 font-bn text-xs outline-none focus:border-accent/40"
            />
            <button onClick={handleSearch} disabled={searching}
              className="px-3 py-2 bg-ink text-cream rounded-xl font-bn font-bold text-xs flex items-center gap-1 hover:bg-accent transition-all disabled:opacity-60"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Search Results dropdown */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-1 max-h-48 overflow-y-auto"
              >
                {searchResults.map(food => (
                  <button key={food.code} onClick={() => swapTarget ? handleSwap(swapTarget, food) : addItem(food)}
                    className="w-full flex items-center justify-between p-2.5 bg-cream/50 hover:bg-cream rounded-xl text-left transition-all group"
                  >
                    <div>
                      <span className="font-bn font-bold text-xs text-ink">{food.name_bn || food.name_en}</span>
                      <span className="font-bn text-[0.6rem] text-ink-faint ml-2">{food.food_group}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[0.6rem] text-ink-muted">
                      <span className="flex items-center gap-0.5"><Flame className="w-2.5 h-2.5 text-orange-400" />{food.calories ?? '?'}</span>
                      <span className="flex items-center gap-0.5"><Beef className="w-2.5 h-2.5 text-blue-400" />{food.protein ?? '?'}g</span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Current Meal Items */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl border border-ink/5 shadow-sm p-4 space-y-3">
            <h3 className="font-bn font-bold text-xs text-ink flex items-center gap-2">
              <ChefHat className="w-3.5 h-3.5 text-accent" /> আপনার মিল ({items.length} টি খাবার)
            </h3>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.food_code} className="flex items-center gap-3 p-2.5 bg-cream/30 rounded-xl">
                  <span className="font-bn font-bold text-xs text-ink flex-1">{item.name_display}</span>
                  <div className="flex items-center gap-1.5">
                    <input type="number" min={1} value={item.amount_g}
                      onChange={e => updateAmount(item.food_code, parseInt(e.target.value) || 1)}
                      className="w-16 text-center bg-white border border-ink/10 rounded-lg py-1 px-2 font-mono text-xs outline-none"
                    />
                    <span className="text-[0.62rem] text-ink-faint">g</span>
                  </div>
                  <button onClick={() => { setSwapTarget(item.food_code); setSearchQ(''); setSearchResults([]); }}
                    className="p-1.5 rounded-lg text-ink-muted hover:text-blue-500 hover:bg-blue-50 transition-all" title="স্বাস্থ্যকর বিকল্প খুঁজুন"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                  <button onClick={() => removeItem(item.food_code)} className="p-1.5 rounded-lg text-ink-muted hover:text-red-500 hover:bg-red-50 transition-all">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {swapTarget && (
              <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <p className="font-bn text-[0.68rem] text-blue-600">উপরের সার্চ বারে বিকল্প খাবার খুঁজুন — বেছে নিলে তুলনামূলক বিশ্লেষণ দেখাবে</p>
                <button onClick={() => setSwapTarget(null)} className="ml-auto"><X className="w-3 h-3 text-blue-400" /></button>
              </div>
            )}

            <button onClick={handleAnalyze} disabled={analyzing || items.length === 0}
              className="w-full py-2.5 bg-ink text-cream rounded-xl font-bn font-bold text-xs flex items-center justify-center gap-2 hover:bg-accent transition-all disabled:opacity-60"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChefHat className="w-4 h-4" />}
              {analyzing ? 'AI বিশ্লেষণ করছে...' : 'মিল বিশ্লেষণ করুন'}
            </button>
          </div>
        )}

        {items.length === 0 && !result && (
          <div className="text-center py-16 bg-white rounded-2xl border border-ink/5">
            <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-15 text-ink" />
            <p className="font-bn font-bold text-ink-muted text-sm">খাবার যোগ করুন</p>
            <p className="font-bn text-xs text-ink-faint mt-1">উপরের সার্চ বার ব্যবহার করে আপনার মিলে খাবার যোগ করুন</p>
          </div>
        )}

        {/* Analysis Result */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* Score */}
            <div className={`rounded-2xl border p-4 ${scoreBg(result.meal_score.overall)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Star className={`w-4 h-4 ${scoreColor(result.meal_score.overall)}`} />
                  <span className="font-bn font-bold text-sm text-ink">মিল স্কোর</span>
                </div>
                <span className={`font-bold text-2xl ${scoreColor(result.meal_score.overall)}`}>{result.meal_score.overall}<span className="text-base text-ink-faint">/10</span></span>
              </div>
              <p className="font-bn text-xs text-ink-muted">{result.meal_score.label}</p>
            </div>

            {/* Macros */}
            <div className="bg-white rounded-2xl border border-ink/5 shadow-sm p-4">
              <h4 className="font-bn font-bold text-xs text-ink mb-3">পুষ্টি উপাদান</h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: Flame, label: 'ক্যালোরি', val: `${Math.round(result.total_calories)} kcal`, color: 'text-orange-500', bg: 'bg-orange-50' },
                  { icon: Beef, label: 'প্রোটিন', val: `${result.macros.protein_g.toFixed(1)}g`, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { icon: Wheat, label: 'কার্বস', val: `${result.macros.carbs_g.toFixed(1)}g`, color: 'text-amber-500', bg: 'bg-amber-50' },
                  { icon: Droplets, label: 'ফ্যাট', val: `${result.macros.fat_g.toFixed(1)}g`, color: 'text-pink-500', bg: 'bg-pink-50' },
                ].map(({ icon: Icon, label, val, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                    <Icon className={`w-3.5 h-3.5 ${color} mx-auto mb-1`} />
                    <div className="font-bold text-xs text-ink">{val}</div>
                    <div className="text-[0.55rem] text-ink-faint">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Condition safety */}
            <div className={`rounded-2xl border p-4 ${result.condition_safety.safe ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.condition_safety.safe
                  ? <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  : <ShieldAlert className="w-4 h-4 text-red-500" />}
                <span className={`font-bn font-bold text-xs ${result.condition_safety.safe ? 'text-emerald-700' : 'text-red-600'}`}>
                  {result.condition_safety.safe ? 'স্বাস্থ্য অবস্থার জন্য নিরাপদ' : 'সতর্কতা প্রয়োজন'}
                </span>
              </div>
              {result.condition_safety.flags.length > 0 && (
                <ul className="space-y-1">
                  {result.condition_safety.flags.map((f, i) => (
                    <li key={i} className="font-bn text-[0.68rem] text-red-600">• {f}</li>
                  ))}
                </ul>
              )}
              {result.condition_safety.note && <p className="font-bn text-[0.68rem] text-ink-muted mt-1 italic">{result.condition_safety.note}</p>}
            </div>

            {/* Comparison (swap result) */}
            {result.comparison && (
              <div className="bg-white rounded-2xl border border-ink/5 shadow-sm p-4 space-y-2">
                <h4 className="font-bn font-bold text-xs text-ink flex items-center gap-2">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" /> বিকল্প তুলনা
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-50 rounded-xl p-3">
                    <p className="font-bn text-[0.6rem] text-red-500 uppercase font-bold mb-1">আগে</p>
                    {Object.entries(result.comparison.before).map(([k, v]) => (
                      <p key={k} className="font-bn text-[0.68rem] text-ink">{k}: <strong>{typeof v === 'number' ? v.toFixed(1) : v}</strong></p>
                    ))}
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="font-bn text-[0.6rem] text-emerald-600 uppercase font-bold mb-1">পরে</p>
                    {Object.entries(result.comparison.after).map(([k, v]) => (
                      <p key={k} className="font-bn text-[0.68rem] text-ink">{k}: <strong>{typeof v === 'number' ? v.toFixed(1) : v}</strong></p>
                    ))}
                  </div>
                </div>
                <p className="font-bn text-[0.68rem] text-ink-muted italic">{result.comparison.verdict}</p>
              </div>
            )}

            {/* AI Insight */}
            {result.ai_insight && (
              <div className="bg-white rounded-2xl border border-ink/5 shadow-sm p-4">
                <h4 className="font-bn font-bold text-xs text-ink mb-2 flex items-center gap-1.5">
                  <ChefHat className="w-3.5 h-3.5 text-accent" /> AI পরামর্শ
                </h4>
                <p className="font-bn text-xs text-ink-muted leading-relaxed">{result.ai_insight}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};
