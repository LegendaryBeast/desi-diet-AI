import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, Sparkles, ChevronRight, BookOpen, Utensils, MessageSquare, Zap } from 'lucide-react';

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

      <div className="relative z-10 px-6 md:px-12 lg:px-24 pt-32 pb-20 max-w-[1400px] mx-auto w-full">
        {/* Eyebrow badge row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap gap-2 md:gap-3 mb-10"
        >
          {badges.map((b, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-ink/8 rounded-full text-[0.65rem] md:text-[0.7rem] tracking-wider uppercase text-ink-muted font-body shadow-sm">
              <b.icon size={10} className="text-accent" />
              {b.label}
            </span>
          ))}
        </motion.div>

        {/* Main headline */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-20 items-end">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <span className="font-bn text-[clamp(1rem,3vw,1.3rem)] font-medium text-accent block mb-3 tracking-wide">
                বাংলাদেশের প্রথম AI-চালিত পুষ্টি সহকারী
              </span>
              <h1 className="font-body text-[clamp(3rem,8vw,7rem)] font-black leading-[0.9] tracking-tight text-ink">
                Desi<span className="text-accent">Diet</span>
                <span className="block font-bn text-[clamp(1.8rem,5vw,4rem)] font-bold text-ink mt-2 leading-tight">
                  আপনার স্বাস্থ্য, <br className="hidden sm:block" />আপনার পরিকল্পনা।
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-8 font-bn text-[0.95rem] md:text-[1.05rem] leading-[1.8] text-ink-muted max-w-[560px]"
            >
              ডায়াবেটিস, উচ্চরক্তচাপ, কিডনি রোগসহ ৭০+ রোগের জন্য বিশেষজ্ঞ-অনুমোদিত ডায়েট পরিকল্পনা।
              বাংলাদেশের জাতীয় পুষ্টি নির্দেশিকা (NDG), WHO এবং ICMR গাইডলাইন অনুসরণ করে তৈরি।
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
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
              className="mt-10 flex items-center gap-2 text-[0.65rem] md:text-[0.7rem] text-ink-faint font-body tracking-wider uppercase"
            >
              <div className="flex -space-x-2">
                {['#C8472A','#2C5530','#B8933E','#5C574F'].map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-cream" style={{ background: c }} />
                ))}
              </div>
              <span className="ml-1">নির্ভরযোগ্য পুষ্টিবিদ-অনুমোদিত প্রযুক্তি</span>
            </motion.div>
          </div>

          {/* Right: Chat UI Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block relative"
          >
            {/* Mockup Frame */}
            <div className="bg-white rounded-[2rem] p-4 lg:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-ink/5">
              <div className="flex items-center gap-3 mb-6 border-b border-ink/5 pb-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-cream">
                    <MessageSquare size={16} />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                </div>
                <div>
                  <div className="font-display font-bold text-ink text-sm">DesiDiet AI</div>
                  <div className="font-body text-[0.6rem] text-green-500 uppercase tracking-widest mt-0.5">Online</div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="bg-ink text-cream rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] font-bn text-[0.85rem] leading-relaxed shadow-sm">
                    আমার ডায়াবেটিস আছে। আজকের জন্য ২,০০০ ক্যালোরির একটি দেশীয় ডায়েট প্ল্যান দাও।
                  </div>
                </div>

                {/* Bot typing indicator */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center text-cream shrink-0 mt-1 shadow-sm">
                    <MessageSquare size={12} />
                  </div>
                  <div className="bg-cream-dark text-ink border border-ink/5 rounded-2xl rounded-tl-sm p-4 font-bn text-[0.85rem] leading-relaxed shadow-sm w-full">
                    <div className="font-bold text-accent mb-2">সকালের নাস্তা (৪০০ ক্যালোরি):</div>
                    <ul className="space-y-1.5 mb-3 text-ink-muted">
                      <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-accent" /> লাল আটার রুটি - ২টি (১২০ গ্রাম)</li>
                      <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-accent" /> মিক্সড সবজি ভাজি - ১ বাটি (১৫০ গ্রাম)</li>
                    </ul>
                    <div className="font-bold text-accent mb-2 mt-4">দুপুরের খাবার (৬০০ ক্যালোরি):</div>
                    <ul className="space-y-1.5 text-ink-muted">
                      <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-accent" /> লাল চালের ভাত - ১ কাপ (১৫০ গ্রাম)</li>
                      <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-accent" /> রুই মাছের ঝোল - ১ পিস (১০০ গ্রাম)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Input mockup */}
              <div className="relative">
                <div className="w-full bg-cream rounded-full pl-5 pr-12 py-3.5 border border-ink/5 flex items-center shadow-inner">
                  <span className="font-bn text-[0.85rem] text-ink-faint">আপনার প্রশ্ন লিখুন...</span>
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-accent rounded-full flex items-center justify-center text-cream shadow-sm">
                  <Zap size={14} />
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-8 top-28 bg-white border border-ink/5 p-3 rounded-xl shadow-xl flex items-center gap-2 z-10"
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
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-ink-faint"
        >
          <div className="w-px h-10 bg-gradient-to-b from-transparent to-ink/20" />
          <span className="text-[0.58rem] tracking-widest uppercase font-body">স্ক্রোল করুন</span>
        </motion.div>
      </div>
    </section>
  );
};
