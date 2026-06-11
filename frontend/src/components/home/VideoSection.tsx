import { motion } from 'framer-motion';

export const VideoSection = () => {
  return (
    <section className="px-6 md:px-12 lg:px-24 py-20 lg:py-32 bg-cream relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-4"
        >
          <span className="inline-block px-4 py-1.5 bg-accent/10 text-accent font-bn text-sm font-semibold rounded-full mb-4">
            ভিডিও পরিচিতি
          </span>
          <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-black leading-[1] tracking-tight text-ink mb-4">
            কিভাবে কাজ করে?
          </h2>
          <p className="font-bn text-[0.95rem] lg:text-[1.05rem] leading-[1.8] text-ink-muted max-w-[520px] mx-auto">
            ডেসি ডায়েট কীভাবে আপনার পুষ্টি পরিকল্পনা তৈরি করে তা জানতে ভিডিওটি দেখুন।
          </p>
        </motion.div>

        {/* Video container */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
          className="mt-10 relative group"
        >
          {/* Glow ring behind the card */}
          <div className="absolute -inset-1 bg-gradient-to-br from-accent/30 via-transparent to-forest/20 rounded-3xl blur-xl opacity-60 group-hover:opacity-90 transition-opacity duration-500" />

          {/* Card wrapper */}
          <div className="relative bg-white/80 backdrop-blur-sm border border-ink/5 rounded-3xl shadow-2xl shadow-ink/10 overflow-hidden p-3 sm:p-4">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 */ }}>
              <iframe
                className="absolute inset-0 w-full h-full rounded-2xl"
                src="https://www.youtube.com/embed/b_bTzmIBPus"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
