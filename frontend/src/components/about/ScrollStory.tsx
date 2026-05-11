import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const chapters = [
  {
    title: "The Core Science",
    titleBn: "পুষ্টির মূল বিজ্ঞান",
    desc: "আমরা প্রতিটি খাবারের উপাদানের গভীরে যাই। প্রোটিন থেকে মাইক্রোনিউট্রিয়েন্ট—সবকিছুর সঠিক হিসাব আমাদের নখদর্পণে।",
    image: "/images/story_1.png"
  },
  {
    title: "Tradition Reimagined",
    titleBn: "ঐতিহ্যের নতুন রূপ",
    desc: "বাঙালি খাবারের স্বাদ অক্ষুণ্ণ রেখেই আমরা তৈরি করি আধুনিক ডায়েট প্ল্যান। আপনার প্রিয় ইলিশ কিংবা খিচুড়ি—সবই থাকবে তালিকায়।",
    image: "/images/story_2.png"
  },
  {
    title: "Intelligence & Growth",
    titleBn: "এআই ও অগ্রগতি",
    desc: "GraphRAG প্রযুক্তির মাধ্যমে আমরা আপনার স্বাস্থ্যের ডেটা বিশ্লেষণ করি, যা আপনাকে দেয় ভবিষ্যতের জন্য সঠিক দিকনির্দেশনা।",
    image: "/images/story_3.png"
  }
];

const ChapterVisualContainer = ({ index, scrollYProgress, total }: { index: number, scrollYProgress: any, total: number }) => {
  const opacity = useTransform(
    scrollYProgress,
    [index / total, (index + 0.4) / total, (index + 0.6) / total, (index + 1) / total],
    [0, 1, 1, 0]
  );

  const scale = useTransform(
    scrollYProgress,
    [index / total, (index + 0.5) / total, (index + 1) / total],
    [1.1, 1, 0.95]
  );

  return (
    <motion.div 
      style={{ opacity, scale }}
      className="absolute inset-0 z-0"
    >
      <img 
        src={chapters[index].image} 
        alt={chapters[index].title}
        className="w-full h-full object-cover grayscale-[20%] brightness-[85%]"
      />
      <div className="absolute inset-0 bg-ink/20" />
    </motion.div>
  );
};

const ChapterText = ({ chapter, index, scrollYProgress, total }: { chapter: any, index: number, scrollYProgress: any, total: number }) => {
  const opacity = useTransform(
    scrollYProgress,
    [index / total, (index + 0.2) / total, (index + 0.8) / total, (index + 1) / total],
    [0, 1, 1, 0]
  );

  const y = useTransform(
    scrollYProgress,
    [index / total, (index + 0.2) / total, (index + 0.8) / total, (index + 1) / total],
    [100, 0, 0, -100]
  );

  return (
    <motion.div 
      style={{ opacity, y }}
      className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 lg:px-24 pointer-events-none"
    >
      <span className="font-display text-[8rem] md:text-[15rem] font-black text-ink/5 absolute top-1/2 left-0 -translate-y-1/2 select-none leading-none z-0">
        0{index + 1}
      </span>
      <div className="relative z-10">
        <h2 className="font-display text-4xl md:text-8xl font-black text-ink leading-[0.85] mb-6 uppercase tracking-tighter">
          {chapter.title.split(' ').map((word: string, i: number) => (
            <React.Fragment key={i}>
              {i === 1 ? <span className="italic text-accent">{word}</span> : word}{' '}
              {i === 0 && <br />}
            </React.Fragment>
          ))}
        </h2>
        <h3 className="font-bn text-2xl md:text-4xl font-bold text-accent-light mb-8">
          {chapter.titleBn}
        </h3>
        <p className="font-bn text-lg md:text-xl text-ink-muted leading-relaxed max-w-lg">
          {chapter.desc}
        </p>
      </div>
    </motion.div>
  );
};

const ProgressIndicator = ({ index, scrollYProgress, total }: { index: number, scrollYProgress: any, total: number }) => {
  const width = useTransform(
    scrollYProgress,
    [index / total, (index + 0.1) / total, (index + 0.9) / total, (index + 1) / total],
    [12, 40, 40, 12]
  );

  const backgroundColor = useTransform(
    scrollYProgress,
    [index / total, (index + 0.1) / total, (index + 0.9) / total, (index + 1) / total],
    ["#1A171420", "#C8472A", "#C8472A", "#1A171420"]
  );

  return (
    <motion.div 
      style={{ width, backgroundColor }}
      className="h-1 rounded-full transition-all duration-300"
    />
  );
};

export const ScrollStory = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div ref={containerRef} className="relative min-h-0 lg:min-h-[400vh] bg-cream">
      {/* Mobile Grid View - Optimized */}
      <div className="lg:hidden py-12 px-4 bg-cream">
        <h2 className="font-display text-4xl font-black text-ink mb-8 text-center uppercase tracking-tighter">
          Our <span className="italic text-accent">Story</span>
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {chapters.map((chapter, i) => (
            <div key={i} className="flex flex-col gap-4">
              <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl border border-ink/5">
                <img 
                  src={chapter.image} 
                  alt={chapter.title} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center">
                <h4 className="font-bn font-black text-sm text-ink mb-2 leading-tight">{chapter.titleBn}</h4>
                <p className="font-bn text-[0.65rem] text-ink-muted leading-tight opacity-60 line-clamp-2">
                  {chapter.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Sticky Scroll View - Fixed Side-by-Side */}
      <div className="hidden lg:flex sticky top-0 h-screen w-full flex-row overflow-hidden">
        {/* Left Panel: Text Content */}
        <div className="w-1/2 h-full bg-cream flex flex-col justify-center relative z-10">
          {chapters.map((chapter, i) => (
            <ChapterText 
              key={i} 
              chapter={chapter} 
              index={i} 
              scrollYProgress={scrollYProgress} 
              total={chapters.length} 
            />
          ))}

          {/* Progress indicators */}
          <div className="absolute left-6 md:left-12 lg:left-24 bottom-6 md:bottom-12 flex lg:flex-col gap-3 md:gap-4 z-20">
            {chapters.map((_, i) => (
              <ProgressIndicator 
                key={i} 
                index={i} 
                scrollYProgress={scrollYProgress} 
                total={chapters.length} 
              />
            ))}
          </div>
        </div>

        {/* Right Panel: Visual Content */}
        <div className="w-1/2 h-full bg-ink relative">
          {chapters.map((_, i) => (
            <ChapterVisualContainer 
              key={i} 
              index={i} 
              scrollYProgress={scrollYProgress} 
              total={chapters.length} 
            />
          ))}
        </div>

        <div className="absolute right-4 md:right-12 bottom-8 md:bottom-12 text-[0.5rem] md:text-[0.6rem] tracking-[0.4em] uppercase text-ink-faint [writing-mode:vertical-rl] flex items-center gap-2 md:gap-4 font-body pointer-events-none mix-blend-difference opacity-50 md:opacity-100">
          The Sequence
          <motion.div 
            animate={{ y: [0, 40, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-px h-16 md:h-24 bg-accent origin-top"
          />
        </div>
      </div>
    </div>
  );
};
