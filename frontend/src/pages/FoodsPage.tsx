import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Apple,
  Shield,
  AlertTriangle,
  XCircle,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  foodsApi,
  type FoodWithInsightResponse,
  type SafeFoodsResponse,
  type FoodDetailResponse,
} from '../lib/api';

type Tab = 'search' | 'safe';

export const FoodsPage = () => {
  const { i18n } = useTranslation();
  const isBn = i18n.language === 'bn';

  const safetyConfig = {
    safe: { label: isBn ? 'নিরাপদ' : 'Safe', icon: Shield, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
    caution: { label: isBn ? 'সতর্কতা' : 'Caution', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    avoid: { label: isBn ? 'এড়িয়ে চলুন' : 'Avoid', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
  };

  const [tab, setTab] = useState<Tab>('safe');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodWithInsightResponse[]>([]);
  const [safeFoods, setSafeFoods] = useState<SafeFoodsResponse[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodDetailResponse | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [safeFoodsLoading, setSafeFoodsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSafeFoods = useCallback(async () => {
    setSafeFoodsLoading(true);
    setError(null);
    try {
      const data = await foodsApi.safeFoods();
      setSafeFoods(data);
    } catch {
      setError(isBn ? 'নিরাপদ খাবার লোড করতে সমস্যা হয়েছে' : 'Failed to load safe foods');
    } finally {
      setSafeFoodsLoading(false);
    }
  }, [isBn]);

  useEffect(() => {
    if (tab === 'safe') fetchSafeFoods();
  }, [tab, fetchSafeFoods]);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setSearchResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await foodsApi.searchWithInsight(q);
      setSearchResults(data);
    } catch {
      setError(isBn ? 'অনুসন্ধান করতে সমস্যা হয়েছে' : 'Search failed');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [isBn]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === 'search') handleSearch(query);
    }, 600);
    return () => clearTimeout(timer);
  }, [query, tab, handleSearch]);

  const toggleDetail = async (code: string) => {
    if (expandedCode === code) { setExpandedCode(null); setSelectedFood(null); return; }
    setExpandedCode(code);
    try {
      const detail = await foodsApi.detail(code);
      setSelectedFood(detail);
    } catch {
      setSelectedFood(null);
    }
  };

  const renderFoodCard = (food: FoodWithInsightResponse | SafeFoodsResponse, showInsight: boolean) => {
    const safetyKey = 'safety' in food ? (food.safety as keyof typeof safetyConfig) : 'safe';
    const safety = safetyConfig[safetyKey] || safetyConfig.safe;
    const SafetyIcon = safety.icon;
    const isExpanded = expandedCode === food.code;
    const insight = 'ai_insight' in food ? food.ai_insight : null;

    const protein = food.protein || 0;
    const carbs = 'carbs' in food ? (food.carbs || 0) : 0;
    const fat = 'fat' in food ? (food.fat || 0) : 0;
    const total = protein + carbs + fat;
    const proteinPct = total > 0 ? Math.round((protein / total) * 100) : 0;
    const carbsPct = total > 0 ? Math.round((carbs / total) * 100) : 0;
    const fatPct = total > 0 ? Math.round((fat / total) * 100) : 0;

    return (
      <motion.div
        key={food.code}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-ink/5 hover:border-accent/15 transition-all shadow-sm overflow-hidden group"
      >
        <button
          onClick={() => toggleDetail(food.code)}
          className="w-full p-2.5 flex items-center gap-3 text-left"
        >
          {/* Food group icon */}
          <div className="w-8 h-8 bg-cream rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-ink group-hover:text-cream transition-colors">
            <Apple className="w-3.5 h-3.5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`${isBn ? 'font-bn' : ''} font-bold text-ink text-xs truncate`}>
                {isBn ? food.name_bn : (food.name_en || food.name_bn)}
              </span>
              <span className={`text-[0.55rem] font-bold px-1 rounded flex items-center gap-0.5 ${safety.bg} ${safety.color} flex-shrink-0`}>
                <SafetyIcon className="w-2.5 h-2.5" /> {safety.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className={`text-[0.68rem] text-ink-faint ${isBn ? 'font-body' : 'font-bn'} truncate max-w-[120px] sm:max-w-none`}>
                {isBn ? food.name_en : food.name_bn}
              </span>
            </div>
          </div>

          <div className={`text-right flex-shrink-0 ${isBn ? 'font-bn' : ''}`}>
            <div className="font-bold text-ink text-xs">{food.calories ?? '?'} kcal</div>
            <div className="text-[0.55rem] text-ink-faint leading-none mt-0.5">
              {isBn ? '১০০ গ্রাম' : 'per 100g'}
            </div>
          </div>

          <div className="text-ink-faint ml-1">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {/* Expanded detail */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3.5 pb-3.5 space-y-3 border-t border-ink/5 pt-3">
                {/* Macros */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: isBn ? 'প্রোটিন' : 'Protein', val: food.protein ?? '--', color: 'text-emerald-600' },
                    { label: isBn ? 'শর্করা' : 'Carbs', val: 'carbs' in food ? (food.carbs ?? '--') : '--', color: 'text-blue-600' },
                    { label: isBn ? 'চর্বি' : 'Fat', val: 'fat' in food ? (food.fat ?? '--') : '--', color: 'text-amber-600' },
                    { label: isBn ? 'ফাইবার' : 'Fiber', val: food.fiber ?? '--', color: 'text-ink-muted' },
                  ].map((m, i) => (
                    <div key={i} className="bg-cream/30 p-2 rounded-lg text-center border border-ink/5">
                      <div className={`text-[0.52rem] text-ink-faint uppercase font-bold mb-0.5 ${isBn ? 'font-bn' : ''}`}>{m.label}</div>
                      <div className={`font-bold text-xs ${m.color}`}>{m.val}g</div>
                    </div>
                  ))}
                </div>

                {/* Segmented Macro Distribution Bar */}
                {total > 0 && (
                  <div className="space-y-1">
                    <div className={`flex justify-between items-center text-[0.58rem] ${isBn ? 'font-bn' : ''} text-ink-faint`}>
                      <span>{isBn ? 'পুষ্টির শতকরা ভাগ (Macro %)' : 'Macro Distribution (%)'}</span>
                      <span className="flex gap-2">
                        <span className="text-emerald-600">{isBn ? `প্রোটিন: ${proteinPct}%` : `Protein: ${proteinPct}%`}</span>
                        <span className="text-blue-600">{isBn ? `শর্করা: ${carbsPct}%` : `Carbs: ${carbsPct}%`}</span>
                        <span className="text-amber-600">{isBn ? `চর্বি: ${fatPct}%` : `Fat: ${fatPct}%`}</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-cream">
                      {proteinPct > 0 && <div className="h-full bg-emerald-500" style={{ flexGrow: proteinPct }} />}
                      {carbsPct > 0 && <div className="h-full bg-blue-500" style={{ flexGrow: carbsPct }} />}
                      {fatPct > 0 && <div className="h-full bg-amber-500" style={{ flexGrow: fatPct }} />}
                    </div>
                  </div>
                )}

                {/* AI Insight */}
                {showInsight && insight && (
                  <div className="bg-gradient-to-r from-accent/5 to-transparent p-2.5 rounded-lg border border-accent/10">
                    <div className="flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                      <p className={`${isBn ? 'font-bn' : ''} text-xs text-ink leading-relaxed`}>{insight}</p>
                    </div>
                  </div>
                )}

                {/* Rules from detail */}
                {selectedFood?.code === food.code && selectedFood.rules.length > 0 && (
                  <div className="space-y-1.5">
                    {selectedFood.rules.map((rule, i) => (
                      <div key={i} className={`p-2 rounded-lg border text-xs ${isBn ? 'font-bn' : ''} ${
                        rule.action === 'AVOID' ? 'bg-red-50/70 border-red-100 text-red-700' : 'bg-green-50/70 border-green-100 text-green-700'
                      }`}>
                        <span className="font-bold">
                          {rule.action === 'AVOID' ? (isBn ? '⚠️ এড়িয়ে চলুন' : '⚠️ Avoid') : (isBn ? '✅ পছন্দনীয়' : '✅ Recommended')}
                        </span>
                        {rule.condition && <span className="opacity-70"> ({rule.condition})</span>}: {rule.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <DashboardLayout
      title={isBn ? 'খাবারের তালিকা' : 'Food Database'}
      subtitle={isBn ? 'নিরাপদ ও পুষ্টিকর খাবারের তালিকা' : 'Explore safe foods and clinical nutrient insights'}
    >
      <div className="max-w-3xl w-full mx-auto pb-6 space-y-4">
        {/* Tab */}
        <div className="flex justify-center">
          <div className="flex bg-white p-1 rounded-xl border border-ink/5 shadow-sm gap-0.5">
            {[
              { id: 'safe' as Tab, label: isBn ? 'নিরাপদ খাবার' : 'Safe Foods', icon: Shield },
              { id: 'search' as Tab, label: isBn ? 'খাবার খুঁজুন' : 'Search Foods', icon: Search },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setTab(id); setQuery(''); setSearchResults([]); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${isBn ? 'font-bn' : ''} text-xs font-bold transition-all ${
                  tab === id ? 'bg-ink text-cream shadow-md' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        {tab === 'search' && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isBn ? 'খাবার খুঁজুন... যেমন: রুই মাছ, ডাল, আম' : 'Search foods... e.g., Rui fish, lentils, mango'}
              className={`w-full bg-white border border-ink/10 rounded-lg py-2 pl-9 pr-3 ${isBn ? 'font-bn' : ''} text-xs focus:border-accent/30 outline-none transition-all shadow-sm`}
              autoFocus
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-accent" />}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={`flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg text-red-500 ${isBn ? 'font-bn' : ''} text-xs`}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {tab === 'safe' && (
            <motion.div key="safe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {safeFoodsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  <p className={`${isBn ? 'font-bn' : ''} text-xs text-ink-muted`}>
                    {isBn ? 'আপনার অবস্থার জন্য নিরাপদ খাবার খুঁজছি...' : 'Finding safe foods for your health profile...'}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`${isBn ? 'font-bn' : ''} font-bold text-ink text-xs flex items-center gap-1.5`}>
                      <Shield className="w-4 h-4 text-green-500" />
                      {isBn ? `আপনার জন্য নিরাপদ ${safeFoods.length}টি খাবার` : `${safeFoods.length} Safe Foods for You`}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {safeFoods.map((food) => renderFoodCard(food, false))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {tab === 'search' && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {query.length < 2 ? (
                <div className={`text-center py-12 text-ink-muted ${isBn ? 'font-bn' : ''} text-xs`}>
                  <Apple className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>{isBn ? 'খাবারের নাম লিখুন অনুসন্ধান করতে' : 'Type a food name to search'}</p>
                  <p className="opacity-60 mt-0.5">{isBn ? 'বাংলা বা ইংরেজি উভয়তে খুঁজতে পারেন' : 'You can search in both Bengali and English'}</p>
                </div>
              ) : searchResults.length === 0 && !loading ? (
                <div className={`text-center py-12 text-ink-muted ${isBn ? 'font-bn' : ''} text-xs`}>
                  <Search className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>{isBn ? `"${query}" এর জন্য কোনো ফলাফল পাওয়া যায়নি` : `No results found for "${query}"`}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((food) => renderFoodCard(food, true))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

