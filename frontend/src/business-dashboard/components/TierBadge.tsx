import React from 'react';

const tierStyles: Record<string, string> = {
  free: 'bg-slate-700 text-slate-300 border-slate-600',
  basic: 'bg-blue-900/40 text-blue-300 border-blue-800',
  pro: 'bg-amber-900/40 text-amber-300 border-amber-800',
  premium: 'bg-purple-900/40 text-purple-300 border-purple-800',
};

interface TierBadgeProps {
  tier: string;
}

export const TierBadge: React.FC<TierBadgeProps> = ({ tier }) => {
  const style = tierStyles[tier.toLowerCase()] || tierStyles.free;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${style}`}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
};
