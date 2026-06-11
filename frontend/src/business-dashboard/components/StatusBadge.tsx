import React from 'react';

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-900/40 text-emerald-300 border-emerald-800',
  trial: 'bg-sky-900/40 text-sky-300 border-sky-800',
  cancelled: 'bg-rose-900/40 text-rose-300 border-rose-800',
  expired: 'bg-slate-700 text-slate-300 border-slate-600',
  past_due: 'bg-amber-900/40 text-amber-300 border-amber-800',
  inactive: 'bg-slate-700 text-slate-300 border-slate-600',
  churned: 'bg-rose-900/40 text-rose-300 border-rose-800',
};

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const style = statusStyles[status.toLowerCase()] || statusStyles.inactive;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${style}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
