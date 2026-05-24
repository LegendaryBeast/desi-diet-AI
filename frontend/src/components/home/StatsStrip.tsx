import { motion } from 'framer-motion';

const stats = [
  { value: '৩২০', suffix: '+', label: 'বাংলাদেশি খাবারের বিস্তারিত পুষ্টি তথ্য', sub: 'ক্যালোরি · প্রোটিন · কার্বস · ফ্যাট · মাইক্রোনিউট্রিয়েন্ট' },
  { value: '৭০', suffix: '+', label: 'রোগ-নির্দিষ্ট ডায়েটারি প্রোটোকল', sub: 'ডায়াবেটিস · উচ্চরক্তচাপ · কিডনি · হার্ট · থাইরয়েড ও আরও' },
  { value: '৫', suffix: '', label: 'আন্তর্জাতিক পুষ্টি নির্দেশিকা অনুসরণ', sub: 'NDG 2025 · WHO · ICMR · ADA · DASH প্রোটোকল' },
  { value: '১০০', suffix: '%', label: 'AI-চালিত ব্যক্তিগতকৃত পরামর্শ', sub: 'আপনার বয়স, ওজন, রোগ ও লক্ষ্য অনুযায়ী' },
];

export const StatsStrip = () => {
  return (
    <section className="bg-ink text-cream py-16 lg:py-24 px-6 md:px-12 lg:px-24 relative overflow-hidden">
      {/* bg watermark */}
      <div className="absolute bottom-[-2rem] right-8 font-display text-[8rem] lg:text-[12rem] font-black opacity-[0.03] pointer-events-none select-none tracking-tighter">
        NDG 2025
      </div>
      <div className="absolute top-8 left-8 w-32 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Section label */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-[0.62rem] tracking-[0.2em] uppercase text-white/40 font-body mb-10"
      >
        প্রমাণিত তথ্য ও পরিসংখ্যান
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 relative z-10">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="border-l border-white/8 pl-6 lg:pl-8"
          >
            <div className="font-display text-[2.5rem] lg:text-[3.5rem] font-black leading-none mb-3 flex items-baseline">
              {s.value}
              <span className="text-accent text-[1.5rem] lg:text-[2rem] ml-0.5">{s.suffix}</span>
            </div>
            <div className="font-bn text-[0.78rem] lg:text-[0.88rem] text-white/80 font-semibold leading-tight mb-1.5">
              {s.label}
            </div>
            <div className="font-bn text-[0.62rem] lg:text-[0.68rem] text-white/35 leading-relaxed">
              {s.sub}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
