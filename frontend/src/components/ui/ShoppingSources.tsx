import React, { useMemo } from 'react';

/**
 * Bangladeshi grocery/food brands with custom inline vector SVG logos.
 * Each entry has a name, primary color, styling, and custom brand icon.
 */
export interface ShoppingSource {
  name: string;
  nameBn: string;
  color: string;
  bgColor: string;
  borderColor: string;
  abbr: string;
  logoGradient: string;
}

export const BrandLogo: React.FC<{ brand: string; className?: string }> = ({ brand, className = "w-3 h-3" }) => {
  switch (brand) {
    case 'Shwapno':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Shwapno sunburst / blooming petal identity */}
          <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
          <path d="M12 2.5C12 4.8 10.2 6.5 12 8C13.8 6.5 12 4.8 12 2.5Z" fill="#FFFFFF" />
          <path d="M12 21.5C12 19.2 10.2 17.5 12 16C13.8 17.5 12 19.2 12 21.5Z" fill="#FFFFFF" />
          <path d="M2.5 12C4.8 12 6.5 10.2 8 12C6.5 13.8 4.8 12 2.5 12Z" fill="#FFFFFF" />
          <path d="M21.5 12C19.2 12 17.5 10.2 16 12C17.5 13.8 19.2 12 21.5 12Z" fill="#FFFFFF" />
          <path d="M5.3 5.3C6.9 6.9 8 6.7 8.8 8.8C6.7 8 6.9 6.9 5.3 5.3Z" fill="#FFFFFF" />
          <path d="M18.7 18.7C17.1 17.1 16 17.3 15.2 15.2C17.3 16 17.1 17.1 18.7 18.7Z" fill="#FFFFFF" />
          <path d="M18.7 5.3C17.1 6.9 17.3 8 15.2 8.8C16 6.7 17.1 6.9 18.7 5.3Z" fill="#FFFFFF" />
          <path d="M5.3 18.7C6.9 17.1 6.7 16 8.8 15.2C8 17.3 6.9 17.1 5.3 18.7Z" fill="#FFFFFF" />
        </svg>
      );
    case 'Chaldal':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Chaldal grocery bag with fresh organic leaf */}
          <path d="M6.5 8.5C6.5 7.67 7.17 7 8 7H16C16.83 7 17.5 7.67 17.5 8.5L18.5 20C18.5 20.55 18.05 21 17.5 21H6.5C5.95 21 5.5 20.55 5.5 20L6.5 8.5Z" fill="#FFFFFF" />
          <path d="M9 7V5C9 3.34 10.34 2 12 2C13.66 2 15 3.34 15 5V7" stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 11.5L14 17.5H10L12 11.5Z" fill="#F59E0B" />
          <circle cx="12" cy="11.5" r="1.5" fill="#EF4444" />
        </svg>
      );
    case 'Foodpanda':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Foodpanda Panda Face */}
          <circle cx="6.5" cy="7" r="2.8" fill="#FFFFFF" />
          <circle cx="17.5" cy="7" r="2.8" fill="#FFFFFF" />
          <ellipse cx="12" cy="13.5" rx="7.5" ry="6.5" fill="#FFFFFF" />
          <ellipse cx="9" cy="12.5" rx="1.6" ry="2.2" transform="rotate(-15 9 12.5)" fill="#D60665" />
          <circle cx="9.2" cy="12" r="0.6" fill="#FFFFFF" />
          <ellipse cx="15" cy="12.5" rx="1.6" ry="2.2" transform="rotate(15 15 12.5)" fill="#D60665" />
          <circle cx="14.8" cy="12" r="0.6" fill="#FFFFFF" />
          <ellipse cx="12" cy="15.3" rx="1.2" ry="0.8" fill="#D60665" />
          <path d="M11 16.8C11.5 17.3 12.5 17.3 13 16.8" stroke="#D60665" strokeWidth="1" strokeLinecap="round" />
        </svg>
      );
    case 'Gorerbazarbd':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Ghorer Bazar: Traditional Bangla "ঘর" house with green leaf purity motif */}
          <path d="M12 2.5L3.5 9V10.5H20.5V9L12 2.5Z" fill="#FFFFFF" />
          <path d="M5.5 10.5V20.5H18.5V10.5H5.5Z" fill="#FFFFFF" fillOpacity="0.9" />
          <path d="M10 20.5V14H14V20.5H10Z" fill="#2563EB" />
          <circle cx="12" cy="7" r="2" fill="#10B981" />
        </svg>
      );
    case 'Meena Bazaar':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Meena Bazaar crown & market basket motif */}
          <ellipse cx="12" cy="13" rx="7" ry="5.5" fill="#FFFFFF" />
          <path d="M8 8L12 4L16 8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12.5" r="2.2" fill="#0D9488" />
          <path d="M7 17.5C9.5 19 14.5 19 17 17.5" stroke="#042F2E" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'Pran':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Pran classic radiant heart of vitality */}
          <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" fill="#FFFFFF" />
          <circle cx="12" cy="9.5" r="3" fill="#FACC15" />
          <path d="M12 7V12" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'Khaas Food':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Khaas organic food seed & wheat sprout */}
          <path d="M12 2C12 7 7 11 7 16C7 18.76 9.24 21 12 21C14.76 21 17 18.76 17 16C17 11 12 2 12 2Z" fill="#FFFFFF" />
          <path d="M12 6.5V18" stroke="#15803D" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 11C13.5 9.5 15 10 15 10" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 14C10.5 12.5 9 13 9 13" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="8" fill="#FFFFFF" />
          <path d="M9 12L11.5 14.5L15 9.5" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
};

