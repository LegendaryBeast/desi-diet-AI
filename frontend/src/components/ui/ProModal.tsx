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
  Heart,
  Users,
  Stethoscope,
  Baby,
  Star,
  ChevronRight,
} from 'lucide-react';
import { useSubscription, SubscriptionTier } from '../../contexts/SubscriptionContext';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Reason the modal opened — affects the header message */
  trigger?: 'chat_limit' | 'regenerate' | 'tomorrow' | 'general';
}

const TRIGGER_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  chat_limit: {
    title: 'আপনার ফ্রি মেসেজ শেষ!',
    subtitle: 'আরো কথা বলতে একটি প্ল্যান বেছে নিন',
  },
  regenerate: {
    title: 'ফ্রি প্ল্যানে পুনরায় তৈরি সম্ভব নয়',
    subtitle: 'প্ল্যান রিজেনারেট করতে আপগ্রেড করুন',
  },
  tomorrow: {
    title: 'আগামীকালের প্ল্যান প্রো ফিচার',
    subtitle: 'অ্যাডভান্স মিল প্ল্যানিং-এর জন্য আপগ্রেড করুন',
  },
  general: {
    title: 'আপনার প্ল্যান বেছে নিন',
    subtitle: 'আপনার প্রয়োজন অনুযায়ী সেরা প্ল্যান সিলেক্ট করুন',
  },
};

interface PlanTier {
  id: SubscriptionTier;
  name: string;
  nameEn: string;
  price: number;
  badge?: string;
  badgeColor?: string;
  gradient: string;
  borderColor: string;
  iconBg: string;
  features: { icon: React.ElementType; text: string; textEn: string }[];
  highlighted?: boolean;
}

const PLAN_TIERS: PlanTier[] = [
  {
    id: 'basic',
    name: 'বেসিক',
    nameEn: 'Basic',
    price: 99,
    gradient: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-200',
    iconBg: 'bg-emerald-500/10 text-emerald-600',
    features: [
      { icon: MessageSquare, text: 'সীমিত AI চ্যাট', textEn: 'Limited AI chat' },
      { icon: CalendarDays, text: 'সীমিত মিল জেনারেশন', textEn: 'Limited meal generation' },
      { icon: Stethoscope, text: '১ বার নিউট্রিশনিস্ট সাপোর্ট', textEn: '1x Nutritionist support' },
    ],
  },
  {
    id: 'pro',
    name: 'প্রো',
    nameEn: 'Pro',
    price: 399,
    badge: 'জনপ্রিয়',
    badgeColor: 'from-amber-400 to-orange-500',
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    borderColor: 'border-orange-300',
    iconBg: 'bg-orange-500/10 text-orange-600',
    highlighted: true,
    features: [
      { icon: Zap, text: 'আনলিমিটেড সব ফিচার', textEn: 'Unlimited all features' },
      { icon: Baby, text: 'ম্যাটার্নাল সাপোর্ট', textEn: 'Maternal support' },
      { icon: RefreshCw, text: 'মিল প্ল্যান রিজেনারেট', textEn: 'Regenerate meal plans' },
      { icon: Stethoscope, text: '৩ বার নিউট্রিশনিস্ট সাপোর্ট', textEn: '3x Nutritionist support' },
    ],
  },
  {
    id: 'premium',
    name: 'ফ্যামিলি',
    nameEn: 'Family',
    price: 999,
    badge: '৫ জন সদস্য',
    badgeColor: 'from-violet-500 to-purple-600',
    gradient: 'from-violet-500 via-purple-600 to-fuchsia-600',
    borderColor: 'border-purple-200',
    iconBg: 'bg-purple-500/10 text-purple-600',
    features: [
      { icon: Users, text: '৫ সদস্য যুক্ত করুন', textEn: '5 members included' },
      { icon: Zap, text: 'আনলিমিটেড সব ফিচার', textEn: 'Unlimited everything' },
      { icon: Baby, text: 'ম্যাটার্নাল সাপোর্ট', textEn: 'Maternal support' },
      { icon: Stethoscope, text: '৬ বার নিউট্রিশনিস্ট সাপোর্ট', textEn: '6x Nutritionist support' },
    ],
  },
];

type PaymentStep = 'idle' | 'processing' | 'verifying' | 'success';

