import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Zap, ShoppingCart } from 'lucide-react';
import { getUserDetail, UserDetail, updateUserTier, listPlans } from '../api';
import { TierBadge } from '../components/TierBadge';
import { StatusBadge } from '../components/StatusBadge';
import { ChartCard } from '../components/ChartCard';
import { DataTable } from '../components/DataTable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [plans, setPlans] = useState<Array<{ tier: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getUserDetail(id), listPlans()])
      .then(([u, p]) => {
        setUser(u);
        setPlans(p);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleTierChange = async (tier: string) => {
    if (!id) return;
    setUpdating(true);
    try {
      await updateUserTier(id, tier);
      const updated = await getUserDetail(id);
      setUser(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">User not found</p>
        <button
          onClick={() => navigate('/business-dashboard/users')}
          className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm"
        >
          Back to Users
        </button>
      </div>
    );
  }

  const tokenChartData = user.recent_token_usages.map((t) => ({
    date: t.date ? new Date(t.date).toLocaleDateString() : '—',
    tokens: t.total_tokens,
  }));

  const groceryColumns = [
    { key: 'item_name', header: 'Item' },
    { key: 'platform', header: 'Platform' },
    { key: 'price_bdt', header: 'Price (৳)', render: (g: any) => g.price_bdt ?? '—' },
    { key: 'clicked_at', header: 'Clicked', render: (g: any) => g.clicked_at ? new Date(g.clicked_at).toLocaleString() : '—' },
    { key: 'purchased', header: 'Purchased?', render: (g: any) => g.purchased_at ? <span className="text-emerald-400 text-xs font-semibold">Yes</span> : <span className="text-slate-500 text-xs">No</span> },
  ];

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/business-dashboard/users')}
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Users
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{user.profile?.name_en || user.profile?.name_bn || 'User'}</h1>
          <p className="text-slate-500 text-sm mt-1">{user.phone} · {user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm">Change tier:</span>
          <select
            value={user.subscriptions[0]?.tier || 'free'}
            onChange={(e) => handleTierChange(e.target.value)}
            disabled={updating}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          >
            {plans.map((p) => (
              <option key={p.tier} value={p.tier}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <CreditCard size={18} className="text-indigo-400" />
            <span className="text-slate-400 text-xs font-semibold uppercase">Subscription</span>
          </div>
          {user.subscriptions[0] ? (
            <div className="space-y-2">
              <TierBadge tier={user.subscriptions[0].tier || 'free'} />
              <StatusBadge status={user.subscriptions[0].status} />
              <p className="text-slate-400 text-xs mt-2">MRR: ৳{user.subscriptions[0].mrr_bdt}</p>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No active subscription</p>
          )}
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Zap size={18} className="text-amber-400" />
            <span className="text-slate-400 text-xs font-semibold uppercase">Token Usage</span>
          </div>
          <p className="text-white text-2xl font-bold">{user.total_tokens_used.toLocaleString()}</p>
          <p className="text-slate-500 text-xs mt-1">Total tokens consumed</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <ShoppingCart size={18} className="text-emerald-400" />
            <span className="text-slate-400 text-xs font-semibold uppercase">Grocery Clicks</span>
          </div>
          <p className="text-white text-2xl font-bold">{user.grocery_suggestions.length}</p>
          <p className="text-slate-500 text-xs mt-1">Tracked suggestions</p>
        </div>
      </div>

      {/* Profile Details */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Profile</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Age', value: user.profile?.age || '—' },
            { label: 'Gender', value: user.profile?.gender || '—' },
            { label: 'Weight', value: user.profile?.weight_kg ? `${user.profile.weight_kg} kg` : '—' },
            { label: 'Height', value: user.profile?.height_cm ? `${user.profile.height_cm} cm` : '—' },
            { label: 'Activity', value: user.profile?.activity_level || '—' },
            { label: 'Goal', value: user.profile?.goal || '—' },
            { label: 'Language', value: user.language },
            { label: 'Joined', value: user.created_at ? new Date(user.created_at).toLocaleDateString() : '—' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-slate-500 text-xs uppercase font-semibold">{item.label}</p>
              <p className="text-slate-200 text-sm mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Token Usage Chart */}
      {tokenChartData.length > 0 && (
        <ChartCard title="Recent Token Usage" subtitle="Last 30 days">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tokenChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
              />
              <Bar dataKey="tokens" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Grocery Suggestions */}
      <div>
        <h3 className="text-white font-semibold text-sm mb-3">Grocery Suggestion History</h3>
        <DataTable
          columns={groceryColumns}
          data={user.grocery_suggestions}
          keyExtractor={(g) => g.id}
          emptyMessage="No grocery suggestions tracked yet"
        />
      </div>
    </div>
  );
};
