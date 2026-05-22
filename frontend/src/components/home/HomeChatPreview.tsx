import { motion } from 'framer-motion';
import { MessageSquare, HeartPulse, Scale, Utensils, Zap, Activity, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const prompts = [
  { text: "আমার ডায়াবেটিস আছে, আজকের ডায়েট কী হবে?", icon: Activity },
  { text: "উচ্চরক্তচাপ রোগীদের জন্য কী ধরনের সকালের নাস্তা ভালো?", icon: HeartPulse },
  { text: "ওজন কমানোর জন্য একটি সাপ্তাহিক মিল প্ল্যান তৈরি করো।", icon: Scale },
  { text: "দুপুরের খাবারে মাছ ও সবজি দিয়ে ৫ শ' ক্যালোরির মেনু দাও।", icon: Utensils },
];

export const HomeChatPreview = () => {
  const { isLoggedIn } = useAuth();

  return (
    <section className="py-20 lg:py-32 px-6 md:px-12 lg:px-24 bg-cream-dark overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 items-center relative z-10">
        
        {/* Left text */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[0.62rem] tracking-[0.2em] uppercase text-ink-faint mb-4 font-body flex items-center gap-2"
          >
            <Zap size={12} className="text-accent" />
            স্মার্ট এআই পুষ্টিবিদ
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-[clamp(2.2rem,4vw,3.5rem)] font-black leading-[1] tracking-tight text-ink mb-6"
          >
            আপনার ব্যক্তিগত <em className="italic text-accent">AI ডায়েটিশিয়ান</em>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="font-bn text-[0.95rem] text-ink-muted leading-relaxed mb-8"
          >
            যেকোনো স্বাস্থ্য বা পুষ্টি সংক্রান্ত প্রশ্ন করুন। DesiDiet AI মুহূর্তের মধ্যে আপনার শারীরিক অবস্থা বিবেচনা করে বৈজ্ঞানিক তথ্য ও সঠিক নির্দেশনা প্রদান করবে।
          </motion.p>

          <div className="flex flex-col gap-3 mb-10">
            {prompts.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3 p-3 lg:p-4 rounded-xl bg-white border border-ink/5 shadow-sm hover:border-accent/30 transition-colors cursor-default"
                >
                  <div className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center text-ink shrink-0">
                    <Icon size={14} />
                  </div>
                  <span className="font-bn text-[0.85rem] text-ink">{p.text}</span>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
          >
            <Link to={isLoggedIn ? "/chat" : "/profile"}>
              <button className="px-8 py-4 bg-accent text-cream rounded-xl font-bn font-bold hover:bg-ink transition-colors shadow-lg shadow-accent/20">
                এআই এর সাথে কথা বলুন
              </button>
            </Link>
          </motion.div>
        </div>

        {/* Right Chat UI Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          {/* Mockup Frame */}
          <div className="bg-white rounded-[2rem] p-4 lg:p-6 shadow-2xl border border-ink/5">
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
                    <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-accent" /> সেদ্ধ ডিম (সাদা অংশ) - ১টি</li>
                  </ul>
                  <div className="font-bold text-accent mb-2 mt-4">দুপুরের খাবার (৬০০ ক্যালোরি):</div>
                  <ul className="space-y-1.5 text-ink-muted">
                    <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-accent" /> লাল চালের ভাত - ১ কাপ (১৫০ গ্রাম)</li>
                    <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-accent" /> রুই মাছের ঝোল - ১ পিস (১০০ গ্রাম)</li>
                    <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-accent" /> মসুর ডাল পাতলা - ১ বাটি</li>
                  </ul>
                  
                  <div className="mt-4 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce delay-100" />
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce delay-200" />
                  </div>
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
            className="absolute -right-6 top-20 bg-white border border-ink/5 p-3 rounded-xl shadow-xl flex items-center gap-2"
          >
             <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
               <ShieldCheck size={12} />
             </div>
             <span className="font-bn text-[0.65rem] font-bold text-ink">ADA গাইডলাইন যাচাইকৃত</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
