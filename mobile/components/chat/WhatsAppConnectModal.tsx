import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, KeyboardAvoidingView,
  SafeAreaView
} from 'react-native';
import { X, Smartphone, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
import { whatsappApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { colors, fonts, spacing, radius } from '../../lib/theme';
import { useHaptics } from '../../hooks/useHaptics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language?: 'bn' | 'en';
}

export default function WhatsAppConnectModal({ isOpen, onClose, language = 'bn' }: Props) {
  const user = useAuthStore((s) => s.user);
  const phone = user?.phone;
  const haptics = useHaptics();

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setStatus('idle');
        setErrorMessage('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        onClose();
        setStatus('idle');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  const handleSendOptin = async () => {
    haptics.medium();
    setStatus('loading');
    setErrorMessage('');
    try {
      await whatsappApi.optin();
      setStatus('success');
      haptics.success();
    } catch (err: any) {
      haptics.error();
      setStatus('error');
      if (err.response?.status === 400) {
        setErrorMessage(
          language === 'bn'
            ? 'আপনার অ্যাকাউন্টে কোনো ফোন নম্বর পাওয়া যায়নি। অনুগ্রহ করে প্রথমে প্রোফাইল আপডেট করুন।'
            : 'No phone number on your account. Please update your profile first.'
        );
      } else if (err.response?.status === 502) {
        setErrorMessage(
          language === 'bn'
            ? 'মেসেজিং সার্ভিস সাময়িকভাবে বন্ধ আছে। পরে আবার চেষ্টা করুন।'
            : 'Messaging service unavailable. Try again later.'
        );
      } else {
        setErrorMessage(
          err.response?.data?.detail ||
          err.message ||
          (language === 'bn' ? 'কিছু ভুল হয়েছে, আবার চেষ্টা করুন।' : 'Something went wrong, please try again.')
        );
      }
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.headerGradient}>
              <View style={styles.headerLeft}>
                <View style={styles.logoContainer}>
                  <FontAwesome name="whatsapp" size={24} color="#25D366" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>
                    {language === 'bn' ? 'WhatsApp-এ চ্যাট করুন' : 'Chat on WhatsApp'}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {language === 'bn' ? 'এআই-এর সাথে সরাসরি মেসেজিং' : 'Direct AI messaging'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => { haptics.light(); onClose(); }}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={styles.body}>
              {status === 'success' ? (
                <View style={styles.statusContent}>
                  <View style={[styles.statusIconBox, { backgroundColor: '#E8F5E9' }]}>
                    <CheckCircle2 size={36} color="#4CAF50" />
                  </View>
                  <Text style={styles.statusTitle}>
                    {language === 'bn' ? 'বার্তা পাঠানো হয়েছে!' : 'Message sent!'}
                  </Text>
                  <Text style={styles.statusMessage}>
                    {language === 'bn'
                      ? `আমরা ${phone}-এ আপনার WhatsApp নম্বরে একটি বার্তা পাঠিয়েছি। অনুগ্রহ করে আপনার WhatsApp ইনবক্স চেক করুন।`
                      : `We have sent a message to ${phone} on WhatsApp. Please check your inbox.`}
                  </Text>
                  <TouchableOpacity
                    onPress={() => { haptics.light(); onClose(); }}
                    style={styles.actionBtnDone}
                  >
                    <Text style={styles.actionBtnTextWhite}>
                      {language === 'bn' ? 'ঠিক আছে' : 'Done'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : !phone ? (
                <View style={styles.statusContent}>
                  <View style={[styles.statusIconBox, { backgroundColor: '#FFF3E0' }]}>
                    <Smartphone size={36} color="#FF9800" />
                  </View>
                  <Text style={styles.statusTitle}>
                    {language === 'bn' ? 'ফোন নম্বর পাওয়া যায়নি' : 'No phone number found'}
                  </Text>
                  <Text style={styles.statusMessage}>
                    {language === 'bn'
                      ? 'WhatsApp চ্যাট শুরু করার আগে অনুগ্রহ করে প্রোফাইল সেটিংসে একটি ফোন নম্বর যুক্ত করুন।'
                      : 'Please add a phone number to your profile before using WhatsApp chat.'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => { haptics.light(); onClose(); }}
                    style={styles.actionBtnDone}
                  >
                    <Text style={styles.actionBtnTextWhite}>
                      {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.optInContent}>
                  <Text style={styles.instructionText}>
                    {language === 'bn'
                      ? 'আমরা আপনার নিবন্ধিত ফোন নম্বরে প্রথম মেসেজটি পাঠাবো:'
                      : "We'll send your first message to your registered phone:"}
                  </Text>

                  {/* Phone Number Display Box */}
                  <View style={styles.phoneBox}>
                    <View style={styles.phoneIconBox}>
                      <Smartphone size={20} color="#25D366" />
                    </View>
                    <View>
                      <Text style={styles.phoneNumber}>{phone}</Text>
                      <Text style={styles.phoneLabel}>
                        {language === 'bn' ? 'নিবন্ধিত ফোন নম্বর' : 'Registered Phone'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.noticeText}>
                    {language === 'bn'
                      ? 'নিশ্চিত করার আগে নিশ্চিত করুন এই নম্বরটি WhatsApp-এ সচল আছে।'
                      : 'Make sure this number is active on WhatsApp before confirming.'}
                  </Text>

                  {/* Error Box */}
                  {status === 'error' && (
                    <View style={styles.errorBox}>
                      <AlertCircle size={16} color={colors.error} style={{ marginTop: 2 }} />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  )}

                  {/* Buttons Row */}
                  <View style={styles.buttonsRow}>
                    <TouchableOpacity
                      onPress={() => { haptics.light(); onClose(); }}
                      style={styles.cancelBtn}
                    >
                      <Text style={styles.cancelBtnText}>
                        {language === 'bn' ? 'বাতিল' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSendOptin}
                      disabled={status === 'loading'}
                      style={[styles.confirmBtn, status === 'loading' && styles.disabledBtn]}
                    >
                      {status === 'loading' ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <CheckCircle2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.actionBtnTextWhite}>
                            {language === 'bn' ? 'বার্তা পাঠান' : 'Send Message'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 21, 5, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  keyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.3)',
    shadowColor: '#0c1a06',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  headerGradient: {
    backgroundColor: '#128C7E',
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoContainer: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  body: {
    padding: spacing.lg,
  },
  statusContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statusIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  statusTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statusMessage: {
    fontFamily: fonts.bn,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  optInContent: {},
  instructionText: {
    fontFamily: fonts.bn,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  phoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F7FAF3',
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.15)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  phoneIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneNumber: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  phoneLabel: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  noticeText: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.error + '10',
    borderWidth: 1,
    borderColor: colors.error + '25',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.error,
    lineHeight: 18,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.2,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: '#FAFBF7',
  },
  cancelBtnText: {
    fontFamily: fonts.bnBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  actionBtnDone: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: '#128C7E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextWhite: {
    fontFamily: fonts.bnBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
