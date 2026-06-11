import React, { useEffect, useState } from 'react';
import {
  Users, CreditCard, TrendingUp, Zap, ShoppingCart,
  Activity, ArrowUpRight
} from 'lucide-react';
import { KpiCard } from '../components/KpiCard';
import { ChartCard } from '../components/ChartCard';
import { getOverview, OverviewKPIs, getAiUsage } from '../api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'];

export const OverviewPage: React.FC = () => {
  const [kpi, setKpi] = useState<OverviewKPIs | null>(null);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOverview(), getAiUsage(30)])
      .then(([kpiData, aiData]) => {
        setKpi(kpiData);
        setAiUsage(aiData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const dailyData = aiUsage?.daily || [];
  const pieData = [
    { name: 'Chat', value: 45 },
    { name: 'Meal Plan', value: 30 },
    { name: 'Recipe', value: 15 },
    { name: 'Voice', value: 10 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Business performance at a glance</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Users"
          value={kpi?.total_users?.toLocaleString() || '0'}
          delta={kpi ? Math.round((kpi.new_users_7d / Math.max(kpi.total_users, 1)) * 100) : undefined}
          icon={<Users size={20} />}
          subtitle={`+${kpi?.new_users_7d || 0} this week`}
        />
        <KpiCard
          title="MRR"
          value={`৳${kpi?.mrr_bdt?.toLocaleString() || '0'}`}
          icon={<CreditCard size={20} />}
          subtitle={`${kpi?.active_subscriptions || 0} active subs`}
        />
        <KpiCard
          title="AI Tokens Today"
          value={kpi?.total_tokens_today?.toLocaleString() || '0'}
          icon={<Zap size={20} />}
          subtitle={`$${kpi?.total_cost_today_usd?.toFixed(4) || '0'} est. cost`}
        />
        <KpiCard
          title="Grocery Clicks"
          value={kpi?.grocery_clicks_today?.toLocaleString() || '0'}
          icon={<ShoppingCart size={20} />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="AI Token Usage (30d)" subtitle="Daily consumption" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={(v) => v?.slice(5) || ''} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
              />
              <Area type="monotone" dataKey="tokens" stroke="#6366f1" fillOpacity={1} fill="url(#colorTokens)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Usage by Feature" subtitle="Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-xs text-slate-400">{entry.name}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-900/30 flex items-center justify-center text-emerald-400">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase">Active Subscriptions</p>
              <p className="text-white text-lg font-bold">{kpi?.active_subscriptions || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-900/30 flex items-center justify-center text-rose-400">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase">Churn Rate</p>
              <p className="text-white text-lg font-bold">{kpi?.churn_rate_pct || 0}%</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-900/30 flex items-center justify-center text-sky-400">
              <ArrowUpRight size={18} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase">New Users (30d)</p>
              <p className="text-white text-lg font-bold">{kpi?.new_users_30d || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
