import { motion, AnimatePresence } from 'framer-motion';

export const PageLoader = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ y: '-100%', transition: { duration: 1, ease: [0.76, 0, 0.24, 1] } }}
      className="fixed inset-0 bg-ink z-[1000] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Cinematic Mesh Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[100px] rounded-full animate-pulse delay-1000" />
      </div>

      <div className="relative flex flex-col items-center z-10">
        {/* Central Logo with Progress Ring */}
        <div className="relative mb-16">
          {/* Outer Rotating Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-6 rounded-full border border-dashed border-accent/20"
          />
          
          {/* Main Logo Container */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="absolute inset-0 bg-accent/40 blur-[40px] animate-pulse rounded-full" />
            
            <div className="relative w-28 h-28 lg:w-36 lg:h-36 bg-[#1A1714] rounded-[2.5rem] flex items-center justify-center shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] border border-white/5 overflow-hidden group">
              {/* Internal glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <img 
                src="/favicon.svg" 
                alt="DesiDiet AI" 
                className="w-16 h-16 lg:w-20 lg:h-20 drop-shadow-2xl"
              />
            </div>
          </motion.div>

          {/* Progress Dot */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -inset-2"
          >
            <div className="w-2 h-2 bg-accent rounded-full absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_15px_rgba(200,71,42,0.8)]" />
          </motion.div>
        </div>

        {/* Text Content */}
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="font-bn text-[2.5rem] lg:text-[3.5rem] font-bold text-cream tracking-tight leading-none mb-4"
          >
            দেশিডায়েট এআই
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col items-center"
          >
            <div className="h-px w-12 bg-accent/40 mb-4" />
            <span className="text-[0.65rem] lg:text-[0.7rem] uppercase tracking-[0.4em] font-body text-accent font-bold">
              Powered by NDG 2025
            </span>
          </motion.div>
        </div>
      </div>
      
      {/* Background large text */}
      <motion.div
        animate={{ 
          opacity: [0.02, 0.04, 0.02],
          scale: [1, 1.05, 1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-12 font-display text-[15vw] font-black text-white pointer-events-none select-none tracking-tighter"
      >
        DESIDIET
      </motion.div>
    </motion.div>
  );
};
