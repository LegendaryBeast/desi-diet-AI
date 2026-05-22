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
  Utensils,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    { path: '/health-log', label: isBn ? 'স্বাস্থ্য লগ' : 'Health Log', icon: Activity },
    { path: '/medicine', label: isBn ? 'ওষুধের রিমাইন্ডার' : 'Medicine', icon: Pill },
    { path: '/foods', label: isBn ? 'খাবারের তালিকা' : 'Foods', icon: Apple },
    { path: '/report', label: isBn ? 'পুষ্টি রিপোর্ট' : 'Report', icon: BarChart2 },
    { path: '/', label: isBn ? 'হোমপেজ' : 'Home', icon: Home },
  ];

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const renderSidebarContent = () => (
    <div className="p-3.5 pt-16 lg:pt-5 h-full flex flex-col overflow-y-auto hide-scrollbar">
      {/* Profile Card */}
      <div className="bg-cream/40 p-2.5 rounded-xl mb-3.5 border border-ink/5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center text-cream shadow-md transform rotate-3 flex-shrink-0">
            <User size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bn font-bold text-xs leading-tight text-ink truncate">{displayName}</h3>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
              <span className="text-[0.52rem] uppercase tracking-wider text-ink-faint font-body font-bold truncate">{bmiCategory}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-white p-1 rounded-lg border border-ink/5 text-center">
            <div className="text-[0.45rem] uppercase tracking-wider text-ink-faint font-body mb-0.5">BMI</div>
            <div className="font-bold text-[0.68rem] text-ink leading-none">{computedBmi}</div>
          </div>
          <div className="bg-white p-1 rounded-lg border border-ink/5 text-center">
            <div className="text-[0.45rem] uppercase tracking-wider text-ink-faint font-body mb-0.5">KCAL</div>
            <div className="font-bold text-[0.68rem] text-accent leading-none">{calories}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-grow space-y-0.5">
        <p className="text-[0.45rem] uppercase tracking-[0.2em] text-ink-faint font-body font-bold px-2 mb-1.5">Health Dashboard</p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2.5 p-1.5 rounded-lg transition-all group border border-transparent ${
                isActive
                  ? 'bg-ink text-cream shadow-md'
                  : 'text-ink-muted hover:bg-cream hover:text-ink hover:border-ink/5'
              }`}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                isActive ? 'bg-accent text-cream' : 'bg-cream group-hover:bg-ink group-hover:text-cream'
              }`}>
                <item.icon size={12} />
              </div>
              <span className="font-bn text-[0.68rem] font-bold flex-1">{item.label}</span>
              {isActive && <ChevronRight size={10} className="opacity-40" />}
            </Link>
          );
        })}
      </nav>

      <div className="pt-2.5 mt-auto border-t border-ink/5 space-y-1">
        <button
          onClick={() => i18n.changeLanguage(isBn ? 'en' : 'bn')}
          className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-cream transition-colors text-ink-muted hover:text-ink font-bold text-[0.62rem]"
        >
          <Languages size={12} />
          <span>{isBn ? 'Switch to English' : 'বাংলায় যান'}</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors font-bold text-[0.62rem]"
        >
          <LogOut size={12} />
          <span>{isBn ? 'লগ আউট' : 'Log Out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen h-[100dvh] bg-cream flex overflow-hidden font-bn relative">
      {/* Mobile Sidebar Overlay */}
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
              initial={{ x: -270 }}
              animate={{ x: 0 }}
              exit={{ x: -270 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[220px] bg-white border-r border-ink/5 flex flex-col z-30 shadow-2xl lg:hidden"
            >
              <div className="absolute top-4 right-4 z-40 lg:hidden">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 bg-cream rounded-lg text-ink-muted hover:bg-ink hover:text-cream transition-all"
                >
                  <X size={14} />
                </button>
              </div>
              {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (Persistent) */}
      <aside className="hidden lg:flex w-[200px] bg-white border-r border-ink/5 flex-col shrink-0">
        {renderSidebarContent()}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-rows-[auto_1fr] relative bg-[#FDFCF9] overflow-hidden min-w-0">
        {/* Cinematic Texture Background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />

        {/* Dynamic Header */}
        <header className="relative p-2.5 md:p-3.5 lg:px-5 border-b border-ink/5 flex items-center justify-between z-20 bg-white/70 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 bg-cream rounded-lg text-ink-muted hover:bg-ink hover:text-cream transition-all flex shadow-sm interactive lg:hidden"
            >
              <Menu size={16} />
            </button>
            <Link to="/" className="p-1.5 bg-cream rounded-lg text-ink-muted hover:bg-ink hover:text-cream transition-all flex lg:hidden interactive">
              <ArrowLeft size={16} />
            </Link>

            <div className="flex items-center gap-2">
              {headerExtra}
              <div>
                <h2 className="font-bn font-black text-sm md:text-base text-ink tracking-tight leading-none">{title}</h2>
                {subtitle && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                    <span className="text-[0.45rem] md:text-[0.5rem] uppercase tracking-[0.2em] text-ink-faint font-bold font-body leading-none">{subtitle}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center">
            {headerActions}
          </div>
        </header>

        {/* Content Stream */}
        <main className={`flex-1 h-full relative z-10 scroll-smooth min-h-0 ${noPadding ? 'overflow-hidden flex flex-col' : 'overflow-y-auto p-3.5 md:p-5 lg:p-6'}`}>
          <div className={`max-w-[1280px] w-full mx-auto flex flex-col ${noPadding ? 'flex-1 min-h-0' : 'h-full'}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
