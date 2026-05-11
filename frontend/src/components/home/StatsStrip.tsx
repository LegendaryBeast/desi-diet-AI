import { motion } from 'framer-motion';

const stats = [
  { value: '11', suffix: '+', label: 'রোগের জন্য বিশেষ ডায়েট রুলস' },
  { value: '200', suffix: '+', label: 'বাংলাদেশি খাবারের পুষ্টি ডেটাবেজ' },
  { value: '2430', suffix: '', label: 'kcal গড় প্রাপ্তবয়স্ক বাংলাদেশি লক্ষ্যমাত্রা' },
  { value: '100', suffix: '%', label: 'NDG 2025 ভিত্তিক বৈজ্ঞানিক পরামর্শ' },
];

export const StatsStrip = () => {
  return (
    <section className="bg-ink text-cream py-16 lg:py-24 px-6 md:px-12 lg:px-24 relative overflow-hidden">
      <div className="absolute bottom-[-2rem] right-8 font-display text-[8rem] lg:text-[12rem] font-black opacity-[0.03] pointer-events-none select-none tracking-tighter">
        NDG 2025
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 relative z-10">
        {stats.map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="border-l border-white/10 pl-6 lg:pl-8"
          >
            <div className="font-display text-[2.5rem] lg:text-[3.5rem] font-black leading-none mb-4 flex items-baseline">
              {s.value}
              <span className="text-accent-light text-[1.5rem] lg:text-[2rem] ml-1">{s.suffix}</span>
            </div>
            <div className="font-bn text-[0.75rem] lg:text-[0.85rem] text-white/50 leading-[1.6]">
              {s.label.split('<br />').map((line, j) => (
                <span key={j} className="block">{line}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
