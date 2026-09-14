import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Bot, Salad, ClipboardList, Activity, FileBarChart2, BookOpen, ShieldCheck } from 'lucide-react';

export const FeaturesSection = () => {
  const { i18n } = useTranslation();
  const isBn = i18n.language === 'bn';

  const features = [
    {
      icon: Bot,
      num: '01',
      title: isBn ? 'AI ডায়েটিশিয়ান চ্যাট' : 'AI Clinical Dietitian Chat',
      desc: isBn
        ? 'বাংলায় আপনার ডায়েট, পুষ্টি ও স্বাস্থ্য সংক্রান্ত যেকোনো প্রশ্ন করুন। ব্যক্তিগতকৃত, তাৎক্ষণিক উত্তর পান।'
        : 'Ask any question about your diet, local recipes, and health. Receive instant, evidence-based clinical guidance.',
      color: 'bg-ink text-cream',
    },
    {
      icon: Salad,
      num: '02',
      title: isBn ? 'স্বয়ংক্রিয় মিল প্ল্যান' : 'Automated Meal Plans',
      desc: isBn
        ? '৩২০+ বাংলাদেশি খাবার থেকে আপনার রোগ, ক্যালোরি লক্ষ্য ও পছন্দ অনুযায়ী দৈনিক খাবার তালিকা তৈরি হয় স্বয়ংক্রিয়ভাবে।'
        : 'Scientifically crafted daily meal plans based on 320+ local dishes, calibrated to your health conditions and macro targets.',
      color: 'bg-forest text-cream',
    },
    {
      icon: Activity,
      num: '03',
      title: isBn ? 'স্বাস্থ্য লগ ও ট্র্যাকিং' : 'Biometric Health Logging',
      desc: isBn
        ? 'ওজন, রক্তচাপ, রক্তের শর্করা, HbA1c প্রতিদিন রেকর্ড করুন। ভিজুয়াল চার্টে সময়ের সাথে অগ্রগতি দেখুন।'
        : 'Log weight, blood pressure, glucose, and HbA1c with ease. Monitor your progress with interactive visual charts.',
      color: 'bg-accent text-cream',
    },
    {
      icon: ClipboardList,
      num: '04',
      title: isBn ? 'ওষুধ রিমাইন্ডার' : 'Smart Medicine Reminders',
      desc: isBn
        ? 'AI-চালিত প্রেসক্রিপশন পার্সার দিয়ে ওষুধের তালিকা তৈরি করুন। সময়মতো রিমাইন্ডার পেয়ে কোনো ডোজ মিস করবেন না।'
        : 'Parse medicine routines naturally via AI and set timely reminders aligned with your meal schedule.',
      color: 'bg-gold text-cream',
    },
    {
      icon: BookOpen,
      num: '05',
      title: isBn ? 'খাবার ডেটাবেস' : 'Bangladeshi Food Database',
      desc: isBn
        ? '৩২০+ দেশীয় খাবারের বিস্তারিত পুষ্টি তথ্য — ক্যালোরি, প্রোটিন, কার্বস, ফ্যাট, ভিটামিন ও খনিজ।'
        : 'Detailed nutritional profiles for 320+ local foods — calories, macros, vitamins, and minerals.',
      color: 'bg-purple-700 text-cream',
    },
    {
      icon: FileBarChart2,
      num: '06',
      title: isBn ? 'স্বাস্থ্য রিপোর্ট' : 'Clinical Health Reports',
      desc: isBn
        ? 'আপনার ক্যালোরি গ্রহণ, পুষ্টির মান ও স্বাস্থ্যের অগ্রগতির বিস্তারিত PDF রিপোর্ট ডাউনলোড করুন।'
        : 'Export comprehensive clinical PDF summaries detailing nutritional adherence, micronutrients, and diet verdicts.',
      color: 'bg-blue-700 text-cream',
    },
  ];

  const guidelines = [
    { code: 'NDG', full: 'National Dietary Guidelines', country: isBn ? 'বাংলাদেশ ২০২৫' : 'Bangladesh 2025', color: 'bg-[#E9EDE4] text-[#2C5530]' },
    { code: 'WHO', full: 'World Health Organization', country: isBn ? 'আন্তর্জাতিক' : 'International', color: 'bg-blue-50 text-blue-700' },
    { code: 'ICMR', full: 'Indian Council of Medical Research', country: isBn ? 'দক্ষিণ এশিয়া' : 'South Asia', color: 'bg-orange-50 text-orange-700' },
    { code: 'ADA', full: 'American Diabetes Association', country: isBn ? 'ডায়াবেটিস' : 'Diabetes', color: 'bg-red-50 text-red-700' },
    { code: 'DASH', full: 'Dietary Approaches to Stop Hypertension', country: isBn ? 'উচ্চরক্তচাপ' : 'Hypertension', color: 'bg-purple-50 text-purple-700' },
  ];

  return (
    <section className={`bg-cream ${isBn ? 'font-bn' : ''}`} id="features">
      {/* Header */}
      <div className="px-6 md:px-12 lg:px-24 pt-20 lg:pt-32 pb-16">
        <div className="max-w-[700px]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[0.62rem] tracking-[0.2em] uppercase text-ink-faint mb-4 font-body font-bold"
          >
            {isBn ? 'সম্পূর্ণ ফিচার সেট' : 'Comprehensive Feature Suite'}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-[clamp(2.2rem,5vw,3.8rem)] font-black leading-[1] tracking-tight text-ink"
          >
            {isBn ? (
              <>একটি অ্যাপে সম্পূর্ণ <span className="text-accent">পুষ্টি ব্যবস্থাপনা</span></>
            ) : (
              <>All-in-One <span className="text-accent">Nutrition Management</span></>
            )}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mt-4 text-[0.92rem] text-ink-muted leading-relaxed max-w-[500px]"
          >
            {isBn
              ? 'ডায়েট পরিকল্পনা থেকে শুরু করে স্বাস্থ্য ট্র্যাকিং, ওষুধ রিমাইন্ডার থেকে বিশেষজ্ঞ পরামর্শ — সবকিছু একসাথে।'
              : 'From personalized meal planning and biometric health tracking to medicine schedules and AI insights — everything in one place.'}
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
                <h3 className="font-bold text-[0.95rem] text-ink mb-2">{f.title}</h3>
                <p className="text-[0.8rem] text-ink-muted leading-relaxed">{f.desc}</p>
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
                <span className="font-body font-bold text-[0.7rem] tracking-wider uppercase text-forest">
                  {isBn ? 'বিশেষজ্ঞ-অনুমোদিত নির্দেশিকা' : 'Expert-Verified Guidelines'}
                </span>
              </div>
              <h3 className="font-display text-2xl lg:text-3xl font-black text-ink">
                {isBn ? 'আন্তর্জাতিক মানদণ্ড অনুসরণ' : 'International Standards'}
              </h3>
              <p className="text-[0.82rem] text-ink-muted mt-2 max-w-[320px] leading-relaxed">
                {isBn
                  ? 'আমাদের সকল ডায়েট পরামর্শ এই নির্ভরযোগ্য আন্তর্জাতিক পুষ্টি নির্দেশিকার ভিত্তিতে তৈরি।'
                  : 'All dietary recommendations are constructed upon verified international and national nutritional standards.'}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 flex-1 w-full">
              {guidelines.map((g, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`group relative overflow-hidden rounded-2xl p-4 md:p-5 ${g.color} flex flex-col hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current opacity-40 to-transparent scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
                  <span className="font-display font-black text-lg md:text-xl mb-0.5 md:mb-1">{g.code}</span>
                  <span className="text-[0.62rem] md:text-[0.68rem] leading-tight opacity-80">{g.full}</span>
                  <span className="mt-auto pt-3 font-body text-[0.55rem] tracking-wider uppercase font-bold opacity-60">{g.country}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
