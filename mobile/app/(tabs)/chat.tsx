import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image, Alert
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, fonts, spacing, radius } from '../../lib/theme';
import {
  Send, Bot, Sparkles, CalendarDays, TrendingUp, Flame, ChevronRight,
  Image as ImageIcon, Mic, Camera, Crown, X
} from 'lucide-react-native';
import { API_BASE_URL, profileApi } from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHaptics } from '../../hooks/useHaptics';
import { useSubscription } from '../../context/SubscriptionContext';
import ProModal from '../../components/ui/ProModal';
import EventSource from 'react-native-sse';

// Platform-guarded imports — expo-image-picker and expo-av don't work on web
let ImagePicker: typeof import('expo-image-picker') | null = null;
let Audio: typeof import('expo-av')['Audio'] | null = null;
if (Platform.OS !== 'web') {
  ImagePicker = require('expo-image-picker');
  Audio = require('expo-av').Audio;
}


interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  image?: string;
}

const QUICK_PROMPTS = [
  'আমার জন্য ডায়েট পরিকল্পনা তৈরি করুন',
  'আমার জন্য আজকের নাস্তা কী?',
  'ডায়াবেটিস রোগীর জন্য কোন ফল ভালো?',
  'ওজন কমাতে রাতে কী খাব?',
  'কতটুকু পানি পান করা দরকার?',
];

const WELCOME_MSG: Message = {
  role: 'assistant',
  content: 'হ্যালো!  আমি পুষ্টি এআই। আমি আপনাকে কীভাবে সহায়তা করতে পারি?',
  id: 'welcome',
};

