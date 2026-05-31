import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '../lib/translations';
import { colors, fonts } from '../lib/theme';
import {
  ChefHat,
  Send,
  Trash2,
  HeartPulse,
  ArrowLeft,
} from 'lucide-react-native';
import { useAuthStore } from '../store/auth-store';
import { profileApi } from '../lib/api';

const DISEASE_MAPPING: Record<string, string> = {
  'Diabetes': 'Diabetes',
  'Hypertension': 'Hypertension',
  'Obesity': 'Obesity',
  'Anemia': 'Anemia',
  'Asthma': 'Asthma',
  'Bronchitis': 'Bronchitis',
  'Burns': 'Burns',
  'Cancer': 'Cancer',
  'Chronic Kidney Disease': 'Chronic Kidney Disease',
  'Kidney Disease': 'Chronic Kidney Disease',
  'Coronary Heart Disease': 'Coronary Heart Disease',
  'Heart Disease': 'Coronary Heart Disease',
  'Diarrhea': 'Diarrhoea',
  'Diarrhoea': 'Diarrhoea',
  'Hypothyroidism': 'Hypothyroidism',
  'Thyroid Disorders': 'Hypothyroidism',
  'Kidney Stones': 'Kidney Stones',
  'Liver Disease': 'Liver Disease',
  'Tuberculosis': 'Tuberculosis',
  'Tuberculosis (TB)': 'Tuberculosis',
};

