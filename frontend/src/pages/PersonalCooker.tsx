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

  return (
    <DashboardLayout
      title={isBn ? 'নিজের রান্নাঘর' : 'Personal Cooker'}
      subtitle={isBn ? 'রাঁধুনি AI — রান্না ও পুষ্টি সহায়িকা' : 'Radhuni AI — Personalized Cooking Guide'}
      noPadding={true}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-bn font-bold text-xs transition-colors interactive shadow-sm"
          >
            <Trash2 size={13} />
            {isBn ? 'চ্যাট মুছুন' : 'Clear Chat'}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-cream border border-ink/10 rounded-xl font-bn font-bold text-xs text-ink transition-colors interactive shadow-sm"
          >
            <ArrowLeft size={13} />
            {isBn ? 'ড্যাশবোর্ড' : 'Dashboard'}
          </button>
        </div>
      }
    >
      <div className="flex-grow flex flex-col lg:flex-row gap-5 p-4 md:p-6 lg:p-8 h-full min-h-0 overflow-hidden font-bn">
        {/* Left Column: Chat Window */}
        <div className="flex-grow flex flex-col bg-white rounded-2xl border border-ink/5 shadow-sm overflow-hidden h-full min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {historyLoading && messages.length === 0 && (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-ink text-cream rounded-br-none'
                        : 'bg-cream/60 text-ink border border-ink/5 rounded-bl-none'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1.5 border-b border-ink/5 pb-1">
                        <ChefHat size={14} className="text-accent" />
                        <span className="text-[0.6rem] font-bold text-accent uppercase tracking-wider">
                          Radhuni AI
                        </span>
                      </div>
                    )}
                    <div
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent">$1</strong>')
                          .replace(/\n/g, '<br/>'),
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-cream/60 px-4 py-3 rounded-2xl rounded-bl-none border border-ink/5 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-accent" />
                  <span className="text-xs text-ink-muted">
                    {isBn ? 'রাঁধুনি AI ভাবছে...' : 'Radhuni AI is thinking...'}
                  </span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-3 border-t border-ink/5 bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={
                  isBn
                    ? 'একটি রেসিপি বা খাবারের নিরাপত্তা জিজ্ঞাসা করুন...'
                    : 'Ask for a recipe or food safety advice...'
                }
                className="flex-1 bg-cream/40 border border-ink/10 rounded-xl py-2.5 px-3.5 text-sm font-bn outline-none focus:border-accent/40 transition-all"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-4 py-2 bg-ink text-cream rounded-xl hover:bg-accent transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
            <p className="text-[0.55rem] text-ink-faint mt-1.5 text-center">
              {isBn
                ? 'রাঁধুনি AI জাতীয় খাদ্য নির্দেশিকা ২০২২ অনুসরণ করে। চিকিৎসা পরামর্শের বিকল্প নয়।'
                : 'Radhuni AI follows Bangladesh National Dietary Guidelines 2022. Not a substitute for medical advice.'}
            </p>
          </div>
        </div>

        {/* Right Column: NutriSaathi Info/Features Panel */}
        <div className="w-full lg:w-80 bg-white p-5 rounded-2xl border border-ink/5 shadow-sm shrink-0 flex flex-col justify-between overflow-y-auto max-h-[400px] lg:max-h-none h-full gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-ink/5 pb-2.5">
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                <ChefHat size={16} />
              </div>
              <div>
                <h3 className="font-bold text-xs text-ink">{isBn ? 'রাঁধুনি AI নির্দেশিকা' : 'Radhuni AI Guide'}</h3>
                <p className="text-[0.55rem] text-ink-faint">{isBn ? 'আপনার পুষ্টি ও রন্ধন সহকারী' : 'Your diet & cooking expert'}</p>
              </div>
            </div>

            {/* Feature list */}
            <div className="space-y-3">
              {featureCards.map((feat, i) => (
                <div key={i} className="flex gap-2.5 p-2 hover:bg-cream/40 rounded-xl transition-all border border-transparent hover:border-ink/5 group">
                  <div className={`w-7 h-7 rounded-lg ${feat.bg} flex items-center justify-center shrink-0`}>
                    <feat.icon size={14} className={feat.color} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[11px] text-ink group-hover:text-accent transition-colors">{feat.title}</h4>
                    <p className="text-[9px] text-ink-muted leading-tight mt-0.5">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Suggestions */}
          <div className="space-y-2 border-t border-ink/5 pt-3">
            <span className="text-[0.55rem] text-ink-faint font-bold uppercase tracking-wider flex items-center gap-1">
              <HelpCircle size={10} className="text-accent" />
              {isBn ? 'কুইক সাজেশনস (Quick Ask)' : 'Quick Suggestions'}
            </span>
            <div className="flex flex-col gap-1.5">
              {quickSuggestions.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(sug)}
                  className="w-full text-left p-2 rounded-xl bg-cream/40 border border-ink/5 text-[10px] text-ink-muted hover:text-accent hover:border-accent/20 hover:bg-accent/5 transition-all flex items-center justify-between group"
                >
                  <span className="truncate pr-1">{sug}</span>
                  <ChevronRight size={10} className="text-ink-faint shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

