import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, Zap, ShoppingCart,
  Settings, Shield, LogOut, Menu, X, ChevronLeft, ChevronRight,
  AlertTriangle, BarChart3, Store, Package, Apple, MapPin,
  TrendingDown, Wrench
} from 'lucide-react';
import { useAdminAuth } from './hooks/useAdminAuth';
import { OverviewPage } from './pages/OverviewPage';
import { UsersPage } from './pages/UsersPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { AiUsagePage } from './pages/AiUsagePage';
import { GrocerySuggestionsPage } from './pages/GrocerySuggestionsPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { SettingsPage } from './pages/SettingsPage';

const navItems = [
  { path: '/business-dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/business-dashboard/users', label: 'Users', icon: Users },
  { path: '/business-dashboard/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { path: '/business-dashboard/ai-usage', label: 'AI Usage', icon: Zap },
  { path: '/business-dashboard/grocery-suggestions', label: 'Grocery Suggestions', icon: ShoppingCart },
  { path: '/business-dashboard/brands', label: 'Brands', icon: Shield, comingSoon: true },
  { path: '/business-dashboard/stores', label: 'Stores', icon: Store, comingSoon: true },
  { path: '/business-dashboard/products', label: 'Products', icon: Package, comingSoon: true },
  { path: '/business-dashboard/food-types', label: 'Food Types', icon: Apple, comingSoon: true },
  { path: '/business-dashboard/analytics', label: 'Analytics', icon: BarChart3, comingSoon: true },
  { path: '/business-dashboard/churn', label: 'Churn', icon: TrendingDown, comingSoon: true },
  { path: '/business-dashboard/settings', label: 'Settings', icon: Wrench },
];

const AdminLogin: React.FC<{ onLogin: (pw: string) => void; error: string | null; loading: boolean }> = ({ onLogin, error, loading }) => {
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Business Dashboard</h1>
            <p className="text-slate-500 text-sm">Admin access required</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onLogin(password);
          }}
        >
          <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Admin Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="Enter admin password"
            autoFocus
          />
          {error && (
            <div className="flex items-center gap-2 mt-3 text-rose-400 text-sm">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

const DashboardLayout: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('bd_sidebar_collapsed') === 'true'
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('bd_sidebar_collapsed', next ? 'true' : 'false');
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-slate-900 border-r border-slate-800 h-screen sticky top-0 transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800 shrink-0">
          {!collapsed && (
            <span className="text-white font-bold text-sm tracking-tight">DesiDiet Business</span>
          )}
          <button
            onClick={toggleCollapsed}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors ml-auto"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={`flex items-center rounded-lg transition-colors group relative ${
                  collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <item.icon size={18} className="shrink-0" />
                {!collapsed && (
                  <>
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {item.comingSoon && (
                      <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                        Soon
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 p-2 border-t border-slate-800">
          <button
            onClick={onLogout}
            title={collapsed ? 'Log Out' : undefined}
            className={`flex items-center rounded-lg hover:bg-rose-900/20 text-rose-400 transition-colors w-full ${
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-[260px] bg-slate-900 border-r border-slate-800 z-50 flex flex-col lg:hidden">
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
              <span className="text-white font-bold text-sm">DesiDiet Business</span>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-indigo-600/10 text-indigo-400'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {item.comingSoon && (
                      <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                        Soon
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="shrink-0 p-2 border-t border-slate-800">
              <button
                onClick={() => { onLogout(); setMobileOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-rose-900/20 text-rose-400 transition-colors w-full"
              >
                <LogOut size={18} />
                <span className="text-sm font-medium">Log Out</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400"
            >
              <Menu size={18} />
            </button>
            <h2 className="text-white font-semibold text-sm">
              {navItems.find((n) => location.pathname === n.path || location.pathname.startsWith(n.path + '/'))?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300 text-xs font-medium">Live</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 md:p-7 overflow-y-auto">
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/ai-usage" element={<AiUsagePage />} />
            <Route path="/grocery-suggestions" element={<GrocerySuggestionsPage />} />
            <Route path="/brands" element={<ComingSoonPage title="Brands" />} />
            <Route path="/stores" element={<ComingSoonPage title="Stores" />} />
            <Route path="/products" element={<ComingSoonPage title="Products" />} />
            <Route path="/food-types" element={<ComingSoonPage title="Food Types" />} />
            <Route path="/analytics" element={<ComingSoonPage title="Analytics" />} />
            <Route path="/churn" element={<ComingSoonPage title="Churn Analysis" />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const BusinessDashboardEntry: React.FC = () => {
  const { isAuthenticated, isLoading, error, login, logout } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={login} error={error} loading={isLoading} />;
  }

  return <DashboardLayout onLogout={logout} />;
};

export default BusinessDashboardEntry;
