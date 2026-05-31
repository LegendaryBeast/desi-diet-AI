import React from 'react';
import { motion } from 'framer-motion';

interface CookingLoaderProps {
  text?: string;
}

export const CookingLoader: React.FC<CookingLoaderProps> = ({ 
  text = "AI আপনার জন্য পরিকল্পনা তৈরি করছে..." 
}) => {
  // Animation variants for the food tossing up
  const foodVariants1 = {
    animate: {
      y: [0, -60, 0],
      rotate: [0, 180, 360],
      x: [0, 15, 0],
      transition: {
        duration: 1.8,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.1
      }
    }
  };

  const foodVariants2 = {
    animate: {
      y: [0, -75, 0],
      rotate: [0, -120, -240],
      x: [0, -10, 0],
      transition: {
        duration: 1.8,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.5
      }
    }
  };

  const foodVariants3 = {
    animate: {
      y: [0, -50, 0],
      rotate: [0, 90, 180],
      x: [0, 5, 0],
      transition: {
        duration: 1.8,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.9
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 select-none">
      <div className="relative w-40 h-44 flex items-center justify-center">
        
        {/* Tossing Foods */}
        {/* Carrot slice */}
        <motion.div
          variants={foodVariants1}
          animate="animate"
          className="absolute w-4 h-4 bg-orange-500 rounded-full border border-orange-600 shadow-sm flex items-center justify-center text-[8px] z-10"
          style={{ bottom: "60px", left: "65px" }}
        >
          🥕
        </motion.div>

        {/* Broccoli */}
        <motion.div
          variants={foodVariants2}
          animate="animate"
          className="absolute w-5 h-5 bg-emerald-500 rounded-lg border border-emerald-600 shadow-sm flex items-center justify-center text-[10px] z-10"
          style={{ bottom: "60px", left: "80px" }}
        >
          🥦
        </motion.div>

        {/* Egg/Mushroom */}
        <motion.div
          variants={foodVariants3}
          animate="animate"
          className="absolute w-4.5 h-4.5 bg-yellow-400 rounded-full border border-yellow-500 shadow-sm flex items-center justify-center text-[9px] z-10"
          style={{ bottom: "60px", left: "95px" }}
        >
          🍳
        </motion.div>

        {/* Frying Pan */}
        <motion.div
          animate={{
            y: [0, 4, 0],
            rotate: [0, -6, 4, 0],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-[35px] flex items-end justify-center"
        >
          {/* Pan Body */}
          <div className="relative w-24 h-6 bg-gradient-to-b from-gray-700 to-gray-900 rounded-b-2xl border-b-4 border-gray-950 shadow-md">
            {/* Pan Inner lip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-600 rounded-t-full opacity-50" />
          </div>

          {/* Pan Handle */}
          <div 
            className="w-14 h-2.5 bg-gradient-to-r from-gray-800 to-gray-950 rounded-r-lg shadow-sm origin-left"
            style={{ 
              transform: "rotate(-12deg) translate(-2px, -3px)",
              marginLeft: "-4px" 
            }}
          />
        </motion.div>

        {/* Stove fire / heat effect */}
        <motion.div
          animate={{
            scale: [0.9, 1.1, 0.9],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-[20px] w-14 h-4 bg-gradient-to-t from-orange-500/0 via-orange-500/40 to-yellow-400/80 rounded-full blur-xs"
        />
        
        {/* Steam rising */}
        <div className="absolute bottom-[55px] flex gap-4 opacity-40">
          <motion.div
            animate={{
              y: [0, -35],
              x: [0, -4, 2, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.1,
            }}
            className="w-1 h-8 bg-gray-300 rounded-full blur-xs"
          />
          <motion.div
            animate={{
              y: [0, -40],
              x: [0, 3, -2, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.6,
            }}
            className="w-1 h-10 bg-gray-300 rounded-full blur-xs"
          />
          <motion.div
            animate={{
              y: [0, -30],
              x: [0, -2, 3, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
              delay: 1.1,
            }}
            className="w-1 h-7 bg-gray-300 rounded-full blur-xs"
          />
        </div>

      </div>

      {/* Loading message */}
      <motion.p
        animate={{
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="font-bn text-ink-muted text-sm font-bold tracking-wide mt-2 text-center"
      >
        {text}
      </motion.p>
    </div>
  );
};
