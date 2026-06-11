import React, { useEffect, useState } from 'react';
import { getAccessLogs, listPlans, updatePlan, SubscriptionPlan } from '../api';
import { DataTable } from '../components/DataTable';
import { Shield, Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<Partial<SubscriptionPlan>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getAccessLogs({ limit: 20 }), listPlans()])
      .then(([l, p]: [any, SubscriptionPlan[]]) => {
        setLogs(l.data);
        setPlans(p);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan.id);
    setPlanForm({ ...plan });
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    setSaving(true);
    try {
      await updatePlan(editingPlan, planForm);
      const updated = await listPlans();
      setPlans(updated);
      setEditingPlan(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const logColumns = [
    { key: 'accessed_at', header: 'Time', render: (l: any) => <span className="text-slate-400 text-xs">{l.accessed_at ? new Date(l.accessed_at).toLocaleString() : '—'}</span> },
    { key: 'ip_address', header: 'IP', render: (l: any) => <span className="text-slate-300 text-xs">{l.ip_address || '—'}</span> },
    { key: 'success', header: 'Result', render: (l: any) => (
      l.success
        ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-900/40 text-emerald-300 border border-emerald-800">Success</span>
        : <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-900/40 text-rose-300 border border-rose-800">Failed</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Plans, security, and access logs</p>
      </div>

      {/* Plans Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Subscription Plans</h3>
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="border border-slate-700 rounded-lg p-4">
              {editingPlan === plan.id ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-500 text-xs uppercase font-semibold">Monthly Price (৳)</label>
                    <input
                      type="number"
                      value={planForm.price_monthly_bdt || 0}
                      onChange={(e) => setPlanForm({ ...planForm, price_monthly_bdt: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs uppercase font-semibold">Yearly Price (৳)</label>
                    <input
                      type="number"
                      value={planForm.price_yearly_bdt || 0}
                      onChange={(e) => setPlanForm({ ...planForm, price_yearly_bdt: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs uppercase font-semibold">AI Token Quota</label>
                    <input
                      type="number"
                      value={planForm.ai_token_quota || 0}
                      onChange={(e) => setPlanForm({ ...planForm, ai_token_quota: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-2">
                    <button
                      onClick={() => setEditingPlan(null)}
                      className="px-4 py-2 rounded-lg text-slate-300 text-sm hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePlan}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Save size={14} />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">{plan.name}</span>
                      <span className="text-slate-500 text-xs capitalize">({plan.tier})</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                      ৳{plan.price_monthly_bdt}/mo · ৳{plan.price_yearly_bdt}/yr · {plan.ai_token_quota.toLocaleString()} tokens
                    </p>
                  </div>
                  <button
                    onClick={() => handleEditPlan(plan)}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Access Logs */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-slate-400" />
          <h3 className="text-white font-semibold text-sm">Admin Access Logs</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DataTable
            columns={logColumns}
            data={logs}
            keyExtractor={(l) => l.id}
            emptyMessage="No access logs yet"
          />
        )}
      </div>
    </div>
  );
};