const cleanMarkdown = (text: string) => {
  if (!text) return '';
  return text.replace(/\*\*/g, '').replace(/###/g, '').trim();
};

export default function ChatScreen() {
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const haptics = useHaptics();
  const prefillSent = useRef(false);

  // Subscription state
  const { isPro, canSendMessage, incrementMessageCount } = useSubscription();
  const [showProModal, setShowProModal] = useState(false);
  const [proTrigger, setProTrigger] = useState<'chat_limit' | 'regenerate' | 'tomorrow' | 'general'>('general');

  // Media attachment states
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedImageBase64, setAttachedImageBase64] = useState<string | null>(null);

  // Audio recording states
  const [recording, setRecording] = useState<any | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  useEffect(() => {
    profileApi.get().then((res) => {
      if (res.data?.profile) {
        setProfile(res.data.profile);
      }
    }).catch(() => { });
  }, []);

  // Auto-send prefill message when navigated from Meals tab
  useEffect(() => {
    if (prefill && !prefillSent.current) {
      prefillSent.current = true;
      setTimeout(() => sendMessage(prefill), 400);
    }
  }, [prefill]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // Image Attach Handlers — only available on native
  const pickImage = async () => {
    haptics.light();
    if (!ImagePicker) {
      Alert.alert('শুধুমাত্র মোবাইলে', 'ছবি পাঠানো শুধুমাত্র মোবাইল অ্যাপে কাজ করে।');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('অনুমতি প্রয়োজন', 'গ্যালারি থেকে ছবি নিতে অনুমতি দিন।');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setAttachedImage(result.assets[0].uri);
      setAttachedImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takePhoto = async () => {
    haptics.light();
    if (!ImagePicker) {
      Alert.alert('শুধুমাত্র মোবাইলে', 'ক্যামেরা শুধুমাত্র মোবাইল অ্যাপে কাজ করে।');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('অনুমতি প্রয়োজন', 'ক্যামেরা দিয়ে ছবি তুলতে অনুমতি দিন।');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setAttachedImage(result.assets[0].uri);
      setAttachedImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  // Voice Recording Handlers — only available on native
  const startRecording = async () => {
    if (!Audio) {
      Alert.alert('শুধুমাত্র মোবাইলে', 'ভয়েস রেকর্ড শুধুমাত্র মোবাইল অ্যাপে কাজ করে।');
      return;
    }
    try {
      haptics.light();
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('অনুমতি প্রয়োজন', 'ভয়েস রেকর্ড করতে মাইক্রোফোনের অনুমতি দিন।');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    haptics.medium();
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(undefined);

      if (uri) {
        await transcribeAudio(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const transcribeAudio = async (uri: string) => {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: Platform.OS === 'ios' ? 'recording.m4a' : 'recording.mp4',
        type: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
      } as any);
      formData.append('language', 'bn');

      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/chat/transcribe`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Transcription failed');
      const resData = await response.json();
      if (resData.text) {
        setInput((prev) => (prev ? `${prev} ${resData.text}` : resData.text));
      }
    } catch (err) {
      console.error(err);
      Alert.alert('ত্রুটি', 'ভয়েস ইনপুট টেক্সটে রূপান্তর করা যায়নি।');
    } finally {
      setTranscribing(false);
    }
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content && !attachedImageBase64) return;
    if (streaming) return;

    // Check message limit for free users
    if (!canSendMessage) {
      setProTrigger('chat_limit');
      setShowProModal(true);
      return;
    }

    haptics.light();
    incrementMessageCount();

    const userMsg: Message = {
      role: 'user',
      content: content || 'ফটোগ্রাফি বা ছবি বিশ্লেষণ করুন।',
      id: `u_${Date.now()}`,
      image: attachedImage || undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    
    // Clear attachments
    const imgData = attachedImageBase64;
    setAttachedImage(null);
    setAttachedImageBase64(null);
    setInput('');
    setShowQuickPrompts(false);
    setStreaming(true);

    const assistantId = `a_${Date.now()}`;
    setMessages((prev) => [...prev, { role: 'assistant', content: '', id: assistantId }]);

    try {
      const token = await AsyncStorage.getItem('access_token');

      const es = new EventSource(`${API_BASE_URL}/chat`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
        body: JSON.stringify({
          message: content || 'Identify foods in the attached image.',
          language: 'bn',
          history: messages
            .filter((m) => m.role !== 'assistant' || m.content)
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
          ...(imgData ? { image_data_url: imgData } : {}),
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
        <View style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleBot,
          !isUser && styles.bubbleBotShadow
        ]}>
          {item.image && (
            <Image source={{ uri: item.image }} style={styles.bubbleImage} resizeMode="cover" />
          )}
          {isStreamingLast && item.content === '' ? (
            <View style={styles.typingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          ) : (
            <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextBot]}>
              {cleanMarkdown(item.content)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const handlePresetPress = (type: 'diet' | 'report' | 'calorie') => {
    haptics.medium();
    if (type === 'diet') {
      router.push('/(tabs)/diet-plan');
    } else if (type === 'report') {
      sendMessage('আমার বর্তমান শারীরিক অবস্থা এবং পুষ্টির রিপোর্ট দেখান।');
    } else if (type === 'calorie') {
      sendMessage('আমার দৈনিক ক্যালোরি ও পুষ্টির হিসাব কীভাবে করা হয়েছে?');
    }
  };

  const renderEmptyState = () => {
    const userName = profile?.name_bn || profile?.name_en || '';

    const PRESET_CARDS = [
      {
        type: 'diet' as const,
        icon: CalendarDays,
        iconColor: colors.primary,
        iconBg: colors.primary + '15',
        accentColor: colors.primary,
        title: 'আজকের মিল প্ল্যান',
        description:
          'সকাল থেকে রাত পর্যন্ত আপনার স্বাস্থ্য লক্ষ্য ও খাদ্যাভ্যাস অনুযায্যী তৈরি পার্সোনালাইজড খাবার তালিকা দেখুন।',
        badge: 'খাবার তালিকা দেখুন',
      },
      {
        type: 'report' as const,
        icon: TrendingUp,
        iconColor: colors.accent,
        iconBg: colors.accent + '15',
        accentColor: colors.accent,
        title: 'আমার পুষ্টি বিশ্লেষণ',
        description:
          'আপনার বর্তমান ওজন, রক্তের শর্করা ও ক্যালোরি গ্রহণের হালনাগাদ রিপোর্ট সহ পুষ্টির ঘাটতি চিহ্নিত করুন।',
        badge: 'রিপোর্ট দেখুন',
      },
      {
        type: 'calorie' as const,
        icon: Flame,
        iconColor: '#FF8C00',
        iconBg: '#FF8C0015',
        accentColor: '#FF8C00',
        title: 'ক্যালোরি ও পুষ্টি লক্ষ্যমাত্রা',
        description:
          'বয়স, উচ্চতা ও ওজন অনুযায্যী দৈনিক ক্যালোরি, প্রোটিন, কার্বোহাইড্রেট ও চর্বির সঠিক হিসাব জানুন।',
        badge: 'লক্ষ্যমাত্রা জানুন',
      },
    ];

    return (
      <View style={styles.presetContainer}>
        <View style={styles.botIconWrapper}>
          <Bot size={28} color={colors.white} />
          <View style={styles.botActiveBadge} />
        </View>

        <Text style={styles.presetUserHello}>
          {userName ? `হাই, ${userName}` : 'হাই!'}
        </Text>

        <Text style={styles.presetMainTitle}>
          আমি আপনাকে আজ কীভাবে সাহায্য করতে পারি?
        </Text>

        <Text style={styles.presetSubTitle}>
          আপনার পুষ্টি, ডায়েট এবং স্বাস্থ্য সংক্রান্ত যেকোনো প্রশ্ন জিজ্ঞাসা করুন বা নিচের বিকল্পগুলো বেছে নিন।
        </Text>

        <View style={styles.presetGrid}>
          {PRESET_CARDS.map(({ type, icon: Icon, iconColor, iconBg, accentColor, title, description, badge }) => (
            <TouchableOpacity
              key={type}
              style={styles.presetCard}
              activeOpacity={0.6}
              onPress={() => handlePresetPress(type)}
            >
              {/* Left accent strip */}
              <View style={[styles.presetCardAccent, { backgroundColor: accentColor }]} />

              {/* Icon */}
              <View style={[styles.presetCardIconBox, { backgroundColor: iconBg }]}>
                <Icon size={22} color={iconColor} strokeWidth={2} />
              </View>

              {/* Content */}
              <View style={styles.presetCardContent}>
                <Text style={styles.presetCardTitle}>{title}</Text>
                <Text style={styles.presetCardDesc}>{description}</Text>
                <View style={[styles.presetCardBadge, { backgroundColor: accentColor + '18', borderColor: accentColor + '40' }]}>
                  <Text style={[styles.presetCardBadgeText, { color: accentColor }]}>{badge}</Text>
                  <ChevronRight size={11} color={accentColor} strokeWidth={2.5} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.botAvatarLarge}>
          <Bot size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>পুষ্টি এআই</Text>
          <Text style={styles.headerSub}>ব্যক্তিগতকৃত পরামর্শ</Text>
        </View>
        {!isPro && (
          <TouchableOpacity style={styles.premiumBadge} onPress={() => { haptics.light(); setProTrigger('general'); setShowProModal(true); }}>
            <Crown size={12} color={colors.white} />
            <Text style={styles.premiumBadgeText}>PRO</Text>
          </TouchableOpacity>
        )}
        <View style={styles.onlineDot} />
      </View>

      {/* Conditionally render Empty State Preset or standard Message Log */}
      {messages.length <= 1 && !streaming ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollEmptyState}
          showsVerticalScrollIndicator={false}
        >
          {renderEmptyState()}
        </ScrollView>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Quick Prompts scrollable bar */}
      {showQuickPrompts && messages.length <= 1 && (
        <View style={styles.quickPromptsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPromptsList}
          >
            {QUICK_PROMPTS.map((prompt, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickPromptPill}
                onPress={() => sendMessage(prompt)}
                activeOpacity={0.8}
              >
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Media Attachments Preview bar */}
      {attachedImage && (
        <View style={styles.attachmentPreviewContainer}>
          <View style={styles.imagePreviewWrapper}>
            <Image source={{ uri: attachedImage }} style={styles.attachedImagePreview} />
            <TouchableOpacity style={styles.removeImageBtn} onPress={() => { haptics.light(); setAttachedImage(null); setAttachedImageBase64(null); }}>
              <X size={12} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        {/* Media Buttons */}
        <View style={styles.mediaButtons}>
          <TouchableOpacity style={styles.mediaBtn} onPress={pickImage}>
            <ImageIcon size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaBtn} onPress={takePhoto}>
            <Camera size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mediaBtn, isRecording && styles.mediaBtnActive]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            <Mic size={20} color={isRecording ? colors.white : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, inputFocused && styles.inputFocused]}
          value={input}
          onChangeText={setInput}
          placeholder={transcribing ? 'ভয়েস মেসেজ অনুবাদ হচ্ছে...' : 'আপনার প্রশ্ন লিখুন...'}
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={600}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          editable={!transcribing}
        />
        
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() && !attachedImageBase64 || streaming) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={(!input.trim() && !attachedImageBase64) || streaming}
          activeOpacity={0.8}
        >
          {streaming
            ? <ActivityIndicator size="small" color={colors.white} />
            : <Send size={20} color={colors.white} strokeWidth={2} />
          }
        </TouchableOpacity>
      </View>

      {/* Pro Modal */}
      <ProModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        trigger={proTrigger}
      />
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
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  botAvatarLarge: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primary + '15',
    borderWidth: 1, borderColor: colors.primary + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.bnBold, fontSize: 18, color: colors.textPrimary },
  headerSub: { fontFamily: fonts.bn, fontSize: 13, color: colors.textSecondary },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF6B35',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginRight: spacing.sm,
  },
  premiumBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.white,
    letterSpacing: 0.5,
  },
  onlineDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.success,
  },

  msgList: { padding: spacing.md, paddingBottom: 30 },

  msgRow: { flexDirection: 'row', marginBottom: spacing.md, alignItems: 'flex-end', gap: spacing.sm },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot: { justifyContent: 'flex-start' },

  botAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary + '15',
    borderWidth: 1, borderColor: colors.primary + '30',
    alignItems: 'center', justifyContent: 'center',
  },

  bubble: { maxWidth: '80%', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16 },
  bubbleUser: {
    backgroundColor: 'rgba(167, 201, 36, 0.95)',
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  bubbleBot: {
    backgroundColor: colors.glass,
    borderBottomLeftRadius: 4,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.25)',
  },
  bubbleBotShadow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bubbleImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: spacing.xs,
  },
  msgText: { fontFamily: fonts.bn, fontSize: 15, lineHeight: 24 },
  msgTextUser: { color: colors.white },
  msgTextBot: { color: colors.textPrimary },

  typingDots: { flexDirection: 'row', gap: 5, paddingVertical: 4, paddingHorizontal: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary + '80' },
  dot1: {}, dot2: {}, dot3: {},

  attachmentPreviewContainer: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  imagePreviewWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  attachedImagePreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.textPrimary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.sm + 2,
    backgroundColor: colors.glass,
    borderTopWidth: 1.2,
    borderTopColor: 'rgba(167, 201, 36, 0.25)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 4,
  },
  mediaButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mediaBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediaBtnActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(252, 251, 247, 0.6)',
    borderRadius: 20,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.bn,
    fontSize: 14,
    color: colors.textPrimary,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.2)',
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  sendBtnDisabled: { opacity: 0.4 },

  scrollEmptyState: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },

  presetContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  botIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  botActiveBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  presetUserHello: {
    fontFamily: fonts.bnBold,
    fontSize: 14,
    color: colors.primary,
    marginBottom: 2,
  },
  presetMainTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: spacing.sm,
    lineHeight: 24,
  },
  presetSubTitle: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  presetGrid: {
    width: '100%',
    gap: spacing.xs + 2,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 2,
  },
  presetCardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    marginBottom: 4,
  },
  presetCardSub: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
  },
  presetCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  presetCardDesc: {
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
    paddingRight: 6,
  },
  presetCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  presetCardBadgeText: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
  },
  cardChevron: {
    marginLeft: spacing.sm,
  },

  quickPromptsContainer: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.xs,
  },
  quickPromptsList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  quickPromptPill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 2,
    elevation: 1,
  },
  quickPromptText: {
    fontFamily: fonts.bnBold,
    fontSize: 12.5,
    color: colors.textPrimary,
  },
});
