import React, { useEffect, useState, useCallback } from 'react';
import { listGrocerySuggestions, GrocerySuggestionItem } from '../api';
import { DataTable } from '../components/DataTable';
import { ChartCard } from '../components/ChartCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export const GrocerySuggestionsPage: React.FC = () => {
  const [items, setItems] = useState<GrocerySuggestionItem[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, { clicks: number; purchases: number; revenue_potential: number }>>({});
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(25);
  const [platformFilter, setPlatformFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listGrocerySuggestions({ platform: platformFilter || undefined, days: 30, skip, limit });
      setItems(res.data);
      setTotal(res.total);
      setBreakdown(res.platform_breakdown);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [platformFilter, skip, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const platformData = Object.entries(breakdown).map(([name, stats]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    clicks: stats.clicks,
    purchases: stats.purchases,
    revenue: stats.revenue_potential,
  }));

  const columns = [
    { key: 'item_name', header: 'Item' },
    { key: 'platform', header: 'Platform', render: (g: GrocerySuggestionItem) => (
      <span className="text-slate-200 text-sm capitalize">{g.platform}</span>
    )},
    { key: 'price_bdt', header: 'Price (৳)', render: (g: GrocerySuggestionItem) => (
      <span className="text-white text-sm">{g.price_bdt?.toFixed(2) || '—'}</span>
    )},
    { key: 'clicked_at', header: 'Clicked', render: (g: GrocerySuggestionItem) => (
      <span className="text-slate-400 text-xs">{g.clicked_at ? new Date(g.clicked_at).toLocaleString() : '—'}</span>
    )},
    { key: 'purchased', header: 'Status', render: (g: GrocerySuggestionItem) => (
      g.purchased_at
        ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-900/40 text-emerald-300 border border-emerald-800">Purchased</span>
        : <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-700 text-slate-300 border border-slate-600">Clicked</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Grocery Suggestions</h1>
        <p className="text-slate-500 text-sm mt-1">Track which platforms users choose for grocery shopping</p>
      </div>

      {/* Platform Breakdown Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {platformData.map((p) => (
          <div key={p.name} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-semibold uppercase">{p.name}</p>
            <p className="text-xl font-bold text-white mt-1">{p.clicks} clicks</p>
            <p className="text-emerald-400 text-xs">{p.purchases} purchases</p>
            <p className="text-slate-500 text-xs mt-1">৳{p.revenue.toFixed(0)} potential</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Clicks by Platform" subtitle="Last 30 days">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={platformData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
              />
              <Bar dataKey="clicks" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Platform Share" subtitle="Click distribution">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={platformData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="clicks"
              >
                {platformData.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {platformData.map((entry: any, index: number) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs text-slate-400">{entry.name}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Filter + Table */}
      <div className="flex items-center gap-3">
        <select
          value={platformFilter}
          onChange={(e) => { setPlatformFilter(e.target.value); setSkip(0); }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Platforms</option>
          <option value="chaldal">Chaldal</option>
          <option value="kiksha">Kiksha</option>
          <option value="rokomari">Rokomari</option>
          <option value="daraz">Daraz</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          keyExtractor={(g) => g.id}
          pagination={{ skip, limit, total, onPageChange: setSkip }}
        />
      )}
    </div>
  );
};
