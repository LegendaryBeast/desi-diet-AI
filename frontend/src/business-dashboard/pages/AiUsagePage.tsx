import React, { useEffect, useState } from 'react';
import { getAiUsage, getTokenUsage } from '../api';
import { ChartCard } from '../components/ChartCard';
import { DataTable } from '../components/DataTable';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export const AiUsagePage: React.FC = () => {
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [tokenUsage, setTokenUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAiUsage(30), getTokenUsage({ days: 30 })])
      .then(([ai, tokens]) => {
        setAiUsage(ai);
        setTokenUsage(tokens);
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
  const featureData = tokenUsage?.by_feature
    ? Object.entries(tokenUsage.by_feature).map(([name, stats]: [string, any]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        tokens: stats.tokens,
        cost: stats.cost_usd,
      }))
    : [];

  const topUsers = tokenUsage?.top_users?.slice(0, 10) || [];

  const userColumns = [
    { key: 'phone', header: 'User', render: (u: any) => <span className="text-slate-200 text-sm">{u.phone || u.email || '—'}</span> },
    { key: 'tokens', header: 'Tokens Used', render: (u: any) => <span className="text-white font-medium">{u.tokens.toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Usage</h1>
        <p className="text-slate-500 text-sm mt-1">Token consumption and cost analytics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400 text-xs font-semibold uppercase">Total Tokens (30d)</p>
          <p className="text-2xl font-bold text-white mt-1">{tokenUsage?.total_tokens?.toLocaleString() || '0'}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400 text-xs font-semibold uppercase">Est. Cost (30d)</p>
          <p className="text-2xl font-bold text-white mt-1">${tokenUsage?.total_cost_usd?.toFixed(4) || '0'}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400 text-xs font-semibold uppercase">Top Feature</p>
          <p className="text-2xl font-bold text-white mt-1">
            {featureData.length > 0
              ? featureData.reduce((a, b) => (a.tokens > b.tokens ? a : b)).name
              : '—'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Daily Token Usage" subtitle="Last 30 days">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorAiTokens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={(v) => v?.slice(5) || ''} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
              />
              <Area type="monotone" dataKey="tokens" stroke="#6366f1" fillOpacity={1} fill="url(#colorAiTokens)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By Feature" subtitle="Token distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={featureData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="tokens"
              >
                {featureData.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {featureData.map((entry: any, index: number) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs text-slate-400">{entry.name}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Top Users */}
      <div>
        <h3 className="text-white font-semibold text-sm mb-3">Top Users by Token Usage</h3>
        <DataTable
          columns={userColumns}
          data={topUsers}
          keyExtractor={(u: any) => u.phone || u.email || Math.random().toString()}
          emptyMessage="No token usage data yet"
        />
      </div>
    </div>
  );
};
