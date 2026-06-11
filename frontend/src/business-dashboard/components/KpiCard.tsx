import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: number;
  icon: React.ReactNode;
  subtitle?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, delta, icon, subtitle }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
          {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300">
          {icon}
        </div>
      </div>
      {delta !== undefined && (
        <div className="flex items-center gap-1 mt-3">
          {delta >= 0 ? (
            <TrendingUp size={14} className="text-emerald-400" />
          ) : (
            <TrendingDown size={14} className="text-rose-400" />
          )}
          <span className={`text-xs font-semibold ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
          <span className="text-slate-500 text-xs">vs last period</span>
        </div>
      )}
    </div>
  );
};
