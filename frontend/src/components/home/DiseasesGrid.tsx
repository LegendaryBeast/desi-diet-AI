import { motion } from 'framer-motion';

const diseases = [
  {
    emoji: '🩸',
    title: 'ডায়াবেটিস',
    en: 'Diabetes Mellitus',
    desc: 'লো-জিআই খাবার, উচ্চ আঁশ, ৫-৬ বার ছোট ছোট খাবার। চিনি এবং মিষ্টি সম্পূর্ণ এড়িয়ে চলা।',
    tag: 'রক্তে শর্করা নিয়ন্ত্রণ'
  },
  {
    emoji: '🫀',
    title: 'উচ্চ রক্তচাপ',
    en: 'Hypertension',
    desc: 'কম লবণ (দিনে ৫g-এর কম), পটাশিয়াম সমৃদ্ধ খাবার, ইলিশ মাছের ওমেগা-৩।',
    tag: 'রক্তচাপ নিয়ন্ত্রণ'
  },
  {
    emoji: '🫘',
    title: 'কিডনি রোগ',
    en: 'Chronic Kidney Disease',
    desc: 'কম প্রোটিন (০.৬-০.৭৫g/kg), পটাশিয়াম নিয়ন্ত্রণ, ফসফরাস সীমিত করা।',
    tag: 'প্রোটিন নিয়ন্ত্রণ'
  },
  {
    emoji: '⚖️',
    title: 'স্থূলতা',
    en: 'Obesity',
    desc: 'দৈনিক ৫০০ kcal কম, উচ্চ আঁশ, ভাজাপোড়া এড়িয়ে চলা, শাকসবজি বেশি।',
    tag: 'ওজন নিয়ন্ত্রণ'
  },
  {
    emoji: '🫁',
    title: 'হৃদরোগ',
    en: 'Coronary Heart Disease',
    desc: 'ইলিশ মাছ, সরিষার তেল, ঘি-ডালডা বর্জন, রঙিন শাকসবজি ও ফলমূল।',
    tag: 'হার্ট সুরক্ষা'
  },
  {
    emoji: '🦋',
    title: 'হাইপোথাইরয়েড',
    en: 'Hypothyroidism',
    desc: 'আয়োডিনযুক্ত লবণ, সামুদ্রিক মাছ, রান্না করা বাঁধাকপি-ফুলকপি।',
    tag: 'থাইরয়েড সুরক্ষা'
  }
];

export const DiseasesGrid = () => {
  return (
    <section className="bg-cream-dark px-6 md:px-12 lg:px-24 py-20 lg:py-32" id="conditions">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16 lg:mb-24 items-end">
        <motion.h2 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-black leading-[0.95] tracking-tighter text-ink"
        >
          Designed for<br /><em className="italic text-accent">your</em> condition
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="font-bn text-[0.9rem] lg:text-[1rem] leading-[1.8] text-ink-muted max-w-[480px]"
        >
          আপনার শরীরের প্রতিটি সমস্যা আলাদা। আমরা NDG 2025-এর রোগ-নির্দিষ্ট অধ্যায় থেকে সরাসরি নিয়ম এনকোড করেছি — যাতে আপনি পান সঠিক, নিরাপদ পরামর্শ।
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {diseases.map((d, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-cream p-8 lg:p-10 relative group overflow-hidden hover:translate-y-[-6px] transition-transform duration-500"
          >
            <div className="absolute top-0 left-0 w-full h-[3px] bg-accent scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
            <span className="text-[2rem] lg:text-[2.5rem] mb-6 block leading-none">{d.emoji}</span>
            <h3 className="font-bn text-[1.1rem] lg:text-[1.2rem] font-bold text-ink mb-2">{d.title}</h3>
            <span className="font-body text-[0.65rem] lg:text-[0.7rem] tracking-[0.1em] uppercase text-ink-faint block mb-6">{d.en}</span>
            <p className="font-bn text-[0.85rem] lg:text-[0.9rem] leading-[1.7] text-ink-muted mb-8">
              {d.desc}
            </p>
            <span className="inline-block px-3 py-1 bg-cream-dark text-ink-muted font-bn text-[0.7rem] lg:text-[0.75rem]">
              {d.tag}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