const SOURCES: ShoppingSource[] = [
  {
    name: 'Shwapno',
    nameBn: 'স্বপ্ন',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    abbr: 'SW',
    logoGradient: 'from-orange-500 to-red-600',
  },
  {
    name: 'Chaldal',
    nameBn: 'চালডাল',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    abbr: 'CD',
    logoGradient: 'from-emerald-500 to-green-600',
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
    logoGradient: 'from-pink-500 to-rose-600',
  },
  {
    name: 'Gorerbazarbd',
    nameBn: 'ঘরের বাজার',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    abbr: 'GB',
    logoGradient: 'from-blue-600 to-indigo-700',
  },
  {
    name: 'Meena Bazaar',
    nameBn: 'মীনা বাজার',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    abbr: 'MB',
    logoGradient: 'from-teal-500 to-emerald-700',
  },
  {
    name: 'Khaas Food',
    nameBn: 'খাস ফুড',
    color: 'text-green-800',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    abbr: 'KF',
    logoGradient: 'from-green-600 to-emerald-800',
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
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[0.55rem] text-ink-faint font-bold uppercase tracking-wider mr-0.5 font-bn">
          পাওয়া যাবে:
        </span>
        <div className="flex items-center -space-x-1">
          {sources.map((src) => (
            <div
              key={src.name}
              title={`${src.nameBn} (${src.name})`}
              className={`w-4.5 h-4.5 rounded-full bg-gradient-to-br ${src.logoGradient} flex items-center justify-center border-[1.5px] border-white shadow-sm cursor-pointer hover:scale-125 hover:z-10 transition-transform p-0.5`}
            >
              <BrandLogo brand={src.name} className="w-3 h-3 drop-shadow-xs" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      <span className="text-[0.58rem] text-ink-faint font-bold uppercase tracking-wider font-bn">
        কিনুন:
      </span>
      {sources.map((src) => (
        <div
          key={src.name}
          title={src.name}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${src.bgColor} border ${src.borderColor} cursor-pointer hover:shadow-sm hover:scale-105 transition-all`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-gradient-to-br ${src.logoGradient} flex items-center justify-center shrink-0 p-0.5 shadow-xs`}
          >
            <BrandLogo brand={src.name} className="w-2.5 h-2.5" />
          </div>
          <span className={`text-[0.58rem] font-bold ${src.color} font-bn`}>
            {src.nameBn}
          </span>
        </div>
      ))}
    </div>
  );
};