const CONDITION_TRANSLATIONS: Record<string, { en: string; bn: string }> = {
  'None': { en: 'None', bn: 'কোনোটিই নয়' },
  'Anemia': { en: 'Anemia', bn: 'রক্তশূন্যতা' },
  'Asthma': { en: 'Asthma', bn: 'অ্যাজমা' },
  'Bronchitis': { en: 'Bronchitis', bn: 'ব্রঙ্কাইটিস' },
  'Burns': { en: 'Burns', bn: 'পুড়ে যাওয়া' },
  'Cancer': { en: 'Cancer', bn: 'ক্যান্সার' },
  'Chronic Kidney Disease': { en: 'Chronic Kidney Disease', bn: 'কিডনি রোগ' },
  'Coronary Heart Disease': { en: 'Coronary Heart Disease', bn: 'হৃদরোগ' },
  'Diabetes': { en: 'Diabetes', bn: 'ডায়াবেটিস' },
  'Diarrhoea': { en: 'Diarrhoea', bn: 'ডায়রিয়া' },
  'Hypertension': { en: 'Hypertension', bn: 'উচ্চ রক্তচাপ' },
  'Hypothyroidism': { en: 'Hypothyroidism', bn: 'থাইরয়েড সমস্যা' },
  'Kidney Stones': { en: 'Kidney Stones', bn: 'কিডনি পাথর' },
  'Liver Disease': { en: 'Liver Disease', bn: 'লিভারের রোগ' },
  'Obesity': { en: 'Obesity', bn: 'স্থূলতা' },
  'Tuberculosis': { en: 'Tuberculosis', bn: 'যক্ষ্মা' },
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function PersonalCookerScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const isBn = language === 'bn';
  const { user } = useAuthStore();

  const [condition, setCondition] = useState('None');
  const [availableConditions, setAvailableConditions] = useState<string[]>(['None']);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const sessionId = `pc_${user?.id || 'guest'}_${new Date().toISOString().slice(0, 10)}`;
  const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://desi-diet-backend.onrender.com';

  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // 1. Fetch user profile once on mount to determine available conditions
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = useAuthStore.getState().accessToken;
        const profileRes = await fetch(`${API_BASE}/profile`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const medicalConditions = profileData?.profile?.medical_conditions || [];
          
          const matched = new Set<string>();
          for (const cond of medicalConditions) {
            if (DISEASE_MAPPING[cond]) {
              matched.add(DISEASE_MAPPING[cond]);
            }
          }
          const matchedConditions = Array.from(matched);
          if (matchedConditions.length > 0) {
            setAvailableConditions([...matchedConditions, 'None']);
            setCondition(matchedConditions[0]);
          } else {
            setAvailableConditions(['None']);
            setCondition('None');
          }
        }
      } catch (e) {
        console.error('Failed to fetch profile in personal cooker:', e);
      } finally {
        setIsProfileLoading(false);
      }
    };
    fetchProfile();
  }, [API_BASE]);

  // 2. Load history when condition changes or profile loading finishes
  useEffect(() => {
    if (isProfileLoading) return;

    const loadHistory = async () => {
      try {
        const token = useAuthStore.getState().accessToken;
        const res = await fetch(
          `${API_BASE}/personal-cooker/history?session_id=${sessionId}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.history?.length > 0) {
            setMessages(data.history);
            return;
          }
        }
      } catch { /* silent fail */ }

      const translatedCondition = isBn
        ? (CONDITION_TRANSLATIONS[condition]?.bn || condition)
        : (CONDITION_TRANSLATIONS[condition]?.en || condition);

      setMessages([
        {
          role: 'assistant',
          content: isBn
            ? `👋 আমি নুট্রিসাথী — আপনার ব্যক্তিগত রান্নাঘর সহায়ক। আমি বিভিন্ন রোগের জন্য উপযুক্ত রেসিপি, রান্নার পদ্ধতি এবং খাবারের নিরাপত্তা পরামর্শ দিতে পারি।\n\nআজকের জন্য আপনার শরীরিক অবস্থা: ${translatedCondition}`
            : `👋 I am NutriSaathi — your personal cooking assistant. I can suggest recipes, cooking methods, and food safety advice tailored to your health condition.\n\nToday's condition: ${condition}`,
        },
      ]);
    };
    loadHistory();
  }, [sessionId, isBn, condition, isProfileLoading, API_BASE]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${API_BASE}/personal-cooker/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userMsg,
          condition,
          session_id: sessionId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: isBn
              ? 'দুঃখিত, আমি এই মুহূর্তে উত্তর দিতে পারছি না। অনুগ্রহ করে আবার চেষ্টা করুন।'
              : 'Sorry, I could not process your request right now. Please try again.',
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: isBn
            ? 'নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন।'
            : 'Network error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      const token = useAuthStore.getState().accessToken;
      await fetch(
        `${API_BASE}/personal-cooker/history?session_id=${sessionId}`,
        {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
    } catch { /* ignore */ }

    const translatedCondition = isBn
      ? (CONDITION_TRANSLATIONS[condition]?.bn || condition)
      : (CONDITION_TRANSLATIONS[condition]?.en || condition);

    setMessages([
      {
        role: 'assistant',
        content: isBn
          ? `👋 আমি নুট্রিসাথী — আপনার ব্যক্তিগত রান্নাঘর সহায়ক। আমি বিভিন্ন রোগের জন্য উপযুক্ত রেসিপি, রান্নার পদ্ধতি এবং খাবারের নিরাপত্তা পরামর্শ দিতে পারি।\n\nআজকের জন্য আপনার শরীরিক অবস্থা: ${translatedCondition}`
          : `👋 I am NutriSaathi — your personal cooking assistant. I can suggest recipes, cooking methods, and food safety advice tailored to your health condition.\n\nToday's condition: ${condition}`,
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <ChefHat size={20} color={colors.primary} />
            <Text style={styles.headerTitle}>
              {isBn ? 'নিজের রান্নাঘর' : 'Personal Cooker'}
            </Text>
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.backBtn}>
            <Trash2 size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Condition selector */}
        <View style={styles.conditionBar}>
          <HeartPulse size={16} color={colors.accent} />
          {isProfileLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 10 }} />
          ) : (
            <>
              <Text style={styles.conditionLabel}>
                {isBn ? 'প্রোফাইল থেকে: ' : 'From profile: '}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 4 }}>
                {availableConditions.map((c) => {
                  const displayName = isBn
                    ? (CONDITION_TRANSLATIONS[c]?.bn || c)
                    : (CONDITION_TRANSLATIONS[c]?.en || c);
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setCondition(c)}
                      style={[
                        styles.conditionChip,
                        condition === c && styles.conditionChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.conditionChipText,
                          condition === c && styles.conditionChipTextActive,
                        ]}
                      >
                        {displayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {availableConditions.length === 1 && availableConditions[0] === 'None' && (
                <TouchableOpacity 
                  onPress={() => router.push('/(tabs)/profile')}
                  style={styles.updateProfileLink}
                >
                  <Text style={styles.updateProfileLinkText}>
                    {isBn ? 'যোগ করুন' : 'Add Info'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        >
          {messages.map((msg, idx) => (
            <View
              key={idx}
              style={[
                styles.messageBubble,
                msg.role === 'user'
                  ? styles.userBubble
                  : styles.assistantBubble,
              ]}
            >
              {msg.role === 'assistant' && (
                <View style={styles.assistantHeader}>
                  <ChefHat size={14} color={colors.primary} />
                  <Text style={styles.assistantLabel}>NutriSaathi</Text>
                </View>
              )}
              <Text
                style={[
                  styles.messageText,
                  msg.role === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {msg.content}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={styles.assistantBubble}>
              <View style={styles.assistantHeader}>
                <ChefHat size={14} color={colors.primary} />
                <Text style={styles.assistantLabel}>NutriSaathi</Text>
              </View>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={
              isBn
                ? 'একটি রেসিপি বা খাবারের নিরাপত্তা জিজ্ঞাসা করুন...'
                : 'Ask for a recipe or food safety advice...'
            }
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={loading || !input.trim()}
            style={[
              styles.sendBtn,
              (loading || !input.trim()) && { opacity: 0.4 },
            ]}
          >
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    fontFamily: fonts.body,
  },
  conditionBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  conditionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  conditionChipActive: {
    backgroundColor: colors.primary + '20',
  },
  conditionChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fonts.body,
  },
  conditionChipTextActive: {
    color: colors.primary,
    fontWeight: '600' as const,
  },
  conditionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600' as const,
    marginLeft: 6,
    fontFamily: fonts.body,
  },
  updateProfileLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    marginLeft: 'auto',
  },
  updateProfileLinkText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600' as const,
    fontFamily: fonts.body,
  },
  messageBubble: {
    maxWidth: '85%' as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end' as const,
    backgroundColor: colors.textPrimary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start' as const,
    backgroundColor: '#F5F5F5',
    borderBottomLeftRadius: 4,
  },
  assistantHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 4,
  },
  assistantLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.primary,
    fontFamily: fonts.body,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.body,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: colors.textPrimary,
  },
  inputBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.textPrimary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
