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
};

export const PersonalCooker = () => {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === 'bn';
  const navigate = useNavigate();
  const { user, profileData } = useAuth();

  const [condition, setCondition] = useState('None');
  const [availableConditions, setAvailableConditions] = useState<string[]>(['None']);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sessionId = `pc_${user?.id || 'guest'}_${new Date().toISOString().slice(0, 10)}`;

  // Auto-fetch conditions from profile
  useEffect(() => {
    const profileConditions = profileData?.profile?.medical_conditions || [];
    const matched = new Set<string>();
    for (const c of profileConditions) {
      if (DISEASE_MAPPING[c]) matched.add(DISEASE_MAPPING[c]);
    }
    const arr = Array.from(matched);
    if (arr.length > 0) {
      setAvailableConditions([...arr, 'None']);
      setCondition(arr[0]);
    } else {
      setAvailableConditions(['None']);
      setCondition('None');
    }
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
                  ? `👋 আমি নুট্রিসাথী — আপনার ব্যক্তিগত রান্নাঘর সহায়ক। আমি বিভিন্ন রোগের জন্য উপযুক্ত রেসিপি, রান্নার পদ্ধতি এবং খাবারের নিরাপত্তা পরামর্শ দিতে পারি।\n\nআজকের জন্য আপনার শরীরিক অবস্থা: **${condition}**`
                  : `👋 I am NutriSaathi — your personal cooking assistant. I can suggest recipes, cooking methods, and food safety advice tailored to your health condition.\n\nToday's condition: **${condition}**`,
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
  }, [sessionId, isBn, condition]);

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
            condition,
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
          ? `👋 আমি নুট্রিসাথী — আপনার ব্যক্তিগত রান্নাঘর সহায়ক। আমি বিভিন্ন রোগের জন্য উপযুক্ত রেসিপি, রান্নার পদ্ধতি এবং খাবারের নিরাপত্তা পরামর্শ দিতে পারি।\n\nআজকের জন্য আপনার শরীরিক অবস্থা: **${condition}**`
          : `👋 I am NutriSaathi — your personal cooking assistant. I can suggest recipes, cooking methods, and food safety advice tailored to your health condition.\n\nToday's condition: **${condition}**`,
      },
    ]);
  };

  return (
    <DashboardLayout
      title={isBn ? 'নিজের রান্নাঘর' : 'Personal Cooker'}
      subtitle={isBn ? 'নুট্রিসাথী — আপনার স্বাস্থ্য অনুযায়ী রান্না ও পুষ্টি সহায়ক' : 'NutriSaathi — condition-aware cooking & nutrition guide'}
      headerActions={
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-cream border border-ink/10 rounded-xl font-bn font-bold text-xs text-ink transition-colors"
        >
          <ArrowLeft size={14} />
          {isBn ? 'ড্যাশবোর্ড' : 'Dashboard'}
        </button>
      }
    >
      <div className="max-w-3xl w-full mx-auto h-[calc(100vh-140px)] flex flex-col font-bn">
        {/* Condition selector */}
        <div className="bg-white p-3 rounded-xl border border-ink/5 shadow-sm mb-3 flex items-center gap-3">
          <HeartPulse size={18} className="text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <label className="text-[0.62rem] text-ink-faint uppercase tracking-wider font-bold block mb-1">
              {isBn ? 'প্রোফাইল থেকে:' : 'From profile:'}
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {availableConditions.map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  className={`px-2.5 py-1 rounded-full text-[0.65rem] font-bold border transition-all ${condition === c ? 'bg-ink text-cream border-ink' : 'border-ink/10 text-ink-muted hover:border-ink/30'}`}
                >
                  {c}
                </button>
              ))}
              {availableConditions.length === 1 && availableConditions[0] === 'None' && (
                <button onClick={() => navigate('/profile')} className="px-2 py-1 rounded-full text-[0.6rem] font-bold bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-all">
                  {isBn ? '+ যোগ করুন' : '+ Add Info'}
                </button>
              )}
            </div>
          </div>
          <button
            onClick={clearChat}
            className="p-2 text-ink-faint hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
            title={isBn ? 'চ্যাট মুছুন' : 'Clear chat'}
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Chat area */}
        <div className="flex-1 bg-white rounded-xl border border-ink/5 shadow-sm overflow-hidden flex flex-col">
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
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ChefHat size={14} className="text-accent" />
                        <span className="text-[0.6rem] font-bold text-accent uppercase tracking-wider">
                          NutriSaathi
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
                    {isBn ? 'নুট্রিসাথী ভাবছে...' : 'NutriSaathi is thinking...'}
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
                ? 'নুট্রিসাথী জাতীয় খাদ্য নির্দেশিকা ২০২২ অনুসরণ করে। চিকিৎসা পরামর্শের বিকল্প নয়।'
                : 'NutriSaathi follows Bangladesh National Dietary Guidelines 2022. Not a substitute for medical advice.'}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
