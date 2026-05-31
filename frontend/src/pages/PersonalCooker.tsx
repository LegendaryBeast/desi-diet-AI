import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ChefHat,
  Send,
  Loader2,
  Trash2,
  HeartPulse,
  ArrowLeft,
  Sparkles,
  Shield,
  BookOpen,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const DISEASE_MAPPING: Record<string, string> = {
  'Diabetes': 'Diabetes', 'Hypertension': 'Hypertension', 'Obesity': 'Obesity',
  'Anemia': 'Anemia', 'Asthma': 'Asthma', 'Bronchitis': 'Bronchitis',
  'Burns': 'Burns', 'Cancer': 'Cancer',
  'Chronic Kidney Disease': 'Chronic Kidney Disease', 'Kidney Disease': 'Chronic Kidney Disease',
  'Coronary Heart Disease': 'Coronary Heart Disease', 'Heart Disease': 'Coronary Heart Disease',
  'Diarrhea': 'Diarrhoea', 'Diarrhoea': 'Diarrhoea',
  'Hypothyroidism': 'Hypothyroidism', 'Thyroid Disorders': 'Hypothyroidism',
  'Kidney Stones': 'Kidney Stones', 'Liver Disease': 'Liver Disease',
  'Tuberculosis': 'Tuberculosis', 'Tuberculosis (TB)': 'Tuberculosis',
  'Gastric': 'Gastric',
};

