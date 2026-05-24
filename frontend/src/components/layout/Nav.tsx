import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

export const Nav = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAboutPage = location.pathname === '/about';
  const isLightNav = isAboutPage && !scrolled;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const menuItems = [
    { href: '/#features', label: t('nav.features')},
    { to: '/about', label: t('nav.about')},
    { to: '/conditions', label: t('nav.conditions')}
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 25 },
    show: { 
      opacity: 1, 
      x: 0, 
      transition: { 
        type: 'spring', 
        stiffness: 150, 
        damping: 18 
      } 
    }
  };

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 px-4 lg:px-12 py-4 lg:py-6 flex justify-between items-center ${
          (scrolled && !mobileMenuOpen) ? 'bg-cream/95 backdrop-blur-md border-b border-ink/10 py-3 lg:py-4' : 'bg-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
      >
        {/* Logo - Stays on the left side, doesn't get covered by the right side drawer */}
        <Link 
          to="/" 
          className={`font-bn text-[1.1rem] font-bold tracking-[0.02em] transition-colors z-[101] ${
            isLightNav ? 'text-cream' : 'text-ink'
          }`}
        >
          {t('nav.logo')}<span className="text-accent">{t('nav.logo_span')}</span>
        </Link>

        <ul className="hidden md:flex items-center gap-6 lg:gap-10 list-none">
          <li>
            <a href="/#features" className={`text-[0.65rem] lg:text-[0.75rem] tracking-[0.12em] uppercase transition-colors interactive ${isLightNav ? 'text-cream/70 hover:text-cream' : 'text-ink-muted hover:text-ink'}`}>
              {t('nav.features')}
            </a>
          </li>
          <li>
            <Link to="/about" className={`text-[0.65rem] lg:text-[0.75rem] tracking-[0.12em] uppercase transition-colors interactive ${isLightNav ? 'text-cream/70 hover:text-cream' : 'text-ink-muted hover:text-ink'}`}>
              {t('nav.about')}
            </Link>
          </li>
          <li>
            <Link to="/conditions" className={`text-[0.65rem] lg:text-[0.75rem] tracking-[0.12em] uppercase transition-colors interactive ${isLightNav ? 'text-cream/70 hover:text-cream' : 'text-ink-muted hover:text-ink'}`}>
              {t('nav.conditions')}
            </Link>
          </li>
        </ul>

        <div className="flex items-center gap-4 lg:gap-6">
          <button 
            onClick={() => i18n.changeLanguage(i18n.language === 'bn' ? 'en' : 'bn')}
            className={`font-bn text-[0.85rem] lg:text-[0.95rem] font-bold hover:text-accent interactive px-3 py-1 border rounded-full transition-colors flex items-center justify-center min-w-[40px] z-[101] ${
              (isLightNav && !mobileMenuOpen) ? 'text-cream border-cream/20' : 'text-ink border-ink/10'
            }`}
          >
            {i18n.language === 'bn' ? 'EN' : 'বাং'}
          </button>
          {isLoggedIn ? (
            <Link to="/dashboard" className="hidden sm:block">
              <button className={`text-[0.65rem] lg:text-[0.75rem] tracking-[0.1em] uppercase px-4 lg:px-6 py-2 lg:py-2.5 border transition-all font-body interactive ${
                isLightNav 
                  ? 'border-cream text-cream hover:bg-cream hover:text-ink' 
                  : 'border-ink bg-transparent text-ink hover:bg-ink hover:text-cream'
              }`}>
                {i18n.language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}
              </button>
            </Link>
          ) : (
            <Link to="/auth" className="hidden sm:block">
              <button className={`text-[0.65rem] lg:text-[0.75rem] tracking-[0.1em] uppercase px-4 lg:px-6 py-2 lg:py-2.5 border transition-all font-body interactive ${
                isLightNav 
                  ? 'border-cream text-cream hover:bg-cream hover:text-ink' 
                  : 'border-ink bg-transparent text-ink hover:bg-ink hover:text-cream'
              }`}>
                {t('nav.start')}
              </button>
            </Link>
          )}
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 z-[101] interactive relative w-8 h-8 flex flex-col justify-center gap-1.5 ${
              (isLightNav && !mobileMenuOpen) ? 'text-cream' : 'text-ink'
            }`}
          >
            <motion.div 
              animate={mobileMenuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
              className={`w-6 h-px transition-colors ${
                (isLightNav && !mobileMenuOpen) ? 'bg-cream' : 'bg-ink'
              }`} 
            />
            <motion.div 
              animate={mobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
              className={`w-6 h-px transition-colors ${
                (isLightNav && !mobileMenuOpen) ? 'bg-cream' : 'bg-ink'
              }`} 
            />
            <motion.div 
              animate={mobileMenuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
              className={`w-6 h-px transition-colors ${
                (isLightNav && !mobileMenuOpen) ? 'bg-cream' : 'bg-ink'
              }`} 
            />
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Translucent Dimmed Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-ink/35 backdrop-blur-[2px] z-[89] md:hidden"
            />

            {/* Right Side Drawer (1/3 size on tablets, beautiful sidebar on mobile) */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-[80vw] sm:w-[340px] bg-cream z-[90] flex flex-col justify-between border-l border-ink/10 shadow-[0_0_50px_rgba(0,0,0,0.12)] md:hidden"
            >
              {/* Ambient Background Glows */}
              <div className="absolute top-[-10%] right-[-10%] w-[200px] h-[200px] bg-accent/5 rounded-full blur-[70px] pointer-events-none" />
              <div className="absolute bottom-[-10%] left-[-10%] w-[200px] h-[200px] bg-gold/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="w-full h-full flex flex-col justify-between px-6 pt-28 pb-10 overflow-y-auto relative z-10">
                
                {/* Navigation Links */}
                <motion.ul 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-6 my-auto list-none pl-2"
                >
                  {menuItems.map((item, index) => {
                    const content = (
                      <div className="flex items-baseline group cursor-pointer py-1">
                        <span className="font-bn text-2xl font-bold text-ink group-hover:text-accent transition-colors duration-300 relative pb-1 block">
                          {item.label}
                          <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-accent group-hover:w-full transition-all duration-300" />
                        </span>
                      </div>
                    );

                    return (
                      <motion.li key={index} variants={itemVariants}>
                        {item.href ? (
                          <a href={item.href} onClick={() => setMobileMenuOpen(false)}>
                            {content}
                          </a>
                        ) : (
                          <Link to={item.to || '/'} onClick={() => setMobileMenuOpen(false)}>
                            {content}
                          </Link>
                        )}
                      </motion.li>
                    );
                  })}
                </motion.ul>

                {/* Bottom CTA / Footer Section */}
                <div className="mt-auto pt-6 flex flex-col gap-4">
                  <div className="w-full h-px bg-ink/5 mb-2" />
                  
                  {isLoggedIn ? (
                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="w-full">
                      <button className="w-full py-3.5 bg-ink text-cream font-bn text-sm tracking-[0.1em] uppercase hover:bg-accent transition-all duration-300 flex items-center justify-center gap-2 group">
                        <span>{i18n.language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                    </Link>
                  ) : (
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="w-full">
                      <button className="w-full py-3.5 bg-ink text-cream font-bn text-sm tracking-[0.1em] uppercase hover:bg-accent transition-all duration-300 flex items-center justify-center gap-2 group">
                        <span>{t('nav.start')}</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                    </Link>
                  )}

                  <p className="font-bn text-[0.78rem] text-ink-muted text-center mt-2 leading-relaxed max-w-[260px] mx-auto">
                    {i18n.language === 'bn' 
                      ? 'বাংলাদেশের মানুষের জন্য, বাংলাদেশের বিজ্ঞান দিয়ে তৈরি পুষ্টি সহায়ক।' 
                      : 'Personalized AI nutrition grounded in Bangladeshi science.'}
                  </p>

                  <div className="text-center mt-2 flex flex-col gap-1">
                    <span className="font-body text-[0.62rem] text-ink-faint tracking-wider uppercase">
                      © {new Date().getFullYear()} DesiDiet AI
                    </span>
                    <span className="font-bn text-[0.62rem] text-accent/60 tracking-wider">
                      {i18n.language === 'bn' 
                        ? 'NDG ২০২৫ ভিত্তিক পুষ্টি সহায়ক' 
                        : 'Based on NDG Bangladesh 2025'}
                    </span>
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
