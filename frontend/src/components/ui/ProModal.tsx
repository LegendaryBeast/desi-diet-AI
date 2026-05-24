import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Sparkles,
  Check,
  Loader2,
  CreditCard,
  ShieldCheck,
  X,
  RefreshCw,
  CalendarDays,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { useSubscription } from '../../contexts/SubscriptionContext';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Reason the modal opened — affects the header message */
  trigger?: 'chat_limit' | 'regenerate' | 'tomorrow' | 'general';
}

const TRIGGER_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  chat_limit: {
    title: 'আপনার ফ্রি মেসেজ শেষ!',
    subtitle: 'আরো কথা বলতে প্রো সাবস্ক্রিপশন নিন',
  },
  regenerate: {
    title: 'ফ্রি প্ল্যানে পুনরায় তৈরি সম্ভব নয়',
    subtitle: 'প্ল্যান রিজেনারেট করতে প্রো প্ল্যানে আপগ্রেড করুন',
  },
  tomorrow: {
    title: 'আগামীকালের প্ল্যান প্রো ফিচার',
    subtitle: 'অ্যাডভান্স মিল প্ল্যানিং-এর জন্য প্রো নিন',
  },
  general: {
    title: 'DesiDiet Pro তে আপগ্রেড করুন',
    subtitle: 'আনলিমিটেড ফিচার উপভোগ করুন',
  },
};

const PRO_FEATURES = [
  { icon: MessageSquare, text: 'আনলিমিটেড AI চ্যাট', textEn: 'Unlimited AI chat' },
  { icon: RefreshCw, text: 'মিল প্ল্যান রিজেনারেট', textEn: 'Regenerate meal plans' },
  { icon: CalendarDays, text: 'আগামীকালের প্ল্যান', textEn: "Tomorrow's meal plan" },
  { icon: Zap, text: 'অগ্রাধিকার AI রেসপন্স', textEn: 'Priority AI responses' },
];

type PaymentStep = 'idle' | 'processing' | 'verifying' | 'success';

export const ProModal: React.FC<ProModalProps> = ({ isOpen, onClose, trigger = 'general' }) => {
  const { subscribe } = useSubscription();
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');

  useEffect(() => {
    if (!isOpen) setPaymentStep('idle');
  }, [isOpen]);

  const triggerMsg = TRIGGER_MESSAGES[trigger] || TRIGGER_MESSAGES.general;

  const handleSubscribe = async () => {
    setPaymentStep('processing');
    // Simulate bKash/card processing
    await new Promise((r) => setTimeout(r, 2000));
    setPaymentStep('verifying');
    await new Promise((r) => setTimeout(r, 1500));
    setPaymentStep('success');
    subscribe();
    // Auto-close after success animation
    setTimeout(() => {
      onClose();
    }, 2200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={paymentStep === 'idle' ? onClose : undefined}
            className="absolute inset-0 bg-ink/60 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            {paymentStep === 'idle' && (
              <button
                onClick={onClose}
                className="absolute top-5 right-5 z-10 p-2 rounded-xl bg-white/80 text-ink-muted hover:text-ink hover:bg-cream transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Header gradient */}
            <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-8 pb-12 text-white overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

              <motion.div
                initial={{ rotate: -15, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', delay: 0.15 }}
                className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5 border border-white/20"
              >
                <Crown className="w-7 h-7 text-white" />
              </motion.div>

              <h2 className="font-display text-2xl font-black leading-snug">
                {triggerMsg.title}
              </h2>
              <p className="font-bn text-sm text-white/80 mt-2">{triggerMsg.subtitle}</p>
            </div>

            {/* Body */}
            <div className="p-7 -mt-4 relative">
              {/* Pricing card */}
              <div className="bg-gradient-to-br from-cream to-white border border-ink/5 rounded-2xl p-5 mb-6 shadow-sm">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-display text-4xl font-black text-ink">৳500</span>
                  <span className="font-bn text-sm text-ink-muted font-bold">/মাস</span>
                </div>
                <p className="font-bn text-xs text-ink-faint">DesiDiet Pro সাবস্ক্রিপশন</p>
              </div>

              {/* Feature list */}
              <div className="space-y-3 mb-7">
                {PRO_FEATURES.map((feat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                      <feat.icon className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex-1">
                      <span className="font-bn text-sm font-bold text-ink">{feat.text}</span>
                      <span className="font-body text-[0.62rem] text-ink-faint ml-2 uppercase tracking-wider">{feat.textEn}</span>
                    </div>
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                  </motion.div>
                ))}
              </div>

              {/* Payment button / animation */}
              <AnimatePresence mode="wait">
                {paymentStep === 'idle' && (
                  <motion.button
                    key="subscribe-btn"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={handleSubscribe}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-bn font-black text-lg rounded-2xl shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  >
                    <Sparkles className="w-5 h-5" />
                    সাবস্ক্রাইব করুন — ৳500/মাস
                  </motion.button>
                )}

                {paymentStep === 'processing' && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full py-4 bg-ink text-cream font-bn font-bold text-base rounded-2xl flex items-center justify-center gap-3"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <CreditCard className="w-5 h-5" />
                    </motion.div>
                    পেমেন্ট প্রসেস হচ্ছে...
                    <div className="flex gap-1 ml-2">
                      {[0, 1, 2].map((d) => (
                        <motion.div
                          key={d}
                          className="w-1.5 h-1.5 bg-accent rounded-full"
                          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: d * 0.15 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {paymentStep === 'verifying' && (
                  <motion.div
                    key="verifying"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full py-4 bg-blue-600 text-white font-bn font-bold text-base rounded-2xl flex items-center justify-center gap-3"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    পেমেন্ট ভেরিফাই হচ্ছে...
                  </motion.div>
                )}

                {paymentStep === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bn font-bold text-base rounded-2xl flex items-center justify-center gap-3 relative overflow-hidden"
                  >
                    {/* Success confetti-like particles */}
                    {Array.from({ length: 12 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                          background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A8E6CF', '#FFE66D', '#FF8A65'][i % 6],
                          left: `${10 + Math.random() * 80}%`,
                          top: `${10 + Math.random() * 80}%`,
                        }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{
                          scale: [0, 1.5, 0],
                          opacity: [0, 1, 0],
                          y: [0, -30 - Math.random() * 40],
                          x: [-20 + Math.random() * 40, -20 + Math.random() * 40],
                        }}
                        transition={{ duration: 1.2, delay: i * 0.06, ease: 'easeOut' }}
                      />
                    ))}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.3, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      <ShieldCheck className="w-6 h-6" />
                    </motion.div>
                    সাবস্ক্রিপশন সফল! 🎉
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Secure badge */}
              <div className="flex items-center justify-center gap-2 mt-4 text-[0.62rem] text-ink-faint uppercase tracking-widest font-bold">
                <ShieldCheck className="w-3 h-3" />
                SSL সুরক্ষিত পেমেন্ট • যেকোনো সময় বাতিল করুন
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
