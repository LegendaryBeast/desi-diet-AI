import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { listUsers, AdminUser } from '../api';
import { DataTable } from '../components/DataTable';
import { TierBadge } from '../components/TierBadge';
import { StatusBadge } from '../components/StatusBadge';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listUsers({ search: search || undefined, tier: tierFilter || undefined, skip, limit });
      setUsers(res.data);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, tierFilter, skip, limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const columns = [
    { key: 'name', header: 'User', render: (u: AdminUser) => (
      <div>
        <p className="font-medium text-white">{u.name_en || u.name_bn || '—'}</p>
        <p className="text-slate-500 text-xs">{u.phone || u.email || u.id.slice(0, 8)}</p>
      </div>
    )},
    { key: 'tier', header: 'Plan', render: (u: AdminUser) => <TierBadge tier={u.tier} /> },
    { key: 'subscription_status', header: 'Status', render: (u: AdminUser) => u.subscription_status ? <StatusBadge status={u.subscription_status} /> : <span className="text-slate-500 text-xs">—</span> },
    { key: 'total_tokens_used', header: 'Tokens Used', render: (u: AdminUser) => u.total_tokens_used.toLocaleString() },
    { key: 'created_at', header: 'Joined', render: (u: AdminUser) => u.created_at ? new Date(u.created_at).toLocaleDateString() : '—' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-slate-500 text-sm mt-1">Manage and monitor all users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSkip(0); }}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => { setTierFilter(e.target.value); setSkip(0); }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Tiers</option>
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          onRowClick={(u) => navigate(`/business-dashboard/users/${u.id}`)}
          pagination={{ skip, limit, total, onPageChange: setSkip }}
        />
      )}
    </div>
  );
};