export const PersonalCooker = () => {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === 'bn';
  const navigate = useNavigate();
  const { user, profileData } = useAuth();

  const [profileConditions, setProfileConditions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sessionId = `pc_${user?.id || 'guest'}_${new Date().toISOString().slice(0, 10)}`;
  const conditionStr = profileConditions.join(', ') || 'None';

  // Auto-fetch conditions from profile
  useEffect(() => {
    const profileConditions = profileData?.profile?.medical_conditions || [];
    const matched = new Set<string>();
    for (const c of profileConditions) {
      const canonicalName = DISEASE_MAPPING[c] || c;
      matched.add(canonicalName);
    }
    setProfileConditions(Array.from(matched));
  }, [profileData]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const token = localStorage.getItem('desidiet_access_token');
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/personal-cooker/history?session_id=${sessionId}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.history?.length > 0) {
            setMessages(data.history);
          } else {
            setMessages([
              {
                role: 'assistant',
                content: isBn
                  ? `👋 আমি রাঁধুনি AI — আপনার ব্যক্তিগত রান্নাঘর সহায়ক। আমি আপনার প্রোফাইলের স্বাস্থ্য লক্ষ্য ও অবস্থা অনুযায়ী নিরাপদ ও স্বাস্থ্যকর রেসিপি, রান্নার পদ্ধতি এবং খাবারের পুষ্টি নিরাপত্তা পরামর্শ দিতে পারি। আপনি আমাকে যেকোনো উপাদান বা রান্না নিয়ে প্রশ্ন করতে পারেন!`
                  : `👋 I am Radhuni AI — your personal cooking assistant. I can suggest safe and healthy recipes, cooking methods, and food safety advice tailored to your profile's conditions. Feel free to ask me about any ingredients or recipes!`,
              },
            ]);
          }
        }
      } catch {
        // silent fail
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [sessionId, isBn]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('desidiet_access_token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/personal-cooker/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: userMsg,
            condition: conditionStr,
            session_id: sessionId,
          }),
        }
      );
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
      const token = localStorage.getItem('desidiet_access_token');
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/personal-cooker/history?session_id=${sessionId}`,
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
          ? `👋 আমি রাঁধুনি AI — আপনার ব্যক্তিগত রান্নাঘর সহায়ক। আমি আপনার প্রোফাইলের স্বাস্থ্য লক্ষ্য ও অবস্থা অনুযায়ী নিরাপদ ও স্বাস্থ্যকর রেসিপি, রান্নার পদ্ধতি এবং খাবারের পুষ্টি নিরাপত্তা পরামর্শ দিতে পারি। আপনি আমাকে যেকোনো উপাদান বা রান্না নিয়ে প্রশ্ন করতে পারেন!`
          : `👋 I am Radhuni AI — your personal cooking assistant. I can suggest safe and healthy recipes, cooking methods, and food safety advice tailored to your profile's conditions. Feel free to ask me about any ingredients or recipes!`,
      },
    ]);
  };

  const handleSuggestionClick = (suggestionText: string) => {
    setInput(suggestionText);
    inputRef.current?.focus();
  };

  const featureCards = [
    {
      title: isBn ? 'স্মার্ট রেসিপি জেনারেটর' : 'Smart Recipes',
      desc: isBn ? 'আপনার প্রিয় দেশী যেকোনো উপাদান দিয়ে সুস্বাদু ও পুষ্টিকর রেসিপি তৈরি করুন।' : 'Generate tasty and nutritious recipes using your favorite local ingredients.',
      icon: ChefHat,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
    {
      title: isBn ? 'খাদ্য নিরাপত্তা যাচাই' : 'Food Safety Verdict',
      desc: isBn ? 'কোনো নির্দিষ্ট খাবার বা উপাদান আপনার শরীরের জন্য নিরাপদ কিনা তা চটজলদি জেনে নিন।' : 'Check if a specific food or ingredient is safe and suitable for your body.',
      icon: Shield,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      title: isBn ? 'তেল-মসলা নিয়ন্ত্রণ' : 'Healthy Cooking Tips',
      desc: isBn ? 'তেল-মসলা নিয়ন্ত্রণ করে কীভাবে স্বাস্থ্যকর উপায়ে সুস্বাদু রান্না করা যায় তা শিখুন।' : 'Learn to control oil & spices to cook healthy meals without losing taste.',
      icon: Sparkles,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
  ];

  const quickSuggestions = isBn ? [
    'গ্যাস্ট্রিকের সমস্যায় বিকেলের নাস্তার জন্য একটি সহজ রেসিপি দিন',
    'উচ্চ রক্তচাপ থাকলে খাবারে লবণের ব্যবহার কমানোর উপায় কী?',
    'লাল চালের ভাত দিয়ে একটি স্বাস্থ্যকর খিচুড়ি রান্নার পদ্ধতি বলুন',
    'কম তেলে সুস্বাদু মাছের ঝোল রান্নার প্রণালী শিখিয়ে দিন'
  ] : [
    'Give me a safe evening snack recipe for gastric problem',
    'What are the low-sodium alternatives for cooking with hypertension?',
    'Tell me a healthy khichuri recipe using red rice',
    'How to cook a delicious fish curry with minimal oil?'
  ];

  const profile = profileData?.profile;
  const displayName = isBn
    ? (profile?.name_bn || profile?.name_en || user?.email?.split('@')[0] || user?.phone || 'ব্যবহারকারী')
    : (profile?.name_en || profile?.name_bn || user?.email?.split('@')[0] || user?.phone || 'User');

  const hasUserMessages = messages.some((m) => m.role === 'user');

  return (
    <DashboardLayout
      title={isBn ? 'নিজের রান্নাঘর' : 'Personal Cooker'}
      subtitle={isBn ? 'রাঁধুনি AI — রান্না ও পুষ্টি সহায়িকা' : 'Radhuni AI — Personalized Cooking Guide'}
      noPadding={true}
      headerExtra={
        <div className="relative">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-ink rounded-xl md:rounded-2xl flex items-center justify-center text-cream shadow-lg transform -rotate-3">
            <ChefHat size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-4 md:h-4 bg-green-500 border-2 md:border-4 border-white rounded-full" />
        </div>
      }
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cream text-ink-muted hover:bg-red-50 hover:text-red-500 rounded-xl transition-all font-bn font-bold text-xs shadow-sm interactive"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">{isBn ? 'চ্যাট মুছুন' : 'Clear Chat'}</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cream text-ink-muted hover:bg-ink hover:text-cream rounded-xl transition-all font-bn font-bold text-xs shadow-sm interactive"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">{isBn ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
          </button>
        </div>
      }
    >
      <div className="flex-1 flex flex-col relative max-w-4xl mx-auto w-full min-h-0">
        {/* Soft Background Glows */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[400px] bg-accent/5 blur-[80px] md:blur-[120px] rounded-full pointer-events-none" />

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 pb-6 md:p-6 md:pb-8 space-y-4 md:space-y-5 scroll-smooth relative z-10">
          <AnimatePresence initial={false}>
            {historyLoading && messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center py-10"
              >
                <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
                <p className="font-bn text-sm text-ink-muted">
                  {isBn ? 'বার্তা ইতিহাস লোড হচ্ছে...' : 'Loading message history...'}
                </p>
              </motion.div>
            ) : !hasUserMessages ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col items-center justify-center text-center py-6 md:py-10"
              >
                {/* Brand Icon */}
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="w-12 h-12 md:w-16 md:h-16 bg-ink rounded-2xl flex items-center justify-center text-cream mb-4 md:mb-6 shadow-xl relative overflow-hidden group mx-auto"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <ChefHat size={24} className="relative z-10" />
                </motion.div>

                <div className="space-y-1.5 md:space-y-2 mb-6 md:mb-8 px-4">
                  <h4 className="text-ink-muted font-bn text-xs md:text-sm opacity-65">
                    {isBn ? `${displayName}, আমি আপনার রন্ধন ও পুষ্টি সহায়িকা` : `${displayName}, I am your culinary & nutrition assistant`}
                  </h4>
                  <h3 className="font-display text-xl md:text-3xl font-black text-ink tracking-tight leading-tight">
                    {isBn ? 'আজকে রান্নাঘরে কী সাহায্য করতে পারি?' : 'How can I help in the kitchen today?'}
                  </h3>
                  <p className="font-bn text-xs md:text-sm text-ink-faint max-w-xl mx-auto opacity-75 leading-relaxed mt-2">
                    {isBn
                      ? 'আমি আপনার প্রোফাইলের স্বাস্থ্য লক্ষ্য ও অবস্থা অনুযায়ী নিরাপদ ও স্বাস্থ্যকর রেসিপি, রান্নার পদ্ধতি এবং খাবারের পুষ্টি নিরাপত্তা পরামর্শ দিতে পারি। আপনি আমাকে যেকোনো উপাদান বা রান্না নিয়ে প্রশ্ন করতে পারেন!'
                      : 'I can suggest safe and healthy recipes, cooking methods, and food safety advice tailored to your profile\'s conditions. Feel free to ask me about any ingredients or recipes!'}
                  </p>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full px-4 max-w-3xl mx-auto mb-8">
                  {featureCards.map((feat, i) => (
                    <div
                      key={i}
                      className="p-4 bg-white border border-ink/5 rounded-2xl text-left hover:border-accent/20 hover:shadow-md hover:translate-y-[-1px] transition-all group shadow-sm flex items-center gap-3"
                    >
                      <div className={`w-9 h-9 ${feat.bg} rounded-xl flex items-center justify-center shrink-0`}>
                        <feat.icon size={16} className={feat.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bn font-bold text-xs md:text-sm text-ink truncate">{feat.title}</div>
                        <div className="font-bn text-[0.68rem] text-ink-muted leading-tight mt-0.5">{feat.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Ask */}
                <div className="w-full px-4 max-w-3xl mx-auto text-left space-y-2.5">
                  <span className="text-[0.55rem] text-ink-faint font-bold uppercase tracking-wider flex items-center gap-1">
                    <HelpCircle size={10} className="text-accent animate-pulse" />
                    {isBn ? 'কুইক সাজেশনস (Quick Ask)' : 'Quick Suggestions'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {quickSuggestions.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(sug)}
                        className="w-full text-left p-3.5 rounded-xl bg-white border border-ink/5 text-[11px] text-ink-muted hover:text-accent hover:border-accent/20 hover:bg-accent/5 transition-all flex items-center justify-between group shadow-sm"
                      >
                        <span className="truncate pr-1 font-bn font-medium">{sug}</span>
                        <ChevronRight size={12} className="text-ink-faint shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2 md:gap-3`}
                >
                  {msg.role === 'assistant' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-8 h-8 rounded-xl bg-ink flex-shrink-0 flex items-center justify-center text-cream shadow-md mb-0.5 transform -rotate-3 border border-white/10"
                    >
                      <ChefHat size={15} />
                    </motion.div>
                  )}
                  <div
                    className={`relative p-3 px-4 md:p-4 md:px-5 rounded-2xl md:rounded-[1.5rem] font-bn leading-relaxed text-sm md:text-base max-w-[88%] md:max-w-[75%] shadow-sm transition-all duration-300 ${
                      msg.role === 'user'
                        ? 'bg-ink text-cream rounded-br-none shadow-ink/10'
                        : 'bg-white border border-ink/5 text-ink rounded-tl-none ring-1 ring-ink/5'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1.5 border-b border-ink/5 pb-1 select-none">
                        <ChefHat size={14} className="text-accent" />
                        <span className="text-[0.6rem] font-bold text-accent uppercase tracking-wider">
                          Radhuni AI
                        </span>
                      </div>
                    )}
                    <div
                      className="relative z-10 whitespace-pre-wrap font-bn break-words leading-relaxed text-sm md:text-[0.95rem]"
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent font-bold">$1</strong>')
                          .replace(/\n/g, '<br/>'),
                      }}
                    />
                  </div>
                </motion.div>
              ))
            )}

            {/* Thinking / Loading indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col gap-1.5"
              >
                <div className="flex justify-start items-end gap-2 md:gap-3">
                  <div className="w-8 h-8 rounded-xl bg-ink flex-shrink-0 flex items-center justify-center text-cream shadow-md mb-0.5 transform -rotate-3">
                    <ChefHat size={15} />
                  </div>
                  <div className="p-3.5 px-4 bg-white border border-ink/5 rounded-2xl rounded-tl-none shadow-md flex items-center gap-1 ring-1 ring-ink/5">
                    {[0, 1, 2].map((dot) => (
                      <motion.div
                        key={dot}
                        className="w-1.5 h-1.5 bg-accent/40 rounded-full"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.15, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ml-10 md:ml-12 flex items-center gap-1.5"
                >
                  <span className="text-[0.6rem] font-bn font-bold text-accent tracking-wider uppercase flex items-center gap-1">
                    Radhuni AI
                    <span className="animate-pulse">{isBn ? 'ভাবছে...' : 'thinking...'}</span>
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-4 md:h-6 shrink-0" />
        </div>

        {/* Input Bar */}
        <div className="p-3 md:p-4 bg-white/90 backdrop-blur-xl border-t border-ink/5 z-30 shrink-0 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.03)]">
          <div className="max-w-4xl mx-auto flex items-center gap-2 md:gap-3 px-1">
            <div className="flex-1 bg-white border border-ink/10 rounded-full flex items-center px-3.5 md:px-5 py-0.5 shadow-sm focus-within:border-accent/40 focus-within:ring-4 ring-accent/5 transition-all duration-300">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={loading}
                placeholder={
                  isBn
                    ? 'একটি রেসিпи বা খাবারের নিরাপত্তা জিজ্ঞাসা করুন...'
                    : 'Ask for a recipe or food safety advice...'
                }
                className="flex-1 bg-transparent py-2.5 md:py-3 font-bn text-xs md:text-sm focus:outline-none placeholder:text-ink/25 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="ml-1.5 px-3 md:px-4 py-1.5 bg-accent text-white rounded-full font-bn font-bold text-xs md:text-[0.8rem] flex items-center gap-1.5 hover:bg-ink hover:scale-102 active:scale-98 disabled:opacity-20 disabled:scale-100 transition-all shadow shrink-0"
              >
                <span className="hidden md:inline">{isBn ? 'পাঠান' : 'Send'}</span>
                <Send size={13} className={input.trim() ? 'animate-pulse' : ''} />
              </button>
            </div>
          </div>
          <div className="flex justify-center items-center mt-3 opacity-50">
            <p className="text-[0.55rem] md:text-[0.6rem] uppercase tracking-[0.2em] text-ink-faint font-body font-black text-center">
              {isBn
                ? 'রাঁধুনি AI জাতীয় খাদ্য নির্দেশিকা ২০২২ অনুসরণ করে। চিকিৎসা পরামর্শের বিকল্প নয়।'
                : 'Radhuni AI follows Bangladesh National Dietary Guidelines 2022. Not a substitute for medical advice.'}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

