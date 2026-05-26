import React from 'react';
import { motion } from 'framer-motion';
import { Hourglass, Sparkles } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';

export const HealthLog = () => {
  const today = new Date().toLocaleDateString('bn-BD', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <DashboardLayout title="স্বাস্থ্য ট্র্যাকার (Health Log)" subtitle={today}>
      <div className="max-w-xl w-full mx-auto pb-12 pt-8 px-4 flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white border-2 border-primary/20 rounded-3xl p-8 md:p-10 text-center shadow-xl shadow-primary/5 w-full"
        >
          {/* Hourglass Icon with gentle animations */}
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
            <Hourglass className="w-12 h-12 text-primary animate-pulse" strokeWidth={1.5} />
          </div>

          {/* Sparkly Coming Soon Title */}
          <div className="flex items-center justify-center gap-1.5 mb-4 text-[#FF6B35] font-bold text-xs tracking-widest font-body uppercase">
            <Sparkles className="w-4 h-4" />
            <span>COMING SOON</span>
            <Sparkles className="w-4 h-4" />
          </div>

          {/* Core Headings */}
          <h2 className="font-bn text-3xl font-black text-ink mb-4">
            কাজ চলছে!
          </h2>

          {/* Bangla Description */}
          <p className="font-bn text-sm text-ink-muted leading-relaxed mb-4">
            খুব শীঘ্রই এই ফিচারটি আপনাদের জন্য উন্মুক্ত করা হবে। এখানে আপনি আপনার দৈনন্দিন ওজন, ব্লাড প্রেসার, রক্তে শর্করা এবং অন্যান্য গুরুত্বপূর্ণ স্বাস্থ্য তথ্য ট্রাক ও বিশ্লেষণ করতে পারবেন। 📊✨
          </p>

          {/* English Description */}
          <p className="font-bn text-xs text-ink-faint leading-relaxed mb-6 italic">
            We are working hard to bring this feature to life! Soon, you'll be able to easily track, analyze, and visualize your daily weight, blood pressure, sugar levels, and overall clinical trends.
          </p>

          {/* Decorative divider */}
          <div className="w-12 h-1 bg-[#FF6B35]/30 rounded-full mx-auto" />
        </motion.div>
      </div>
    </DashboardLayout>
  );
};
