import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, Sparkles, ChevronRight, BookOpen, Utensils } from 'lucide-react';

export const Hero = () => {
  const { isLoggedIn } = useAuth();

  const badges = [
    { icon: BookOpen, label: 'NDG 2025 অনুসারী' },
    { icon: ShieldCheck, label: 'WHO নির্দেশিকা' },
    { icon: Utensils, label: '৩২০+ দেশীয় খাবার' },
  ];

  return (
    <section className="min-h-screen relative overflow-hidden flex flex-col justify-center bg-cream" id="home">
      {/* Soft background gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/5 blur-[120px] rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-forest/5 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, #1A1714 1px, transparent 1px)',
        backgroundSize: '32px 32px'
      }} />

      <div className="relative z-10 px-6 md:px-12 lg:px-24 pt-28 pb-16 max-w-[1400px] mx-auto w-full">

        {/* 2-col grid: left = badges + headline + CTA | right = video (as tall as left) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col">
            {/* Eyebrow badges */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-wrap gap-2 md:gap-3 mb-8"
            >
              {badges.map((b, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-ink/8 rounded-full text-[0.65rem] md:text-[0.7rem] tracking-wider uppercase text-ink-muted font-body shadow-sm">
                  <b.icon size={10} className="text-accent" />
                  {b.label}
                </span>
              ))}
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <span className="font-bn text-[clamp(1rem,2.5vw,1.2rem)] font-medium text-accent block mb-3 tracking-wide">
                বাংলাদেশের প্রথম AI-চালিত পুষ্টি সহকারী
              </span>
              <h1 className="font-body text-[clamp(3rem,7vw,6.5rem)] font-black leading-[0.9] tracking-tight text-ink">
                Desi<span className="text-accent">Diet</span>
                <span className="block font-bn text-[clamp(1.8rem,4vw,3.5rem)] font-bold text-ink mt-2 leading-tight">
                  আপনার স্বাস্থ্য, <br className="hidden sm:block" />আপনার পরিকল্পনা।
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-6 font-bn text-[0.95rem] md:text-[1.05rem] leading-[1.8] text-ink-muted max-w-[520px]"
            >
              ডায়াবেটিস, উচ্চরক্তচাপ, কিডনি রোগসহ ৭০+ রোগের জন্য বিশেষজ্ঞ-অনুমোদিত ডায়েট পরিকল্পনা।
              বাংলাদেশের জাতীয় পুষ্টি নির্দেশিকা (NDG), WHO এবং ICMR গাইডলাইন অনুসরণ করে তৈরি।
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
            >
              <Link to={isLoggedIn ? '/dashboard' : '/profile'}>
                <button className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-ink text-cream rounded-2xl font-bn font-bold text-sm md:text-base hover:bg-accent transition-all duration-300 shadow-xl shadow-ink/10 active:scale-[0.98]">
                  <Sparkles size={16} className="group-hover:animate-pulse" />
                  {isLoggedIn ? 'ড্যাশবোর্ডে যান' : 'বিনামূল্যে শুরু করুন'}
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link to="/conditions" className="inline-flex items-center justify-center gap-1.5 px-6 py-4 border border-ink/10 rounded-2xl font-bn text-sm text-ink-muted hover:text-ink hover:border-ink/25 transition-all bg-white/60 backdrop-blur-sm">
                রোগভিত্তিক ডায়েট দেখুন
              </Link>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 flex items-center gap-2 text-[0.65rem] md:text-[0.7rem] text-ink-faint font-body tracking-wider uppercase"
            >
              <div className="flex -space-x-2">
                {['#C8472A','#2C5530','#B8933E','#5C574F'].map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-cream" style={{ background: c }} />
                ))}
              </div>
              <span className="ml-1">নির্ভরযোগ্য পুষ্টিবিদ-অনুমোদিত প্রযুক্তি</span>
            </motion.div>
          </div>

          {/* ── RIGHT COLUMN: YouTube Video (full height, as large as possible) ── */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:flex flex-col relative self-stretch"
          >
            {/* Glow */}
            <div className="absolute -inset-3 bg-gradient-to-br from-accent/25 via-transparent to-forest/15 rounded-[2.5rem] blur-2xl opacity-60 pointer-events-none" />

            {/* Card — stretches to fill full column height */}
            <div className="relative flex flex-col flex-1 bg-white/80 backdrop-blur-sm rounded-[2rem] p-3 shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-ink/5 h-full">
              {/* macOS-style top bar */}
              <div className="flex items-center gap-2 px-3 pb-3 border-b border-ink/5 mb-3 shrink-0">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="font-bn text-[0.65rem] text-ink-faint mx-auto pr-8">DesiDiet — পরিচিতি ভিডিও</span>
              </div>

              {/* 16:9 iframe — fills remaining card height */}
              <div className="relative flex-1 rounded-xl overflow-hidden min-h-[240px]">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/b_bTzmIBPus"
                  title="DesiDiet পরিচিতি ভিডিও"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>

            {/* Floating badge */}
            <motion.div
              animate={{ y: [-8, 8, -8] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-10 top-16 bg-white border border-ink/5 p-3 rounded-xl shadow-xl flex items-center gap-2 z-10"
            >
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <ShieldCheck size={12} />
              </div>
              <span className="font-bn text-[0.65rem] font-bold text-ink">ADA গাইডলাইন যাচাইকৃত</span>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 flex flex-col items-center gap-2 text-ink-faint"
        >
          <div className="w-px h-10 bg-gradient-to-b from-transparent to-ink/20" />
          <span className="text-[0.58rem] tracking-widest uppercase font-body">স্ক্রোল করুন</span>
        </motion.div>
      </div>
    </section>
  );
};
