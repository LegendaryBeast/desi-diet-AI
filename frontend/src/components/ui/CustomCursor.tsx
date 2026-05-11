import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const CustomCursor = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show cursor on desktop and non-touch devices
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isDesktop = window.innerWidth >= 1024;
    
    if (isTouch || !isDesktop) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    const mouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY
      });
    };

    window.addEventListener("mousemove", mouseMove);

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    const interactives = document.querySelectorAll(".interactive, a, button");
    interactives.forEach(el => {
      el.addEventListener("mouseenter", handleMouseEnter);
      el.addEventListener("mouseleave", handleMouseLeave);
    });

    return () => {
      window.removeEventListener("mousemove", mouseMove);
      interactives.forEach(el => {
        el.removeEventListener("mouseenter", handleMouseEnter);
        el.removeEventListener("mouseleave", handleMouseLeave);
      });
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 w-2.5 h-2.5 bg-accent rounded-full pointer-events-none z-[9999] mix-blend-difference"
        animate={{
          x: mousePosition.x - 5,
          y: mousePosition.y - 5,
          scale: isHovered ? 0.6 : 1
        }}
        transition={{ type: "spring", damping: 30, stiffness: 400, mass: 0.5 }}
      />
      <motion.div
        className="fixed top-0 left-0 w-9 h-9 border border-ink rounded-full pointer-events-none z-[9998] opacity-40"
        animate={{
          x: mousePosition.x - 18,
          y: mousePosition.y - 18,
          scale: isHovered ? 1.6 : 1,
          opacity: isHovered ? 0.2 : 0.4
        }}
        transition={{ type: "spring", damping: 25, stiffness: 250, mass: 0.8 }}
      />
    </>
  );
};
