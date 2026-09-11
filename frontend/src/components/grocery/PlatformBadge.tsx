import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Store, MousePointerClick, Sprout, Package, ShoppingCart, type LucideIcon } from 'lucide-react';

export interface PlatformInfo {
  id: string;
  name: string;
  name_bn: string;
  color: string;
  bg: string;
  icon: LucideIcon;
  emoji: string;
}

export const PLATFORMS: Record<string, PlatformInfo> = {
  chaldal: {
    id: 'chaldal',
    name: 'Chaldal',
    name_bn: 'চালডাল',
    color: '#16a34a',
    bg: '#dcfce7',
    icon: Leaf,
    emoji: '',
  },
  shwapno: {
    id: 'shwapno',
    name: 'Shwapno',
    name_bn: 'স্বপ্ন',
    color: '#ea580c',
    bg: '#ffedd5',
    icon: Store,
    emoji: '',
  },
  meenaclick: {
    id: 'meenaclick',
    name: 'Meena Click',
    name_bn: 'মীনা ক্লিক',
    color: '#db2777',
    bg: '#fce7f3',
    icon: MousePointerClick,
    emoji: '',
  },
  khaasfood: {
    id: 'khaasfood',
    name: 'Khaas Food',
    name_bn: 'খাস ফুড',
    color: '#65a30d',
    bg: '#ecfccb',
    icon: Sprout,
    emoji: '',
  },
  daraz: {
    id: 'daraz',
    name: 'Daraz',
    name_bn: 'দারাজ',
    color: '#f97316',
    bg: '#ffedd5',
    icon: Package,
    emoji: '',
  },
};

export const PlatformIcon: React.FC<{ platformId: string; size?: number; className?: string }> = ({
  platformId,
  size = 14,
  className = '',
}) => {
  const p = PLATFORMS[platformId.toLowerCase()];
  const IconComp = p?.icon || ShoppingCart;
  return <IconComp size={size} className={className} />;
};

interface PlatformBadgeProps {
  platformId: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  isBn?: boolean;
  className?: string;
}

export const PlatformBadge = ({
  platformId,
  size = 'md',
  showName = true,
  isBn = false,
  className = '',
}: PlatformBadgeProps) => {
  const p = PLATFORMS[platformId.toLowerCase()];
  if (!p) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 font-bold ${size === 'sm' ? 'text-[0.55rem] px-1.5 py-0.5' : size === 'lg' ? 'text-sm px-3 py-1.5' : 'text-[0.65rem] px-2 py-1'} ${className}`}>
        <ShoppingCart size={size === 'sm' ? 10 : size === 'lg' ? 16 : 12} />
        {platformId}
      </span>
    );
  }

  const sizeClasses = {
    sm: 'text-[0.55rem] px-1.5 py-0.5 gap-1',
    md: 'text-[0.65rem] px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 16,
  };

  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center rounded-full font-bold border transition-shadow hover:shadow-sm cursor-default ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: p.bg,
        color: p.color,
        borderColor: p.color + '30',
      }}
    >
      <PlatformIcon platformId={platformId} size={iconSizes[size]} />
      {showName && <span>{isBn ? p.name_bn : p.name}</span>}
    </motion.span>
  );
};

interface PlatformDotProps {
  platformId: string;
  size?: number;
  className?: string;
}

export const PlatformDot = ({ platformId, size = 20, className = '' }: PlatformDotProps) => {
  const p = PLATFORMS[platformId.toLowerCase()];
  if (!p) {
    return (
      <div
        className={`rounded-full bg-gray-400 flex items-center justify-center text-white font-black text-[10px] ${className}`}
        style={{ width: size, height: size }}
      >
        <ShoppingCart size={Math.round(size * 0.55)} />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shadow-sm border-2 border-white text-white ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: p.color,
      }}
      title={p.name}
    >
      <PlatformIcon platformId={platformId} size={Math.max(10, Math.round(size * 0.55))} />
    </div>
  );
};

export const getPlatformColor = (platformId: string): string => {
  return PLATFORMS[platformId.toLowerCase()]?.color || '#666';
};

export const getPlatformEmoji = (platformId: string): string => {
  return PLATFORMS[platformId.toLowerCase()]?.name || 'Store';
};

export const getPlatformName = (platformId: string, isBn = false): string => {
  const p = PLATFORMS[platformId.toLowerCase()];
  if (!p) return platformId;
  return isBn ? p.name_bn : p.name;
};
