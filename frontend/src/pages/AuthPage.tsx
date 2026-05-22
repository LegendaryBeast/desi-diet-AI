import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../lib/api';

type Tab = 'login' | 'register';

export const AuthPage = () => {
  const [tab, setTab] = useState<Tab>('login');
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone && !email) { setError('Phone or email is required'); return; }
    setLoading(true);
    try {
      await register({ phone: phone || undefined, email: email || undefined, password });
      navigate('/profile');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 relative overflow-hidden font-bn">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-forest/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-ink rounded-xl text-cream mb-4 shadow-xl transform -rotate-3">
            <span className="font-display font-black text-xl text-accent">D</span>
          </div>
          <h1 className="font-display font-black text-2xl text-ink tracking-tight">
            Desi<span className="text-accent">Diet</span>
          </h1>
          <p className="text-[0.68rem] text-ink-muted mt-1 font-bn">আপনার ব্যক্তিগত পুষ্টি সহায়ক</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-white p-1 rounded-xl border border-ink/5 shadow-sm mb-4">
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
                tab === t ? 'bg-ink text-cream shadow-md' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t === 'login' ? 'লগইন' : 'নিবন্ধন'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-ink/5">
          <AnimatePresence mode="wait">
            {tab === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                onSubmit={handleLogin}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-[0.62rem] font-bold uppercase tracking-wider text-ink-faint mb-1">ফোন বা ইমেইল</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
                    <input
                      id="login-identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="01XXXXXXXXX বা email@example.com"
                      className="w-full bg-cream/40 border border-ink/10 focus:border-accent/30 rounded-lg py-2 pl-9 pr-3 font-bn outline-none transition-all text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[0.62rem] font-bold uppercase tracking-wider text-ink-faint mb-1">পাসওয়ার্ড</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="পাসওয়ার্ড"
                      className="w-full bg-cream/40 border border-ink/10 focus:border-accent/30 rounded-lg py-2 pl-9 pr-9 font-bn outline-none transition-all text-xs"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-1.5 text-red-500 text-xs bg-red-50 p-2 rounded-lg border border-red-100">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-bn">{error}</span>
                  </div>
                )}

                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-ink text-cream rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-accent transition-all shadow-md disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>লগইন করুন <ArrowRight className="w-3 h-3" /></>}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                onSubmit={handleRegister}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-[0.62rem] font-bold uppercase tracking-wider text-ink-faint mb-1">ফোন নম্বর</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
                    <input
                      id="register-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full bg-cream/40 border border-ink/10 focus:border-accent/30 rounded-lg py-2 pl-9 pr-3 font-bn outline-none transition-all text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[0.62rem] font-bold uppercase tracking-wider text-ink-faint mb-1">ইমেইল (ঐচ্ছিক)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
                    <input
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full bg-cream/40 border border-ink/10 focus:border-accent/30 rounded-lg py-2 pl-9 pr-3 font-bn outline-none transition-all text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[0.62rem] font-bold uppercase tracking-wider text-ink-faint mb-1">পাসওয়ার্ড (ন্যূনতম ৬ অক্ষর)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="শক্তিশালী পাসওয়ার্ড"
                      minLength={6}
                      className="w-full bg-cream/40 border border-ink/10 focus:border-accent/30 rounded-lg py-2 pl-9 pr-12 font-bn outline-none transition-all text-xs"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-1.5 text-red-500 text-xs bg-red-50 p-2 rounded-lg border border-red-100">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-bn">{error}</span>
                  </div>
                )}

                <button
                  id="register-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-ink text-cream rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-accent transition-all shadow-md disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>অ্যাকাউন্ট তৈরি করুন <ArrowRight className="w-3 h-3" /></>}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-[0.58rem] text-ink-faint mt-4 font-bn">
          আপনার তথ্য সম্পূর্ণ নিরাপদ এবং গোপনীয়
        </p>
      </motion.div>
    </div>
  );
};
