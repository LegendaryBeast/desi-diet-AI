import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, Animated, Platform, Dimensions
} from 'react-native';
import {
  Crown, Sparkles, Check, CreditCard, ShieldCheck, X,
  RefreshCw, CalendarDays, MessageSquare, Zap
} from 'lucide-react-native';
import { colors, fonts, spacing, radius } from '../../lib/theme';
import { useSubscription } from '../../context/SubscriptionContext';
import { useHaptics } from '../../hooks/useHaptics';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'chat_limit' | 'regenerate' | 'tomorrow' | 'general';
}

const { width } = Dimensions.get('window');

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
    title: 'PushtiAI Pro তে আপগ্রেড করুন',
    subtitle: 'আনলিমিটেড ফিচার উপভোগ করুন',
  },
};

const PRO_FEATURES = [
  { icon: MessageSquare, text: 'আনলিমিটেড AI চ্যাট', textEn: 'UNLIMITED AI CHAT' },
  { icon: RefreshCw, text: 'মিল প্ল্যান রিজেনারেট', textEn: 'REGENERATE MEAL PLANS' },
  { icon: CalendarDays, text: 'আগামীকালের প্ল্যান', textEn: "TOMORROW'S MEAL PLAN" },
  { icon: Zap, text: 'অগ্রাধিকার AI রেসপন্স', textEn: 'PRIORITY AI RESPONSES' },
];

type PaymentStep = 'idle' | 'processing' | 'verifying' | 'success';

export default function ProModal({ isOpen, onClose, trigger = 'general' }: ProModalProps) {
  const { subscribe } = useSubscription();
  const haptics = useHaptics();
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');

  // Animation variables
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [opacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isOpen) {
      setPaymentStep('idle');
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [isOpen]);

  const triggerMsg = TRIGGER_MESSAGES[trigger] || TRIGGER_MESSAGES.general;

  const handleSubscribe = async () => {
    haptics.medium();
    setPaymentStep('processing');
    
    // Simulate bkash/card payment processing
    await new Promise((r) => setTimeout(r, 2000));
    setPaymentStep('verifying');
    
    await new Promise((r) => setTimeout(r, 1500));
    haptics.success();
    setPaymentStep('success');
    subscribe();

    // Auto-close after success
    setTimeout(() => {
      onClose();
    }, 2200);
  };

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      onRequestClose={paymentStep === 'idle' ? onClose : undefined}
    >
      <View style={styles.overlay}>
        {/* Backdrop Tap Target */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={paymentStep === 'idle' ? onClose : undefined}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }
          ]}
        >
          {/* Close button */}
          {paymentStep === 'idle' && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={colors.white} />
            </TouchableOpacity>
          )}

          {/* Header Block with Gradient-like Orange Background */}
          <View style={styles.header}>
            <View style={styles.crownContainer}>
              <Crown size={30} color={colors.white} strokeWidth={2.5} />
            </View>
            <Text style={styles.headerTitle}>{triggerMsg.title}</Text>
            <Text style={styles.headerSubtitle}>{triggerMsg.subtitle}</Text>
          </View>

          {/* Body Block */}
          <View style={styles.body}>
            {/* Pricing Box */}
            <View style={styles.pricingBox}>
              <View style={styles.pricingRow}>
                <Text style={styles.priceSymbol}>৳</Text>
                <Text style={styles.priceAmount}>500</Text>
                <Text style={styles.pricePeriod}>/মাস</Text>
              </View>
              <Text style={styles.pricingSub}>PushtiAI Pro সাবস্ক্রিপশন</Text>
            </View>

            {/* Feature List */}
            <View style={styles.featureList}>
              {PRO_FEATURES.map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <View key={i} style={styles.featureItem}>
                    <View style={styles.featureIconWrapper}>
                      <Icon size={16} color={colors.primary} />
                    </View>
                    <View style={styles.featureTextWrapper}>
                      <Text style={styles.featureTitle}>{feat.text}</Text>
                      <Text style={styles.featureSubtitleEn}>{feat.textEn}</Text>
                    </View>
                    <Check size={16} color={colors.success} strokeWidth={3} />
                  </View>
                );
              })}
            </View>

            {/* Action buttons */}
            {paymentStep === 'idle' && (
              <TouchableOpacity style={styles.actionBtn} onPress={handleSubscribe} activeOpacity={0.9}>
                <Sparkles size={18} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.actionBtnText}>সাবস্ক্রাইব করুন — ৳৫০০/মাস</Text>
              </TouchableOpacity>
            )}

            {paymentStep === 'processing' && (
              <View style={[styles.statusBox, { backgroundColor: colors.textPrimary }]}>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={styles.statusText}>পেমেন্ট প্রসেস হচ্ছে...</Text>
              </View>
            )}

            {paymentStep === 'verifying' && (
              <View style={[styles.statusBox, { backgroundColor: '#2563EB' }]}>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={styles.statusText}>পেমেন্ট ভেরিফাই হচ্ছে...</Text>
              </View>
            )}

            {paymentStep === 'success' && (
              <View style={[styles.statusBox, { backgroundColor: colors.success }]}>
                <ShieldCheck size={20} color={colors.white} />
                <Text style={styles.statusText}>সাবস্ক্রিপশন সফল! 🎉</Text>
              </View>
            )}

            {/* Security Note */}
            <View style={styles.securityNote}>
              <ShieldCheck size={12} color={colors.textSecondary} />
              <Text style={styles.securityNoteText}>SSL সুরক্ষিত পেমেন্ট • যেকোনো সময় বাতিল করুন</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: width * 0.9,
    backgroundColor: colors.white,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    padding: 6,
    borderRadius: 14,
  },
  header: {
    backgroundColor: '#FF6B35',
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  crownContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 22,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 30,
  },
  headerSubtitle: {
    fontFamily: fonts.bn,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 6,
  },
  body: {
    padding: 24,
    marginTop: -20,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  pricingBox: {
    backgroundColor: '#FDFCF7',
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.2)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceSymbol: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    color: colors.textPrimary,
    marginRight: 2,
  },
  priceAmount: {
    fontFamily: fonts.bodyBold,
    fontSize: 36,
    color: colors.textPrimary,
  },
  pricePeriod: {
    fontFamily: fonts.bnBold,
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  pricingSub: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  featureList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrapper: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  featureSubtitleEn: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  actionBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    fontFamily: fonts.bnBold,
    fontSize: 16,
    color: colors.white,
  },
  statusBox: {
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontFamily: fonts.bnBold,
    fontSize: 15,
    color: colors.white,
  },
  securityNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
  },
  securityNoteText: {
    fontFamily: fonts.bn,
    fontSize: 10,
    color: colors.textSecondary,
  },
});
