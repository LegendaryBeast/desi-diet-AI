import { motion } from 'framer-motion';

export interface PlatformInfo {
  id: string;
  name: string;
  name_bn: string;
  emoji: string;
  color: string;
  bg: string;
}

export const PLATFORMS: Record<string, PlatformInfo> = {
  chaldal: {
    id: 'chaldal',
    name: 'Chaldal',
    name_bn: 'চালডাল',
    emoji: '🥬',
    color: '#16a34a',
    bg: '#dcfce7',
  },
  shwapno: {
    id: 'shwapno',
    name: 'Shwapno',
    name_bn: 'স্বপ্ন',
    emoji: '🏪',
    color: '#ea580c',
    bg: '#ffedd5',
  },
  meenaclick: {
    id: 'meenaclick',
    name: 'Meena Click',
    name_bn: 'মীনা ক্লিক',
    emoji: '🖱️',
    color: '#db2777',
    bg: '#fce7f3',
  },
  khaasfood: {
    id: 'khaasfood',
    name: 'Khaas Food',
    name_bn: 'খাস ফুড',
    emoji: '🌿',
    color: '#65a30d',
    bg: '#ecfccb',
  },
  daraz: {
    id: 'daraz',
    name: 'Daraz',
    name_bn: 'দারাজ',
    emoji: '📦',
    color: '#f97316',
    bg: '#ffedd5',
  },
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
        {platformId}
      </span>
    );
  }

  const sizeClasses = {
    sm: 'text-[0.55rem] px-1.5 py-0.5 gap-1',
    md: 'text-[0.65rem] px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const emojiSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
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
      <span className={emojiSizes[size]}>{p.emoji}</span>
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
        ?
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shadow-sm border-2 border-white ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: p.color,
        fontSize: size * 0.55,
      }}
      title={p.name}
    >
      <span style={{ filter: 'grayscale(0.3)' }}>{p.emoji}</span>
    </div>
  );
};

export const getPlatformColor = (platformId: string): string => {
  return PLATFORMS[platformId.toLowerCase()]?.color || '#666';
};

export const getPlatformEmoji = (platformId: string): string => {
  return PLATFORMS[platformId.toLowerCase()]?.emoji || '🛒';
};

export const getPlatformName = (platformId: string, isBn = false): string => {
  const p = PLATFORMS[platformId.toLowerCase()];
  if (!p) return platformId;
  return isBn ? p.name_bn : p.name;
};
