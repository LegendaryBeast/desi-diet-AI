import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight, ShieldCheck, Star } from 'lucide-react';

export const CTASection = () => {
  const { isLoggedIn } = useAuth();

  return (
    <section className="px-6 md:px-12 lg:px-24 py-24 lg:py-40 text-center relative overflow-hidden bg-cream">
      {/* Background typographic watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bn text-[clamp(8rem,15vw,20rem)] font-black text-cream-dark opacity-50 whitespace-nowrap pointer-events-none select-none tracking-tighter z-0">
        সুস্থ জীবন
      </div>
      
      <div className="relative z-10 flex flex-col items-center max-w-[800px] mx-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-ink/5 shadow-sm rounded-full mb-8"
        >
          <div className="flex -space-x-1">
            {[1,2,3,4,5].map(i => <Star key={i} size={10} className="text-gold fill-gold" />)}
          </div>
          <span className="font-bn text-[0.7rem] font-bold text-ink">১০০% বৈজ্ঞানিক ও নিরাপদ</span>
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-display text-[clamp(2.5rem,6vw,5.5rem)] font-black leading-[0.95] tracking-tight mb-8 text-ink"
        >
          আপনার স্বাস্থ্যের<br />
          <span className="font-bn text-[clamp(2rem,5vw,4.5rem)] font-bold text-accent italic">নতুন অধ্যায়</span> শুরু করুন
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="font-bn text-[0.95rem] lg:text-[1.1rem] leading-[1.8] text-ink-muted max-w-[500px] mb-12"
        >
          বাংলাদেশি খাবার, আন্তর্জাতিক পুষ্টি মানদণ্ড এবং কৃত্রিম বুদ্ধিমত্তার সমন্বয়ে তৈরি প্রথম সম্পূর্ণ পুষ্টি ব্যবস্থাপনা প্ল্যাটফর্ম।
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link to={isLoggedIn ? "/dashboard" : "/profile"} className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-10 lg:px-12 py-4 lg:py-5 text-[0.9rem] lg:text-[1rem] font-bn font-bold bg-ink text-cream hover:bg-accent rounded-2xl transition-all shadow-xl shadow-ink/10 flex items-center justify-center gap-2 group">
              {isLoggedIn ? 'ড্যাশবোর্ডে ফিরে যান' : 'বিনামূল্যে অ্যাকাউন্ট তৈরি করুন'}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-10 flex items-center gap-4 text-[0.7rem] text-ink-faint font-body tracking-wider uppercase"
        >
          <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-forest" /> ডেটা সুরক্ষিত</span>
          <span className="w-1 h-1 bg-ink/20 rounded-full" />
          <span>সম্পূর্ণ ফ্রি বেসিক প্ল্যান</span>
        </motion.div>
      </div>
    </section>
  );
};
