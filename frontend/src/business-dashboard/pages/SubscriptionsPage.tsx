import React, { useEffect, useState, useCallback } from 'react';
import { listSubscriptions, listPlans, AdminSubscription, SubscriptionPlan } from '../api';
import { DataTable } from '../components/DataTable';
import { TierBadge } from '../components/TierBadge';
import { StatusBadge } from '../components/StatusBadge';
import { ChartCard } from '../components/ChartCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

export const SubscriptionsPage: React.FC = () => {
  const [subs, setSubs] = useState<AdminSubscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(25);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subsRes, plansRes] = await Promise.all([
        listSubscriptions({ status: statusFilter || undefined, skip, limit }),
        listPlans(),
      ]);
      setSubs(subsRes.data);
      setTotal(subsRes.total);
      setPlans(plansRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, skip, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const planCounts = plans.map((p) => ({
    name: p.name,
    count: subs.filter((s) => s.tier === p.tier).length,
    mrr: subs.filter((s) => s.tier === p.tier).reduce((sum, s) => sum + s.mrr_bdt, 0),
  }));

  const columns = [
    { key: 'user', header: 'User', render: (s: AdminSubscription) => (
      <div>
        <p className="font-medium text-white">{s.user_phone || s.user_email || '—'}</p>
        <p className="text-slate-500 text-xs">{s.user_id.slice(0, 8)}</p>
      </div>
    )},
    { key: 'plan', header: 'Plan', render: (s: AdminSubscription) => <TierBadge tier={s.tier || 'free'} /> },
    { key: 'status', header: 'Status', render: (s: AdminSubscription) => <StatusBadge status={s.status} /> },
    { key: 'mrr', header: 'MRR', render: (s: AdminSubscription) => <span className="text-white text-sm">৳{s.mrr_bdt}</span> },
    { key: 'payment', header: 'Payment', render: (s: AdminSubscription) => <span className="text-slate-400 text-xs capitalize">{s.payment_method || '—'}</span> },
    { key: 'period_end', header: 'Renews', render: (s: AdminSubscription) => (
      <span className="text-slate-400 text-xs">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '—'}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <p className="text-slate-500 text-sm mt-1">Plans, revenue, and subscription lifecycle</p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const count = subs.filter((s) => s.tier === plan.tier).length;
          const mrr = subs.filter((s) => s.tier === plan.tier).reduce((sum, s) => sum + s.mrr_bdt, 0);
          return (
            <div key={plan.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <TierBadge tier={plan.tier} />
                <span className="text-white font-bold">৳{plan.price_monthly_bdt}<span className="text-slate-500 text-xs font-normal">/mo</span></span>
              </div>
              <p className="text-2xl font-bold text-white mt-2">{count}</p>
              <p className="text-slate-500 text-xs">subscribers</p>
              <p className="text-emerald-400 text-xs font-semibold mt-1">৳{mrr.toLocaleString()} MRR</p>
              <div className="mt-3 space-y-1">
                {plan.features.slice(0, 3).map((f, i) => (
                  <p key={i} className="text-slate-400 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-indigo-400" />
                    {f}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="MRR by Plan" subtitle="Monthly recurring revenue">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={planCounts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
              />
              <Bar dataKey="mrr" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Subscribers by Plan" subtitle="Active subscription count">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={planCounts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Filter + Table */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setSkip(0); }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
          <option value="past_due">Past Due</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={subs}
          keyExtractor={(s) => s.id}
          pagination={{ skip, limit, total, onPageChange: setSkip }}
        />
      )}
    </div>
  );
};
