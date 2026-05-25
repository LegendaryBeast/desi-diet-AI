import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { colors, fonts, spacing, radius } from '../../lib/theme';
import { Send, Bot, Sparkles, ArrowLeft, CheckCircle2, RotateCcw, CalendarDays, TrendingUp, Flame } from 'lucide-react-native';
import { dietPlanChatApi, profileApi, mealPlanApi } from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHaptics } from '../../hooks/useHaptics';
import EventSource from 'react-native-sse';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

const WELCOME_MSG: Message = {
  role: 'assistant',
  content: 'হ্যালো!  আমি পুষ্টি এআই। আমি আপনাকে কীভাবে সহায়তা করতে পারি?',
  id: 'welcome',
};

export default function DietPlanChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const haptics = useHaptics();

  useEffect(() => {
    // Fetch profile to personalize greetings and starter states
    profileApi.get().then((res) => {
      if (res.data?.profile) {
        setProfile(res.data.profile);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const restartFlow = () => {
    haptics.light();
    setMessages([WELCOME_MSG]);
    setPlanReady(false);
    setInput('');
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming || planReady) return;
    haptics.light();

    const userMsg: Message = { role: 'user', content, id: `u_${Date.now()}` };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    const assistantId = `a_${Date.now()}`;
    setMessages((prev) => [...prev, { role: 'assistant', content: '', id: assistantId }]);

    try {
      const token = await AsyncStorage.getItem('access_token');

      const es = new EventSource(dietPlanChatApi.streamUrl, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
        body: JSON.stringify({
          message: content,
          language: 'bn',
          history: messages
            .filter((m) => m.role !== 'assistant' || m.content) // skip empty typing bubbles
            .slice(-20)  // last 20 turns (enough for all 7 questions)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      let accumulated = '';

      es.addEventListener('message', (event) => {
        if (event.data) {
          try {
            const data = JSON.parse(event.data);
            if (data.token) {
              accumulated += data.token;
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m)
              );
            } else if (data.status === 'generating_plan') {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: accumulated + '\n\nপরিকল্পনা তৈরি করা হচ্ছে... অনুগ্রহ করে একটু অপেক্ষা করুন। ⏳' } : m)
              );
            } else if (data.plan_ready) {
              setPlanReady(true);
              haptics.success();
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: data.plan_ready.message_bn } : m)
              );
            } else if (data.error) {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: accumulated + '\n\n' + data.error } : m)
              );
            }
            if (data.done) {
              es.close();
              setStreaming(false);
            }
          } catch { /* ignore parse errors */ }
        }
      });

      es.addEventListener('error', () => {
        es.close();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && !accumulated
              ? { ...m, content: 'দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। পরে আবার চেষ্টা করুন।' }
              : m
          )
        );
        setStreaming(false);
      });

    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। পরে আবার চেষ্টা করুন।' }
            : m
        )
      );
      setStreaming(false);
    }
  };

  const handlePresetPress = async (type: 'diet' | 'report' | 'calorie') => {
    haptics.medium();
    if (type === 'diet') {
      const userMsg: Message = { 
        role: 'user', 
        content: 'আজকের জন্য আমার স্বাস্থ্য অবস্থা অনুযায়ী একটি খাবার পরিকল্পনা দিন।', 
        id: `u_${Date.now()}` 
      };
      setMessages([WELCOME_MSG, userMsg]);
      setStreaming(true);

      const assistantId = `a_${Date.now()}`;
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: 'আপনার প্রোফাইল তথ্য অনুযায়ী আজকের বিশেষ ডায়েট পরিকল্পনা তৈরি করা হচ্ছে... অনুগ্রহ করে একটু অপেক্ষা করুন। ⏳', 
        id: assistantId 
      }]);

      try {
        await mealPlanApi.daily('bn', true);
        setPlanReady(true);
        haptics.success();
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { 
            ...m, 
            content: 'আপনার ডায়েট পরিকল্পনা সফলভাবে তৈরি হয়েছে! নিচের বাটনে ক্লিক করে আজকের সুষম খাবার তালিকাটি দেখুন। 🥗✨' 
          } : m)
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { 
            ...m, 
            content: 'দুঃখিত, পরিকল্পনা তৈরি করা যায়নি। অনুগ্রহ করে পরে আবার চেষ্টা করুন।' 
          } : m)
        );
      } finally {
        setStreaming(false);
      }
    } else if (type === 'report') {
      sendMessage('আমার বর্তমান শারীরিক অবস্থা এবং পুষ্টির রিপোর্ট দেখান।');
    } else if (type === 'calorie') {
      sendMessage('আমার দৈনিক ক্যালোরি ও পুষ্টির হিসাব কীভাবে করা হয়েছে?');
    }
  };

  const renderEmptyState = () => {
    const userName = profile?.name_bn || profile?.name_en || '';
    return (
      <View style={styles.presetContainer}>
        <View style={styles.botIconWrapper}>
          <Bot size={40} color={colors.white} />
          <View style={styles.botActiveBadge} />
        </View>
        
        <Text style={styles.presetUserHello}>
          {userName ? `হাই, ${userName}` : 'হাই!'}
        </Text>
        
        <Text style={styles.presetMainTitle}>
          আমি আপনাকে আজ কীভাবে সাহায্য করতে পারি?
        </Text>
        
        <Text style={styles.presetSubTitle}>
          আপনার পুষ্টি, ডায়েট এবং স্বাস্থ্য সংক্রান্ত যেকোনো প্রশ্ন জিজ্ঞাসা করুন।
        </Text>

        <View style={styles.presetGrid}>
          {/* Diet Card */}
          <TouchableOpacity 
            style={styles.presetCard} 
            activeOpacity={0.8}
            onPress={() => handlePresetPress('diet')}
          >
            <View style={[styles.presetCardIconBox, { backgroundColor: colors.primary + '15' }]}>
              <CalendarDays size={18} color={colors.primary} />
            </View>
            <View style={styles.presetCardContent}>
              <Text style={styles.presetCardTitle}>ডায়েট</Text>
              <Text style={styles.presetCardSub}>আজকের মিল প্ল্যান</Text>
            </View>
          </TouchableOpacity>

          {/* Report Card */}
          <TouchableOpacity 
            style={styles.presetCard} 
            activeOpacity={0.8}
            onPress={() => handlePresetPress('report')}
          >
            <View style={[styles.presetCardIconBox, { backgroundColor: colors.accent + '15' }]}>
              <TrendingUp size={18} color={colors.accent} />
            </View>
            <View style={styles.presetCardContent}>
              <Text style={styles.presetCardTitle}>রিপোর্ট</Text>
              <Text style={styles.presetCardSub}>আপনার শারীরিক অবস্থা</Text>
            </View>
          </TouchableOpacity>

          {/* Calorie Card */}
          <TouchableOpacity 
            style={styles.presetCard} 
            activeOpacity={0.8}
            onPress={() => handlePresetPress('calorie')}
          >
            <View style={[styles.presetCardIconBox, { backgroundColor: '#FF8C0015' }]}>
              <Flame size={18} color="#FF8C00" />
            </View>
            <View style={styles.presetCardContent}>
              <Text style={styles.presetCardTitle}>ক্যালোরি</Text>
              <Text style={styles.presetCardSub}>পুষ্টির হিসাব নিকাশ</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';
    const isStreamingLast = streaming && index === messages.length - 1 && !isUser;

    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Sparkles size={14} color={colors.primary} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          {isStreamingLast && item.content === '' ? (
            <View style={styles.typingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          ) : (
            <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextBot]}>
              {item.content}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.botAvatarLarge}>
          <Bot size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>পরিকল্পনা তৈরি</Text>
          <Text style={styles.headerSub}>এআই পুষ্টিবিদ</Text>
        </View>
        <TouchableOpacity onPress={restartFlow} style={styles.restartBtn}>
          <RotateCcw size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Conditionally render Empty State Preset or standard Message Log */}
      {messages.length <= 1 && !streaming ? (
        renderEmptyState()
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            planReady ? (
              <View style={styles.planReadyCard}>
                <View style={styles.planReadyHeader}>
                  <CheckCircle2 size={32} color={colors.success} />
                  <Text style={styles.planReadyTitle}>ডায়েট পরিকল্পনা প্রস্তুত!</Text>
                  <Text style={styles.planReadySub}>
                    আপনার ব্যক্তিগত তথ্য অনুযায়ী একটি নতুন পরিকল্পনা তৈরি করা হয়েছে।
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.viewPlanBtn}
                  onPress={() => {
                    haptics.light();
                    router.replace('/(tabs)/meals');
                  }}
                >
                  <Text style={styles.viewPlanText}>সম্পূর্ণ পরিকল্পনা দেখুন</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Input Bar */}
      {!planReady && (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="আপনার উত্তর লিখুন..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || streaming) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || streaming}
          >
            {streaming
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Send size={20} color={colors.white} strokeWidth={2} />
            }
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  botAvatarLarge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary + '20',
    borderWidth: 1.5, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.bnBold, fontSize: 18, color: colors.textPrimary },
  headerSub: { fontFamily: fonts.bn, fontSize: 13, color: colors.textSecondary },
  restartBtn: { padding: spacing.xs },

  msgList: { padding: spacing.md, paddingBottom: 20 },

  msgRow: { flexDirection: 'row', marginBottom: spacing.md, alignItems: 'flex-end', gap: spacing.sm },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot: { justifyContent: 'flex-start' },

  botAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary + '20',
    borderWidth: 1, borderColor: colors.primary + '40',
    alignItems: 'center', justifyContent: 'center',
  },

  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleBot: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  msgText: { fontFamily: fonts.bn, fontSize: 15, lineHeight: 24 },
  msgTextUser: { color: colors.white },
  msgTextBot: { color: colors.textPrimary },

  typingDots: { flexDirection: 'row', gap: 5, paddingVertical: 4, paddingHorizontal: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary + '80' },
  dot1: {}, dot2: {}, dot3: {},

  planReadyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginTop: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  planReadyHeader: { alignItems: 'center', marginBottom: spacing.lg },
  planReadyTitle: { fontFamily: fonts.bnBold, fontSize: 24, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
  planReadySub: { fontFamily: fonts.bn, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  viewPlanBtn: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    width: '100%',
    alignItems: 'center',
  },
  viewPlanText: { fontFamily: fonts.bnBold, fontSize: 16, color: colors.white },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.bn,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  presetContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  botIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#1E1E24',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  botActiveBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  presetUserHello: {
    fontFamily: fonts.bn,
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  presetMainTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    lineHeight: 32,
  },
  presetSubTitle: {
    fontFamily: fonts.bn,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
    lineHeight: 22,
  },
  presetGrid: {
    width: '100%',
    gap: spacing.md,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  presetCardIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  presetCardContent: {
    flex: 1,
  },
  presetCardTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  presetCardSub: {
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