export const ProModal: React.FC<ProModalProps> = ({ isOpen, onClose, trigger = 'general' }) => {
  const { subscribe } = useSubscription();
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(PLAN_TIERS[1]); // default: Pro

  useEffect(() => {
    if (!isOpen) {
      setPaymentStep('idle');
      setSelectedPlan(PLAN_TIERS[1]);
    }
  }, [isOpen]);

  const triggerMsg = TRIGGER_MESSAGES[trigger] || TRIGGER_MESSAGES.general;

  const handleSubscribe = async () => {
    setPaymentStep('processing');
    // Simulate bKash/card processing
    await new Promise((r) => setTimeout(r, 2000));
    setPaymentStep('verifying');
    await new Promise((r) => setTimeout(r, 1500));
    setPaymentStep('success');
    subscribe(selectedPlan.id);
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
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={paymentStep === 'idle' ? onClose : undefined}
            className="absolute inset-0 bg-ink/60 backdrop-blur-md z-[99999]"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="relative w-full max-w-[52rem] bg-white rounded-[2rem] shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto z-[99999]"
          >
            {/* Close button */}
            {paymentStep === 'idle' && (
              <button
                onClick={onClose}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/80 text-ink-muted hover:text-ink hover:bg-cream transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Header gradient */}
            <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 px-6 py-5 text-white overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

              <div className="flex items-center gap-4">
              <motion.div
                initial={{ rotate: -15, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', delay: 0.15 }}
                className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 shrink-0"
              >
                <Crown className="w-5 h-5 text-white" />
              </motion.div>

              <div>
              <h2 className="font-display text-xl font-black leading-snug">
                {triggerMsg.title}
              </h2>
              <p className="font-bn text-xs text-white/80 mt-0.5">{triggerMsg.subtitle}</p>
              </div>
              </div>
            </div>

            {/* Body — Plan Selector */}
            <div className="p-4 md:p-5 relative">
              {/* Plan Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {PLAN_TIERS.map((plan, idx) => {
                  const isSelected = selectedPlan.id === plan.id;
                  return (
                    <motion.button
                      key={plan.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.08 }}
                      onClick={() => paymentStep === 'idle' && setSelectedPlan(plan)}
                      disabled={paymentStep !== 'idle'}
                      className={`group 
                        relative text-left rounded-xl p-4 border-2 transition-all duration-300 cursor-pointer
                        ${isSelected
                          ? `${plan.borderColor} bg-gradient-to-br from-white to-cream shadow-lg ring-2 ring-offset-2 ${
                              plan.id === 'basic' ? 'ring-emerald-400' :
                              plan.id === 'pro' ? 'ring-orange-400' :
                              'ring-purple-400'
                            } scale-[1.03]`
                          : 'border-ink/8 bg-white hover:border-ink/15 hover:shadow-md'
                        }
                        ${plan.highlighted && !isSelected ? 'border-orange-200 bg-orange-50/30' : ''}
                      `}
                    >
                      {/* Badge */}
                      {plan.badge && (
                        <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-px bg-gradient-to-r ${plan.badgeColor} text-white text-[0.55rem] font-bold uppercase tracking-wider rounded-full shadow-lg font-bn`}>
                          {plan.badge}
                        </div>
                      )}

                      {/* Plan Header */}
                      <div className="mb-3 pt-0.5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${plan.iconBg}`}>
                            {plan.id === 'basic' && <Star className="w-3.5 h-3.5" />}
                            {plan.id === 'pro' && <Crown className="w-3.5 h-3.5" />}
                            {plan.id === 'premium' && <Users className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <span className="font-bn text-xs font-bold text-ink">{plan.name}</span>
                            <span className="text-[0.55rem] text-ink-faint ml-1 uppercase tracking-wider font-bold">{plan.nameEn}</span>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="font-display text-2xl font-black text-ink">৳{plan.price}</span>
                          <span className="font-bn text-[0.65rem] text-ink-muted font-bold">/মাস</span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className={`h-px mb-3 ${isSelected ? `bg-gradient-to-r ${plan.gradient} opacity-30` : 'bg-ink/8'}`} />

                      {/* Feature list */}
                      <div className="space-y-2">
                        {plan.features.map((feat, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${plan.iconBg}`}>
                              <feat.icon className="w-2.5 h-2.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bn text-[0.7rem] font-bold text-ink leading-tight">{feat.text}</p>
                              <p className="text-[0.5rem] text-ink-faint uppercase tracking-wider font-bold leading-tight">{feat.textEn}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Selection indicator */}
                      <div className={`mt-3 w-full py-1.5 rounded-lg text-center text-[0.7rem] font-bold font-bn transition-all ${
                        isSelected
                          ? `bg-gradient-to-r ${plan.gradient} text-white shadow-md`
                          : 'bg-ink/5 text-ink-muted'
                      }`}>
                        {isSelected ? '✓ নির্বাচিত' : 'সিলেক্ট করুন'}
                      </div>
                    </motion.button>
                  );
                })}
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
                    className={`w-full py-3 bg-gradient-to-r ${selectedPlan.gradient} text-white font-bn font-black text-base rounded-xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2`}
                    style={{
                      boxShadow: selectedPlan.id === 'basic'
                        ? '0 10px 40px -10px rgba(16, 185, 129, 0.4)'
                        : selectedPlan.id === 'pro'
                        ? '0 10px 40px -10px rgba(249, 115, 22, 0.4)'
                        : '0 10px 40px -10px rgba(139, 92, 246, 0.4)',
                    }}
                  >
                    <Sparkles className="w-5 h-5" />
                    {selectedPlan.name} সাবস্ক্রাইব করুন — ৳{selectedPlan.price}/মাস
                    <ChevronRight className="w-4 h-4 ml-1" />
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
                    {selectedPlan.name} সাবস্ক্রিপশন সফল! 🎉
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
