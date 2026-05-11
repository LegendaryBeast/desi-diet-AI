import React from 'react';
import { motion } from 'framer-motion';

export const Manifesto = () => {
  return (
    <section className="bg-cream py-24 md:py-40 px-6 md:px-12 lg:px-24">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        {/* Large Decorative Text */}
        <div className="lg:col-span-5 relative">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:sticky lg:top-40"
          >
            <h2 className="font-display text-[8rem] md:text-[12rem] font-black text-ink/5 leading-none absolute -top-20 -left-10 select-none">
              2025
            </h2>
            <h3 className="font-display text-5xl md:text-7xl font-black text-ink leading-[0.95] mb-8">
              Our <br /><em className="italic text-accent">Manifesto</em>
            </h3>
            <div className="w-20 h-2 bg-accent mb-8" />
            <p className="font-bn text-xl md:text-2xl text-ink-muted leading-relaxed">
              আমরা বিশ্বাস করি, স্বাস্থ্যকর খাবার মানেই কেবল নামী-দামী রেসিপি নয়; বরং আমাদের পরিচিত বাংলাদেশি খাবারের সঠিক ভারসাম্য।
            </p>
          </motion.div>
        </div>

        {/* Content Blocks - Now side-by-side on mobile */}
        <div className="lg:col-span-7 grid grid-cols-3 lg:grid-cols-1 gap-4 md:gap-16 lg:gap-24">
          {[
            {
              title: "বিজ্ঞান",
              fullTitle: "বিজ্ঞান ভিত্তিক পরামর্শ",
              desc: "WHO এবং NDG 2025 ভিত্তিক পরামর্শ।",
              fullDesc: "বিশ্ব স্বাস্থ্য সংস্থা (WHO) এবং বাংলাদেশের জাতীয় পুষ্টি নির্দেশিকা (NDG 2025) এর ওপর ভিত্তি করে আমাদের প্রতিটি পরামর্শ তৈরি করা হয়েছে।",
              num: "01"
            },
            {
              title: "এআই",
              fullTitle: "কৃত্রিম বুদ্ধিমত্তা ও GraphRAG",
              desc: "উন্নত GraphRAG প্রযুক্তির সঠিক ব্যবহার।",
              fullDesc: "আমরা শুধু সাধারণ চ্যাটবট নই। আমরা ব্যবহার করি উন্নত GraphRAG প্রযুক্তি, যা আপনার শারীরিক অবস্থা ও খাবারের ডেটাবেজের মধ্যে সঠিক যোগসূত্র তৈরি করে।",
              num: "02"
            },
            {
              title: "সবাই",
              fullTitle: "সবার জন্য স্বাস্থ্য",
              desc: "সহজবোধ্য ভাষায় সঠিক স্বাস্থ্য তথ্য।",
              fullDesc: "শহর থেকে গ্রাম—সব মানুষের জন্য সহজবোধ্য ভাষায় স্বাস্থ্য তথ্য পৌঁছে দেওয়াই আমাদের মূল লক্ষ্য।",
              num: "03"
            }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: i * 0.1 }}
              className="group border-b lg:border-b border-ink/5 pb-2 md:pb-12 last:border-0 text-center lg:text-left flex flex-col items-center lg:items-start transition-all"
            >
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-2 md:gap-8">
                <span className="font-display text-2xl md:text-6xl font-black text-ink/10 group-hover:text-accent/20 transition-colors">
                  {item.num}
                </span>
                <div>
                  <h4 className="font-bn text-sm md:text-3xl font-bold text-ink mb-2 md:mb-6">
                    <span className="lg:hidden">{item.title}</span>
                    <span className="hidden lg:inline">{item.fullTitle}</span>
                  </h4>
                  <p className="font-bn text-[0.6rem] md:text-lg text-ink-muted leading-relaxed max-w-xl">
                    <span className="lg:hidden">{item.desc}</span>
                    <span className="hidden lg:inline">{item.fullDesc}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
