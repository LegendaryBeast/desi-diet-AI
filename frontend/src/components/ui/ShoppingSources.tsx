import React, { useMemo } from 'react';

/**
 * Bangladeshi grocery/food brands with inline SVG-style logos.
 * Each entry has a name, primary color, and a small round logo-like element.
 */
interface ShoppingSource {
  name: string;
  nameBn: string;
  color: string;
  bgColor: string;
  borderColor: string;
  /** Two-letter abbreviation for the mini logo */
  abbr: string;
  /** Full brand logo color for the circle */
  logoGradient: string;
}

const SOURCES: ShoppingSource[] = [
  {
    name: 'Shwapno',
    nameBn: 'স্বপ্ন',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    abbr: 'SW',
    logoGradient: 'from-orange-500 to-red-500',
  },
  {
    name: 'Chaldal',
    nameBn: 'চালডাল',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    abbr: 'CD',
    logoGradient: 'from-green-500 to-emerald-600',
  },
  {
    name: 'Pran',
    nameBn: 'প্রাণ',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    abbr: 'PR',
    logoGradient: 'from-red-500 to-rose-600',
  },
  {
    name: 'Foodpanda',
    nameBn: 'ফুডপান্ডা',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    abbr: 'FP',
    logoGradient: 'from-pink-500 to-rose-500',
  },
  {
    name: 'Gorerbazarbd',
    nameBn: 'ঘরের বাজার',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    abbr: 'GB',
    logoGradient: 'from-blue-500 to-indigo-600',
  },
  {
    name: 'Meena Bazaar',
    nameBn: 'মীনা বাজার',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    abbr: 'MB',
    logoGradient: 'from-emerald-500 to-teal-600',
  },
];

/**
 * Deterministic random selection based on a string seed.
 * Uses a simple hash to ensure the same food always shows the same sources.
 */
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getSourcesForFood(foodName: string, count: number = 3): ShoppingSource[] {
  const hash = hashString(foodName);
  const shuffled = [...SOURCES].sort((a, b) => {
    const ha = hashString(foodName + a.name);
    const hb = hashString(foodName + b.name);
    return ha - hb;
  });
  return shuffled.slice(0, Math.min(count, SOURCES.length));
}

interface ShoppingSourcesProps {
  /** Food name used as seed for deterministic random source selection */
  foodName: string;
  /** Number of sources to show (2-3) */
  count?: number;
  /** Compact mode for tighter layouts */
  compact?: boolean;
}

export const ShoppingSources: React.FC<ShoppingSourcesProps> = ({
  foodName,
  count = 3,
  compact = false,
}) => {
  const sources = useMemo(() => getSourcesForFood(foodName, count), [foodName, count]);

  if (compact) {
    return (
      <div className="flex items-center gap-1 mt-1.5">
        <span className="text-[0.55rem] text-ink-faint font-bold uppercase tracking-wider mr-0.5">
          পাওয়া যাবে:
        </span>
        <div className="flex -space-x-1.5">
          {sources.map((src) => (
            <div
              key={src.name}
              title={`${src.nameBn} (${src.name})`}
              className={`w-5 h-5 rounded-full bg-gradient-to-br ${src.logoGradient} flex items-center justify-center border-2 border-white shadow-sm cursor-default`}
            >
              <span className="text-[0.35rem] font-black text-white leading-none">
                {src.abbr}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      <span className="text-[0.58rem] text-ink-faint font-bold uppercase tracking-wider">
        কিনুন:
      </span>
      {sources.map((src) => (
        <div
          key={src.name}
          title={src.name}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${src.bgColor} border ${src.borderColor} cursor-default hover:shadow-sm transition-shadow`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-gradient-to-br ${src.logoGradient} flex items-center justify-center shrink-0`}
          >
            <span className="text-[0.35rem] font-black text-white leading-none">
              {src.abbr}
            </span>
          </div>
          <span className={`text-[0.58rem] font-bold ${src.color}`}>
            {src.nameBn}
          </span>
        </div>
      ))}
    </div>
  );
};
