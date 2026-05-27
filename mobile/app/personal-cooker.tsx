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

const CONDITIONS = [
  'None', 'Anemia', 'Asthma', 'Bronchitis', 'Burns', 'Cancer',
  'Chronic Kidney Disease', 'Coronary Heart Disease', 'Diabetes',
  'Diarrhoea', 'Hypertension', 'Hypothyroidism', 'Kidney Stones',
  'Liver Disease', 'Obesity', 'Tuberculosis',
];

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

  // Load history on mount
  useEffect(() => {
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
      setMessages([
        {
          role: 'assistant',
          content: isBn
            ? `👋 আমি নুট্রিসাথী — আপনার ব্যক্তিগত রান্নাঘর সহায়ক। আমি বিভিন্ন রোগের জন্য উপযুক্ত রেসিপি, রান্নার পদ্ধতি এবং খাবারের নিরাপত্তা পরামর্শ দিতে পারি।\n\nআজকের জন্য আপনার শরীরিক অবস্থা: ${condition}`
            : `👋 I am NutriSaathi — your personal cooking assistant. I can suggest recipes, cooking methods, and food safety advice tailored to your health condition.\n\nToday's condition: ${condition}`,
        },
      ]);
    };
    loadHistory();
  }, [sessionId, isBn, condition, API_BASE]);

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
    setMessages([
      {
        role: 'assistant',
        content: isBn
          ? `👋 আমি নুট্রিসাথী — আপনার ব্যক্তিগত রান্নাঘর সহায়ক। আমি বিভিন্ন রোগের জন্য উপযুক্ত রেসিপি, রান্নার পদ্ধতি এবং খাবারের নিরাপত্তা পরামর্শ দিতে পারি।\n\nআজকের জন্য আপনার শরীরিক অবস্থা: ${condition}`
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 8 }}>
            {CONDITIONS.map((c) => (
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
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
