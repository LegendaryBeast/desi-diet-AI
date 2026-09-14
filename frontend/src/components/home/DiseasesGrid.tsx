import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Droplet, Activity, Stethoscope, Scale, HeartPulse, Dna, Brain, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DiseasesGrid = () => {
  const { i18n } = useTranslation();
  const isBn = i18n.language === 'bn';

  const diseases = [
    {
      Icon: Droplet,
      iconColor: 'text-forest bg-forest/10 border-forest/20',
      title: isBn ? 'ডায়াবেটিস মেলিটাস' : 'Diabetes Mellitus',
      en: 'Diabetes Mellitus',
      desc: isBn
        ? 'ADA ও NDG গাইডলাইন অনুযায়ী শর্করা নিয়ন্ত্রণ, লো গ্লাইসেমিক ইনডেক্স খাবার এবং সঠিক ফাইবার যুক্ত মিল প্ল্যান।'
        : 'Glycemic control, low GI food choices, and tailored soluble fiber intake compliant with ADA and NDG standards.',
      tag: 'Glycemic Control'
    },
    {
      Icon: Activity,
      iconColor: 'text-forest bg-forest/10 border-forest/20',
      title: isBn ? 'উচ্চ রক্তচাপ (হাইপারটেনশন)' : 'Hypertension',
      en: 'Hypertension',
      desc: isBn
        ? 'DASH ডায়েট প্রোটোকল অনুসরণ করে সোডিয়াম নিয়ন্ত্রিত, পটাশিয়াম-সমৃদ্ধ এবং হার্ট-হেলদি ফ্যাট যুক্ত পরিকল্পনা।'
        : 'DASH protocol with sodium restriction, potassium optimization, and cardioprotective healthy fats.',
      tag: 'DASH Protocol'
    },
    {
      Icon: Stethoscope,
      iconColor: 'text-forest bg-forest/10 border-forest/20',
      title: isBn ? 'কিডনি রোগ (CKD)' : 'Chronic Kidney Disease',
      en: 'Chronic Kidney Disease',
      desc: isBn
        ? 'রোগের পর্যায় (Stage 1-5) অনুযায়ী প্রোটিন, সোডিয়াম, পটাশিয়াম এবং ফসফরাস নিয়ন্ত্রিত কঠোর ডায়েটারি চার্ট।'
        : 'Strict stage-calibrated (Stage 1-5) management of protein, sodium, potassium, and phosphorus.',
      tag: 'Renal Diet'
    },
    {
      Icon: Scale,
      iconColor: 'text-forest bg-forest/10 border-forest/20',
      title: isBn ? 'ওজন নিয়ন্ত্রণ ও স্থূলতা' : 'Obesity Management',
      en: 'Obesity Management',
      desc: isBn
        ? 'স্বাস্থ্যকর ক্যালোরি ডেফিসিট, সঠিক ম্যাক্রো ডিস্ট্রিবিউশন এবং দীর্ঘমেয়াদী টেকসই ওজন কমানোর কৌশল।'
        : 'Sustainable calorie deficit modeling, balanced macronutrient ratios, and long-term metabolic health.',
      tag: 'Calorie Deficit'
    },
    {
      Icon: HeartPulse,
      iconColor: 'text-forest bg-forest/10 border-forest/20',
      title: isBn ? 'হৃদরোগ ও কোলেস্টেরল' : 'Cardiovascular Disease',
      en: 'Cardiovascular Disease',
      desc: isBn
        ? 'ট্রান্স ফ্যাট বর্জন, স্যাচুরেটেড ফ্যাট নিয়ন্ত্রণ এবং ওমেগা-৩ সমৃদ্ধ খাবার অন্তর্ভুক্ত করে কার্ডিয়াক ডায়েট।'
        : 'Elimination of trans fats, controlled saturated fats, and rich omega-3 inclusion for cardiovascular protection.',
      tag: 'Cardiac Diet'
    },
    {
      Icon: Dna,
      iconColor: 'text-forest bg-forest/10 border-forest/20',
      title: isBn ? 'থাইরয়েড ডিজঅর্ডার' : 'Hypo/Hyperthyroidism',
      en: 'Hypo/Hyperthyroidism',
      desc: isBn
        ? 'আয়োডিন অপ্টিমাইজেশন, গয়ট্রোজেনিক খাবার নিয়ন্ত্রণ এবং থাইরয়েড ফাংশন সহায়ক পুষ্টি পরিকল্পনা।'
        : 'Iodine regulation, goitrogen management, and micronutrient support for healthy thyroid function.',
      tag: 'Endocrine Support'
    },
    {
      Icon: Brain,
      iconColor: 'text-forest bg-forest/10 border-forest/20',
      title: isBn ? 'পিসিওএস (PCOS)' : 'Polycystic Ovary Syndrome',
      en: 'Polycystic Ovary Syndrome',
      desc: isBn
        ? 'ইনসুলিন রেজিস্ট্যান্স কমানোর জন্য লো-কার্ব, অ্যান্টি-ইনফ্লেমেটরি খাবার ও হরমোনাল ব্যালেন্স ডায়েট।'
        : 'Anti-inflammatory, low-glycemic dietary planning designed to alleviate insulin resistance and restore balance.',
      tag: 'Hormonal Balance'
    },
    {
      Icon: Flame,
      iconColor: 'text-forest bg-forest/10 border-forest/20',
      title: isBn ? 'গ্যাস্ট্রিক ও আলসার' : 'GERD & Peptic Ulcer',
      en: 'GERD & Peptic Ulcer',
      desc: isBn
        ? 'অ্যাসিড উৎপাদন কমায় এবং পাকস্থলী শান্ত রাখে এমন সহজপাচ্য, মসলা-নিয়ন্ত্রিত ব্লাস্ট ডায়েট রুটিন।'
        : 'Bland, digestive-friendly routines to reduce acid secretion, mucosal irritation, and nocturnal reflux.',
      tag: 'Gut Health'
    }
  ];

  return (
    <section className={`bg-cream-dark px-6 md:px-12 lg:px-24 py-20 lg:py-32 ${isBn ? 'font-bn' : ''}`} id="conditions">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-12 mb-16 lg:mb-20 items-end">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-[0.62rem] tracking-[0.2em] uppercase text-ink-faint mb-4 font-body font-bold"
            >
              {isBn ? 'রোগ-নির্দিষ্ট ব্যবস্থাপনা' : 'Condition-Specific Care'}
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="font-display text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[0.95] tracking-tighter text-ink"
            >
              {isBn ? (
                <>৭০টিরও বেশি <span className="text-accent">রোগের জন্য</span><br />সঠিক ডায়েট প্রোটোকল</>
              ) : (
                <>Clinical Nutrition for <span className="text-accent">70+ Conditions</span><br />Personalized Protocols</>
              )}
            </motion.h2>
          </div>
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-start lg:items-end"
          >
            <p className="text-[0.95rem] leading-[1.8] text-ink-muted max-w-[400px] lg:text-right mb-6">
              {isBn
                ? 'প্রতিটি রোগের জন্য আন্তর্জাতিক চিকিৎসা গাইডলাইন এবং দেশীয় খাদ্যাভ্যাসের সমন্বয়ে তৈরি নিখুঁত ডায়েট প্ল্যান।'
                : 'Precision diet protocols formulated by uniting international clinical guidelines with local culinary traditions.'}
            </p>
            <Link to="/conditions">
              <button className="text-[0.75rem] font-body uppercase tracking-wider font-bold text-accent hover:text-ink transition-colors flex items-center gap-2">
                {isBn ? 'সবগুলো দেখুন' : 'Explore All'} <span className="text-xl leading-none">→</span>
              </button>
            </Link>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {diseases.map((d, i) => {
            const Icon = d.Icon;
            return (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-ink/5 p-6 lg:p-8 rounded-2xl relative group overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-forest/50 to-transparent scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
                
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-6 transition-transform duration-300 group-hover:rotate-6 ${d.iconColor} shrink-0`}>
                  <Icon size={20} />
                </div>
                
                <h3 className="text-[1.05rem] font-bold text-ink mb-1">{d.title}</h3>
                {isBn && (
                  <span className="font-body text-[0.6rem] tracking-[0.05em] uppercase text-ink-faint block mb-4">{d.en}</span>
                )}
                
                <p className="text-[0.85rem] leading-[1.6] text-ink-muted mb-6 flex-grow">
                  {d.desc}
                </p>
                
                <div className="mt-auto self-start">
                  <div className="inline-block px-3 py-1.5 bg-cream rounded-lg text-ink-muted font-body font-medium text-[0.55rem] uppercase tracking-wider border border-ink/5">
                    {d.tag}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
