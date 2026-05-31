import React from 'react';
import { motion } from 'framer-motion';

interface CookingLoaderProps {
  text?: string;
}

export const CookingLoader: React.FC<CookingLoaderProps> = ({ 
  text = "AI আপনার জন্য পরিকল্পনা তৈরি করছে..." 
}) => {
  // Aggressive tossing timeline
  // Pan flips at 0s, 1.5s, 3.0s...
  // Food launches at the flip with custom easing and rotation
  const food1 = {
    animate: {
      y: [0, -85, 0],
      x: [0, 18, 0],
      rotate: [0, 270, 540],
      scale: [1, 1.25, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: [0.175, 0.885, 0.32, 1.1], // Springy ease-out-back
        delay: 0.05
      }
    }
  };

  const food2 = {
    animate: {
      y: [0, -105, 0],
      x: [0, -12, 0],
      rotate: [0, -180, -360],
      scale: [1, 1.3, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: [0.175, 0.885, 0.32, 1.1],
        delay: 0.15
      }
    }
  };

  const food3 = {
    animate: {
      y: [0, -75, 0],
      x: [0, 8, 0],
      rotate: [0, 120, 240],
      scale: [1, 1.15, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: [0.175, 0.885, 0.32, 1.1],
        delay: 0.25
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 select-none">
      <div className="relative w-44 h-48 flex items-center justify-center">
        
        {/* Tossing Foods */}
        <motion.div
          variants={food1}
          animate="animate"
          className="absolute text-2xl z-10 filter drop-shadow-md"
          style={{ bottom: "75px", left: "60px" }}
        >
          🥕
        </motion.div>

        <motion.div
          variants={food2}
          animate="animate"
          className="absolute text-2xl z-10 filter drop-shadow-md"
          style={{ bottom: "75px", left: "80px" }}
        >
          🥦
        </motion.div>

        <motion.div
          variants={food3}
          animate="animate"
          className="absolute text-2xl z-10 filter drop-shadow-md"
          style={{ bottom: "75px", left: "100px" }}
        >
          🍳
        </motion.div>

        {/* Frying Pan (Single Unified SVG - 100% alignment safety) */}
        <motion.div
          animate={{
            y: [0, -8, 4, 0],
            rotate: [0, -12, 14, 0],
            scaleX: [1, 1.05, 0.95, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-[40px] flex items-center justify-center filter drop-shadow-lg"
        >
          <svg
            width="150"
            height="50"
            viewBox="0 0 150 50"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[150px] h-[50px]"
          >
            {/* Pan body bottom curves */}
            <path
              d="M20 15C20 15 22 40 50 40H90C118 40 120 15 120 15H20Z"
              fill="url(#panGrad)"
            />
            {/* Pan inner surface lid */}
            <ellipse cx="70" cy="15" rx="50" ry="5" fill="#374151" />
            <ellipse cx="70" cy="15" rx="48" ry="3.5" fill="#1F2937" />

            {/* Pan handle */}
            <path
              d="M120 15.5C120 15.5 130 13 145 10C148 9.4 150 11.5 149 14.5C146.5 22 136 21 120 17.5"
              fill="url(#handleGrad)"
              stroke="#111827"
              strokeWidth="0.5"
            />
            {/* Handle grip detail */}
            <rect
              x="132"
              y="10"
              width="12"
              height="4.5"
              rx="1"
              transform="rotate(-10 132 10)"
              fill="#111827"
            />

            <defs>
              <linearGradient id="panGrad" x1="70" y1="15" x2="70" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4B5563" />
                <stop offset="0.7" stopColor="#1F2937" />
                <stop offset="1" stopColor="#111827" />
              </linearGradient>
              <linearGradient id="handleGrad" x1="120" y1="15" x2="150" y2="15" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1F2937" />
                <stop offset="1" stopColor="#030712" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        {/* Stove Fire / Heat waves */}
        <motion.div
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 0.75,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-[22px] w-20 h-5 bg-gradient-to-t from-orange-600/0 via-orange-500/50 to-yellow-400/90 rounded-full blur-sm"
        />

        {/* Steam */}
        <div className="absolute bottom-[60px] flex gap-5 opacity-40">
          <motion.div
            animate={{
              y: [0, -45],
              x: [0, -6, 4, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.1,
            }}
            className="w-1.5 h-10 bg-gray-200 rounded-full blur-[2px]"
          />
          <motion.div
            animate={{
              y: [0, -55],
              x: [0, 5, -4, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.5,
            }}
            className="w-1.5 h-12 bg-gray-200 rounded-full blur-[2px]"
          />
          <motion.div
            animate={{
              y: [0, -35],
              x: [0, -3, 5, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.9,
            }}
            className="w-1.5 h-8 bg-gray-200 rounded-full blur-[2px]"
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
