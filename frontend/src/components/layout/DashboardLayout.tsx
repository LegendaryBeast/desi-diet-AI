import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  Layout,
  Activity,
  Languages,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  ChevronRight,
  Home,
  Pill,
  Apple,
  BarChart2,
  MessageSquare,
  Crown,
  Droplet,
  Utensils,
  Shield,
  ChefHat,
  ShoppingCart,
  ListPlus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  noPadding?: boolean;
  headerExtra?: React.ReactNode;
  headerActions?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  subtitle,
  noPadding,
  headerExtra,
  headerActions
}) => {
  const { i18n } = useTranslation();
  const { profileData, logout } = useAuth();
  const { isPro, subscribe, unsubscribe } = useSubscription();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [strictMode, setStrictMode] = useState(() => localStorage.getItem('strictMode') === 'true');

  const handleToggleStrict = (val: boolean) => {
    setStrictMode(val);
    localStorage.setItem('strictMode', val ? 'true' : 'false');
    window.dispatchEvent(new Event('strictModeChanged'));
  };

  const location = useLocation();
  const navigate = useNavigate();

  const profile = profileData?.profile;
  const targets = profileData?.targets;
  const isBn = i18n.language === 'bn';

  const displayName = isBn
    ? (profile?.name_bn || profile?.name_en || 'অতিথি')
    : (profile?.name_en || profile?.name_bn || 'Guest');

  // Calculate BMI from profile data if targets.bmi is missing
  const computedBmi = (() => {
    if (targets?.bmi) return targets.bmi.toFixed(1);
    const w = profile?.weight_kg;
    const h = profile?.height_cm;
    if (w && h) return (w / ((h / 100) * (h / 100))).toFixed(1);
    return '--';
  })();

  const calories = targets?.target_calories ?? '--';
  const bmiCategory = targets?.bmi_category ?? (isBn ? '---' : '---');

  const navItems = [
    { path: '/dashboard', label: isBn ? 'ড্যাশবোর্ড' : 'Dashboard', icon: Layout },
    { path: '/chat', label: isBn ? 'এআই অ্যাসিস্ট্যান্ট' : 'AI Assistant', icon: MessageSquare },
    { path: '/meal-plan', label: isBn ? 'আজকের মিল প্ল্যান' : 'Meal Plan', icon: Utensils },
    { path: '/grocery', label: isBn ? 'গ্রোসারি তুলনা' : 'Grocery', icon: ShoppingCart },
    { path: '/health-log', label: isBn ? 'স্বাস্থ্য লগ' : 'Health Log', icon: Activity },
    { path: '/medicine', label: isBn ? 'ওষুধের রিমাইন্ডার' : 'Medicine', icon: Pill },
    { path: '/foods', label: isBn ? 'খাবারের তালিকা' : 'Foods', icon: Apple },
    { path: '/report', label: isBn ? 'পুষ্টি রিপোর্ট' : 'Report', icon: BarChart2 },
  ];

  const mobileNavItems = [
    { path: '/dashboard', label: isBn ? 'ড্যাশবোর্ড' : 'Dashboard', icon: Layout },
    { path: '/chat', label: isBn ? 'এআই চ্যাট' : 'AI Chat', icon: MessageSquare },
    { path: '/health-log', label: isBn ? 'স্বাস্থ্য লগ' : 'Health Log', icon: Activity },
    { path: '/grocery', label: isBn ? 'গ্রোসারি' : 'Grocery', icon: ShoppingCart },
  ];

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const renderSidebarContent = (closeSidebar: boolean) => (
    <div className="p-5 pt-20 lg:pt-6 md:p-6 h-full flex flex-col overflow-y-auto hide-scrollbar select-none">
      {/* Profile Card */}
      <Link
        to="/profile"
        onClick={() => closeSidebar && setSidebarOpen(false)}
        className="block bg-cream/50 p-4 md:p-5 rounded-[2rem] mb-5 border border-ink/5 hover:border-accent/30 hover:bg-cream/80 transition-all group cursor-pointer"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center text-cream shadow-md transform rotate-3 flex-shrink-0 group-hover:rotate-6 transition-transform">
            <User size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bn font-bold text-base leading-tight text-ink truncate group-hover:text-accent transition-colors">{displayName}</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
              <span className="text-[0.55rem] uppercase tracking-widest text-ink-faint font-body font-bold truncate">{bmiCategory}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-2 rounded-xl border border-ink/5 text-center group-hover:border-accent/10 transition-colors">
            <div className="text-[0.5rem] uppercase tracking-wider text-ink-faint font-body mb-0.5">BMI</div>
            <div className="font-bold text-sm text-ink">{computedBmi}</div>
          </div>
          <div className="bg-white p-2 rounded-xl border border-ink/5 text-center group-hover:border-accent/10 transition-colors">
            <div className="text-[0.5rem] uppercase tracking-wider text-ink-faint font-body mb-0.5">KCAL</div>
            <div className="font-bold text-sm text-accent">{calories}</div>
          </div>
        </div>
      </Link>

      {/* Subscription Status */}
      <div className={`p-3.5 rounded-2xl border mb-5 ${
        isPro
          ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
          : 'bg-cream/50 border-ink/5'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center ${
              isPro ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' : 'bg-ink/10 text-ink-muted'
            }`}>
              <Crown size={12} />
            </div>
            <div>
              <div className="font-bn font-bold text-xs text-ink">
                {isPro ? 'Pro Plan' : 'Free Plan'}
              </div>
              <div className="text-[0.5rem] uppercase tracking-wider text-ink-faint font-body font-bold">
                {isPro ? '৳500/month' : 'Limited'}
              </div>
            </div>
          </div>
          <button
            onClick={() => isPro ? unsubscribe() : subscribe()}
            className={`relative w-9 h-5 rounded-full transition-all duration-300 ${
              isPro ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-ink/15'
            }`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
              isPro ? 'left-[18px]' : 'left-0.5'
            }`} />
          </button>
        </div>
      </div>


      {/* Navigation */}
      <nav className="flex-grow space-y-1">
        <p className="text-[0.5rem] uppercase tracking-[0.2em] text-ink-faint font-body font-bold px-3 mb-2">Health Dashboard</p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => closeSidebar && setSidebarOpen(false)}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-all group border border-transparent ${
                isActive
                  ? 'bg-ink text-cream shadow-md shadow-ink/5'
                  : 'text-ink-muted hover:bg-cream hover:text-ink hover:border-ink/5'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                isActive ? 'bg-accent text-cream' : 'bg-cream group-hover:bg-ink group-hover:text-cream'
              }`}>
                <item.icon size={16} />
              </div>
              <span className="font-bn text-sm font-bold flex-1">{item.label}</span>
              {isActive && <ChevronRight size={13} className="opacity-40" />}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 mt-auto border-t border-ink/5 space-y-1">
        <button
          onClick={() => i18n.changeLanguage(isBn ? 'en' : 'bn')}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-cream transition-colors text-ink-muted hover:text-ink font-bold text-sm"
        >
          <Languages size={16} />
          <span>{isBn ? 'Switch to English' : 'বাংলায় যান'}</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-50 text-red-500 transition-colors font-bold text-sm"
        >
          <LogOut size={16} />
          <span>{isBn ? 'লগ আউট' : 'Log Out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen h-[100dvh] bg-cream flex overflow-hidden font-bn relative">
      {/* Desktop Sidebar (Persistent) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-ink/5 h-full">
        {renderSidebarContent(false)}
      </aside>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-[25] lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[260px] bg-white border-r border-ink/5 flex flex-col z-30 shadow-2xl lg:hidden"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative bg-[#FDFCF9] overflow-hidden min-w-0">
        {/* Cinematic Texture Background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />

        {/* Dynamic Header */}
        <header className="sticky top-0 p-3 md:p-4 lg:px-8 border-b border-ink/5 flex items-center justify-between z-30 bg-white/70 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 bg-cream rounded-xl text-ink-muted hover:bg-ink hover:text-cream transition-all flex shadow-sm interactive lg:hidden"
              >
                {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
              <Link to="/" className="p-2 bg-cream rounded-xl text-ink-muted hover:bg-ink hover:text-cream transition-all flex lg:hidden interactive">
                <ArrowLeft size={16} />
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {headerExtra}
              <div>
                <h2 className="font-bn font-black text-base md:text-lg text-ink tracking-tight leading-tight">{title}</h2>
                {subtitle && (
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                    <span className="text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint font-bold font-body">{subtitle}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {headerActions}
            <Link
              to="/profile"
              className="w-9 h-9 rounded-xl bg-cream hover:bg-ink hover:text-cream flex items-center justify-center text-ink-muted transition-all border border-ink/5 shadow-xs shrink-0"
              title={isBn ? 'আমার প্রোফাইল' : 'My Profile'}
            >
              <User size={16} />
            </Link>
          </div>
        </header>

        {/* Content Stream */}
        <main className={`flex-1 relative z-10 scroll-smooth ${noPadding ? 'overflow-hidden flex flex-col' : 'overflow-y-auto p-5 md:p-7 lg:p-8 pb-20 lg:pb-8'}`}>
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-lg border-t border-ink/5 z-20 flex items-center justify-around px-2 lg:hidden pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)] select-none">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                  isActive ? 'text-accent' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-accent/5 scale-110' : ''}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[0.52rem] font-bn font-bold mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
