import { motion } from 'framer-motion';
import { Bot, Salad, ClipboardList, Activity, Pill, FileBarChart2, BookOpen, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: Bot,
    num: '01',
    title: 'AI ডায়েটিশিয়ান চ্যাট',
    desc: 'বাংলায় আপনার ডায়েট, পুষ্টি ও স্বাস্থ্য সংক্রান্ত যেকোনো প্রশ্ন করুন। ব্যক্তিগতকৃত, তাৎক্ষণিক উত্তর পান।',
    color: 'bg-ink text-cream',
  },
  {
    icon: Salad,
    num: '02',
    title: 'স্বয়ংক্রিয় মিল প্ল্যান',
    desc: '৩২০+ বাংলাদেশি খাবার থেকে আপনার রোগ, ক্যালোরি লক্ষ্য ও পছন্দ অনুযায়ী দৈনিক খাবার তালিকা তৈরি হয় স্বয়ংক্রিয়ভাবে।',
    color: 'bg-forest text-cream',
  },
  {
    icon: Activity,
    num: '03',
    title: 'স্বাস্থ্য লগ ও ট্র্যাকিং',
    desc: 'ওজন, রক্তচাপ, রক্তের শর্করা, HbA1c প্রতিদিন রেকর্ড করুন। ভিজুয়াল চার্টে সময়ের সাথে অগ্রগতি দেখুন।',
    color: 'bg-accent text-cream',
  },
  {
    icon: ClipboardList,
    num: '04',
    title: 'ওষুধ রিমাইন্ডার',
    desc: 'AI-চালিত প্রেসক্রিপশন পার্সার দিয়ে ওষুধের তালিকা তৈরি করুন। সময়মতো রিমাইন্ডার পেয়ে কোনো ডোজ মিস করবেন না।',
    color: 'bg-gold text-cream',
  },
  {
    icon: BookOpen,
    num: '05',
    title: 'খাবার ডেটাবেস',
    desc: '৩২০+ দেশীয় খাবারের বিস্তারিত পুষ্টি তথ্য — ক্যালোরি, প্রোটিন, কার্বস, ফ্যাট, ভিটামিন ও খনিজ।',
    color: 'bg-purple-700 text-cream',
  },
  {
    icon: FileBarChart2,
    num: '06',
    title: 'স্বাস্থ্য রিপোর্ট',
    desc: 'আপনার ক্যালোরি গ্রহণ, পুষ্টির মান ও স্বাস্থ্যের অগ্রগতির বিস্তারিত PDF রিপোর্ট ডাউনলোড করুন।',
    color: 'bg-blue-700 text-cream',
  },
];

const guidelines = [
  { code: 'NDG', full: 'National Dietary Guidelines', country: 'বাংলাদেশ ২০২৫', color: 'bg-forest/10 text-forest border-forest/20' },
  { code: 'WHO', full: 'World Health Organization', country: 'আন্তর্জাতিক', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { code: 'ICMR', full: 'Indian Council of Medical Research', country: 'দক্ষিণ এশিয়া', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { code: 'ADA', full: 'American Diabetes Association', country: 'ডায়াবেটিস', color: 'bg-red-50 text-red-600 border-red-200' },
  { code: 'DASH', full: 'Dietary Approaches to Stop Hypertension', country: 'উচ্চরক্তচাপ', color: 'bg-purple-50 text-purple-700 border-purple-200' },
];

export const FeaturesSection = () => {
  return (
    <section className="bg-cream" id="features">
      {/* Header */}
      <div className="px-6 md:px-12 lg:px-24 pt-20 lg:pt-32 pb-16">
        <div className="max-w-[700px]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[0.62rem] tracking-[0.2em] uppercase text-ink-faint mb-4 font-body"
          >
            সম্পূর্ণ ফিচার সেট
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-[clamp(2.2rem,5vw,3.8rem)] font-black leading-[1] tracking-tight text-ink"
          >
            একটি অ্যাপে সম্পূর্ণ <em className="italic text-accent">পুষ্টি ব্যবস্থাপনা</em>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mt-4 font-bn text-[0.92rem] text-ink-muted leading-relaxed max-w-[500px]"
          >
            ডায়েট পরিকল্পনা থেকে শুরু করে স্বাস্থ্য ট্র্যাকিং, ওষুধ রিমাইন্ডার থেকে বিশেষজ্ঞ পরামর্শ — সবকিছু একসাথে।
          </motion.p>
        </div>
      </div>

      {/* Features grid */}
      <div className="px-6 md:px-12 lg:px-24 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group bg-white border border-ink/5 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-400 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className={`w-10 h-10 ${f.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={18} />
                </div>
                <span className="text-[0.58rem] font-body tracking-widest text-ink-faint uppercase absolute top-5 right-5">{f.num}</span>
                <h3 className="font-bn font-bold text-[0.95rem] text-ink mb-2">{f.title}</h3>
                <p className="font-bn text-[0.8rem] text-ink-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Guidelines section */}
      <div className="bg-cream-dark px-6 md:px-12 lg:px-24 py-16 lg:py-20 border-t border-ink/5">
        <div className="max-w-[1200px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-16"
          >
            <div className="shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className="text-forest" />
                <span className="font-body font-bold text-[0.7rem] tracking-wider uppercase text-forest">বিশেষজ্ঞ-অনুমোদিত নির্দেশিকা</span>
              </div>
              <h3 className="font-display text-2xl lg:text-3xl font-black text-ink">আন্তর্জাতিক মানদণ্ড অনুসরণ</h3>
              <p className="font-bn text-[0.82rem] text-ink-muted mt-2 max-w-[320px] leading-relaxed">
                আমাদের সকল ডায়েট পরামর্শ এই নির্ভরযোগ্য আন্তর্জাতিক পুষ্টি নির্দেশিকার ভিত্তিতে তৈরি।
              </p>
            </div>
            <div className="flex flex-wrap gap-3 flex-1">
              {guidelines.map((g, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className={`border rounded-2xl px-5 py-4 ${g.color} flex flex-col min-w-[140px]`}
                >
                  <span className="font-display font-black text-xl mb-0.5">{g.code}</span>
                  <span className="font-bn text-[0.62rem] leading-tight opacity-80">{g.full}</span>
                  <span className="font-body text-[0.58rem] tracking-wider uppercase opacity-60 mt-1">{g.country}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
