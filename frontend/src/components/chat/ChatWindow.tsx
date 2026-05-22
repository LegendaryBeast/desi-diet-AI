import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Layout,
  Activity,
  FileText,
  Send,
  Flame,
  History,
  Bot,
  WifiOff,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardLayout } from '../layout/DashboardLayout';
import { chatApi, type ChatHistoryItem, isAuthenticated } from '../../lib/api';

interface Message {
  id: number;
  type: 'ai' | 'user';
  text: string;
  time: string;
}

const renderFormattedText = (text: string) => {
  if (!text) return null;

  // Split by line to handle block elements
  const lines = text.split('\n');

  return lines.map((line, lineIndex) => {
    let content = line;
    let isHeader = false;
    let headerLevel = 0;

    // Check for headers (e.g. ### Header or ## Header)
    const headerMatch = content.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      isHeader = true;
      headerLevel = headerMatch[1].length;
      content = headerMatch[2];
    }

    // Check for bullets
    const isBullet = content.trim().startsWith('-');
    if (isBullet) {
      // Remove the dash and space
      content = content.replace(/^\s*-\s*/, '');
    }

    // Format bold text (**text**)
    const parts = content.split('**');
    const formattedLine = parts.map((part, partIndex) => {
      // Odd indices are between **
      if (partIndex % 2 === 1) {
        return <strong key={partIndex} className="font-bold text-accent">{part}</strong>;
      }
      return part;
    });

    if (isHeader) {
      const headerClasses = headerLevel === 3
        ? "text-xs md:text-sm font-bold text-ink mt-3 mb-1.5 block border-b border-ink/5 pb-0.5"
        : "text-sm md:text-base font-bold text-ink mt-4 mb-2 block border-b border-ink/5 pb-0.5";
      return (
        <span key={lineIndex} className={headerClasses}>
          {formattedLine}
        </span>
      );
    }

    if (isBullet) {
      return (
        <span key={lineIndex} className="pl-3 py-0.5 flex items-start gap-1.5 leading-relaxed block text-ink-muted">
          <span className="text-accent shrink-0 mt-2 text-[0.45rem]">•</span>
          <span className="flex-1">{formattedLine}</span>
        </span>
      );
    }

    // Standard paragraph or empty line
    if (content.trim() === '') {
      return <span key={lineIndex} className="h-1.5 block" />;
    }

    return (
      <span key={lineIndex} className="block leading-relaxed">
        {formattedLine}
      </span>
    );
  });
};

export const ChatWindow = () => {
  const { t, i18n } = useTranslation();
  const { profileData, isLoggedIn } = useAuth();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    scrollToBottom(isStreaming || isTyping ? 'auto' : 'smooth');
  }, [messages, isTyping, isStreaming, scrollToBottom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.(); };
  }, []);

  const buildHistory = (): ChatHistoryItem[] =>
    messages.map((m) => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

  const send = useCallback((overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isStreaming) return;

    setApiError(null);

    const userMsg: Message = {
      id: Date.now(),
      type: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    if (!isLoggedIn || !isAuthenticated()) {
      // Fallback: simulate response for unauthenticated users
      setTimeout(() => {
        const isBn = i18n.language === 'bn';
        const fallback = isBn
          ? 'লগইন করুন বা নিবন্ধন করুন আমার সাথে কথা বলতে।'
          : 'Please login or register to chat with me.';
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, type: 'ai', text: fallback, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ]);
      }, 1000);
      return;
    }

    const aiMsgId = Date.now() + 1;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Insert placeholder
    setMessages((prev) => [...prev, { id: aiMsgId, type: 'ai', text: '', time }]);
    setIsTyping(false);
    setIsStreaming(true);

    const history = buildHistory();

    const abort = chatApi.stream(
      textToSend,
      i18n.language,
      history,
      (token) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, text: m.text + token } : m))
        );
      },
      () => {
        setIsStreaming(false);
        abortRef.current = null;
      },
      (err) => {
        setIsStreaming(false);
        setApiError(err);
        abortRef.current = null;
      }
    );

    abortRef.current = abort;
  }, [input, isStreaming, isLoggedIn, i18n.language, messages]);

  const { user } = useAuth();
  const profile = profileData?.profile;
  const isBn = i18n.language === 'bn';
  
  const displayName = isBn
    ? (profile?.name_bn || profile?.name_en || user?.email?.split('@')[0] || user?.phone || 'ব্যবহারকারী')
    : (profile?.name_en || profile?.name_bn || user?.email?.split('@')[0] || user?.phone || 'User');

  return (
    <DashboardLayout
      title={t('chat.title')}
      subtitle={t('chat.active_status')}
      noPadding
      headerExtra={(
        <div className="relative">
          <div className="w-10 h-10 md:w-11 md:h-11 bg-ink rounded-xl flex items-center justify-center text-cream shadow-md transform -rotate-3 border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-transparent" />
            <Bot size={18} className="relative z-10" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-[3px] border-white rounded-full animate-pulse" />
        </div>
      )}
      headerActions={(
        <button
          onClick={() => { abortRef.current?.(); setMessages([]); setApiError(null); }}
          className="px-3 py-2 bg-cream text-ink-muted hover:bg-red-50 hover:text-red-500 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold font-bn shadow-sm border border-ink/5"
        >
          <History size={13} />
          <span className="hidden sm:inline">{t('chat.clear_chat')}</span>
        </button>
      )}
    >
      <div className="flex-1 h-full flex flex-col relative max-w-3xl mx-auto w-full min-h-0">
        {/* Soft Background Glows */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[400px] bg-accent/5 blur-[80px] md:blur-[100px] rounded-full pointer-events-none" />

        {/* API Error Banner */}
        {apiError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bn z-20 shadow-sm"
          >
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </motion.div>
        )}

        {/* Conversation Stream */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto min-h-0 px-3 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6 space-y-4 md:space-y-6 relative z-10"
        >
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center pt-6 pb-4 md:pt-10"
              >
                {/* Brand Bot Avatar */}
                <div className="relative mb-4">
                  {/* Glowing Pulse Rings */}
                  <div className="absolute inset-0 bg-accent/15 rounded-full animate-ping opacity-75 scale-105" />
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="relative w-12 h-12 md:w-14 md:h-14 bg-ink rounded-full flex items-center justify-center text-cream shadow-lg border-2 border-white overflow-hidden group cursor-pointer"
                  >
                    <Bot size={22} className="relative z-10 text-cream" />
                  </motion.div>
                  {/* Active Pulse Badge */}
                  <span className="absolute bottom-0 right-0 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
                  </span>
                </div>

                <div className="space-y-1 mb-6 px-4 max-w-sm">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-accent/10 rounded-full text-[0.58rem] text-accent font-bn font-black tracking-wider uppercase mb-1">
                    <Sparkles size={9} className="animate-pulse" /> {isBn ? 'দেশিডায়েট এআই সহকারী' : 'DESIDIET AI'}
                  </span>
                  <h4 className="text-ink-muted font-bn text-[0.68rem] md:text-xs opacity-60">
                    {t('chat.greeting_user', { name: displayName })}
                  </h4>
                  <h3 className="font-display text-lg md:text-2xl font-black text-ink tracking-tight leading-tight">
                    {t('chat.how_can_i_help')}
                  </h3>
                  <p className="font-bn text-[0.62rem] md:text-[0.68rem] text-ink-faint max-w-xs mx-auto opacity-75">
                    {t('chat.description_short')}
                  </p>
                </div>

                {/* Suggestion List (Thin Stack) */}
                <div className="flex flex-col gap-2 w-full max-w-[340px] px-4">
                  {[
                    { icon: Layout, title: t('chat.suggestions.title1'), sub: t('chat.suggestions.sub1'), label: isBn ? 'খাবার তালিকা' : 'Meal Plan', bg: 'hover:bg-amber-50/20 hover:border-amber-200/50' },
                    { icon: Activity, title: t('chat.suggestions.title2'), sub: t('chat.suggestions.sub2'), label: isBn ? 'স্বাস্থ্য অবস্থা' : 'Health Status', bg: 'hover:bg-emerald-50/20 hover:border-emerald-200/50' },
                    { icon: Flame, title: t('chat.suggestions.title3'), sub: t('chat.suggestions.sub3'), label: isBn ? 'পুষ্টির হিসাব' : 'Nutrients', bg: 'hover:bg-rose-50/20 hover:border-rose-200/50' },
                  ].map((btn, i) => (
                    <button
                      key={i}
                      onClick={() => send(btn.title)}
                      disabled={isStreaming}
                      className={`p-2.5 bg-white border border-ink/5 rounded-xl transition-all shadow-[0_1px_4px_rgba(0,0,0,0.01)] hover:shadow-md disabled:opacity-50 flex items-center gap-3 text-left group w-full ${btn.bg}`}
                    >
                      <div className="w-7 h-7 bg-cream rounded-lg flex items-center justify-center text-ink-muted group-hover:scale-105 transition-transform shrink-0">
                        <btn.icon size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bn font-bold text-[0.72rem] md:text-xs text-ink group-hover:text-accent transition-colors leading-tight mb-0.5">{btn.title}</div>
                        <div className="font-bn text-[0.58rem] md:text-[0.62rem] text-ink-muted leading-none opacity-85">{btn.sub}</div>
                      </div>
                      <div className="text-[0.52rem] uppercase tracking-widest text-ink-faint font-body font-bold shrink-0 opacity-60">
                        {btn.label}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} items-start gap-2 md:gap-3`}
                >
                  {msg.type === 'ai' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-7 h-7 rounded-xl bg-ink flex-shrink-0 flex items-center justify-center text-cream shadow-sm mt-0.5 border border-white/10"
                    >
                      <Bot size={14} />
                    </motion.div>
                  )}
                  
                  <div className={`relative p-3.5 rounded-2xl font-bn leading-relaxed text-xs md:text-sm max-w-[85%] md:max-w-[75%] shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all ${
                    msg.type === 'user'
                      ? 'bg-ink text-cream rounded-tr-none border border-ink/10'
                      : 'bg-white/95 border border-ink/5 text-ink rounded-tl-none ring-1 ring-ink/5'
                  }`}>
                    {/* Bot Message Header */}
                    {msg.type === 'ai' && (
                      <div className="flex items-center gap-1.5 mb-1.5 border-b border-ink/5 pb-1 opacity-70">
                        <span className="text-[0.62rem] uppercase tracking-wider font-body font-black text-accent">{t('chat.ai_name')}</span>
                        <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                      </div>
                    )}

                    {/* Loading dots when empty */}
                    {msg.type === 'ai' && msg.text === '' && (
                      <div className="flex gap-1 py-1 px-0.5">
                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce delay-100" />
                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce delay-200" />
                      </div>
                    )}

                    <div className="relative z-10 whitespace-pre-wrap font-bn break-words leading-relaxed">
                      {msg.type === 'user' ? msg.text : renderFormattedText(msg.text)}
                    </div>

                    {/* Streaming cursor */}
                    {msg.type === 'ai' && isStreaming && msg.text !== '' && (
                      <span className="inline-block w-1 h-3.5 bg-accent ml-0.5 animate-pulse" />
                    )}

                    <div className={`text-[0.52rem] mt-2 font-body font-black uppercase tracking-wider opacity-40 flex items-center gap-1 ${msg.type === 'user' ? 'justify-end text-cream/70' : 'justify-start text-ink-muted'}`}>
                      {msg.time}
                    </div>
                  </div>
                </motion.div>
              ))
            )}

            {/* AI Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex justify-start items-start gap-2 md:gap-3"
              >
                <div className="w-7 h-7 rounded-xl bg-ink flex-shrink-0 flex items-center justify-center text-cream shadow-sm mt-0.5">
                  <Bot size={14} />
                </div>
                <div className="p-3.5 bg-white border border-ink/5 rounded-2xl rounded-tl-none shadow-sm flex flex-col gap-1.5 ring-1 ring-ink/5">
                  <div className="flex items-center gap-1.5 border-b border-ink/5 pb-1 opacity-70">
                    <span className="text-[0.62rem] uppercase tracking-wider font-body font-black text-accent">{t('chat.ai_name')}</span>
                    <span className="text-[0.58rem] font-bn text-ink-muted italic animate-pulse">{t('chat.typing')}</span>
                  </div>
                  <div className="flex items-center gap-1 py-1 px-0.5">
                    {[0, 1, 2].map((dot) => (
                      <motion.div
                        key={dot}
                        className="w-1.5 h-1.5 bg-accent rounded-full"
                        animate={{ scale: [1, 1.25, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.15, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-4 md:h-6 shrink-0" />
        </div>

        {/* Scroll to bottom button */}
        {messages.length > 3 && (
          <button
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-32 right-4 p-2.5 bg-white border border-ink/10 rounded-xl shadow-lg text-ink-muted hover:text-accent transition-all z-20 hover:scale-105 active:scale-95"
          >
            <ChevronDown size={14} />
          </button>
        )}

        {/* Floating Prompt Chips */}
        {messages.length === 0 && (
          <div className="px-3 md:px-6 mb-3 flex flex-wrap justify-center gap-1.5 md:gap-2 z-20">
            {[
              isBn ? 'আজকের ডায়েট কী?' : "What is today's diet plan?",
              isBn ? 'ওজন কমানোর কিছু সহজ উপায় বলুন' : 'Simple ways to lose weight',
              isBn ? 'ডায়াবেটিস রোগীর খাবার তালিকা কেমন হবে?' : 'Diet tips for diabetes'
            ].map((text, i) => (
              <button
                key={i}
                onClick={() => send(text)}
                disabled={isStreaming}
                className="px-3 py-1.5 bg-white border border-ink/5 hover:border-accent hover:bg-white text-ink-muted hover:text-accent rounded-full text-[0.62rem] md:text-xs font-bn shadow-[0_1px_4px_rgba(0,0,0,0.01)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                ✦ {text}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar Dock */}
        <div className="p-3 md:p-4 bg-white/95 backdrop-blur-xl border-t border-ink/5 z-30 shrink-0 shadow-[0_-8px_30px_rgba(0,0,0,0.03)] rounded-b-2xl">
          <div className="max-w-4xl mx-auto flex items-center gap-2 md:gap-3">
            <button
              aria-label="View history"
              onClick={() => setMessages([])}
              className="p-3 bg-ink text-cream rounded-xl shadow-sm hover:bg-accent transition-all shrink-0 group relative overflow-hidden active:scale-95"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
              <History size={15} className="relative z-10" />
            </button>

            <div className="flex-1 bg-cream/30 border border-ink/5 rounded-2xl flex items-center px-3.5 md:px-4 py-0.5 focus-within:bg-white focus-within:border-accent/30 focus-within:ring-4 ring-accent/5 transition-all duration-300">
              <div className="text-ink-faint mr-2 hidden sm:block opacity-40">
                <FileText size={15} />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                disabled={isStreaming}
                aria-label="Chat input"
                placeholder={t('chat.input_placeholder')}
                className="flex-1 bg-transparent py-2.5 md:py-3.5 font-bn text-xs md:text-sm focus:outline-none placeholder:text-ink/30 disabled:opacity-50 text-ink"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || isStreaming}
                aria-label="Send message"
                className="ml-1 px-3 py-1.5 md:px-4.5 md:py-2.5 bg-accent hover:bg-ink text-white rounded-xl font-bn font-black text-xs md:text-sm flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 disabled:scale-100 transition-all shadow-sm shrink-0"
              >
                <span className="hidden md:inline">{t('chat.send')}</span>
                <Send size={11} className={input.trim() ? 'animate-pulse' : ''} />
              </button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-center items-center gap-1 md:gap-1.5 mt-2.5 md:mt-3 opacity-60">
            <p className="text-[0.5rem] md:text-[0.55rem] uppercase tracking-widest text-ink-faint font-body font-black">
              {t('chat.footer_secure')}
            </p>
            <span className="hidden md:block text-ink-faint opacity-30 text-[0.6rem]">•</span>
            <p className="text-[0.5rem] md:text-[0.55rem] uppercase tracking-widest text-ink-faint font-body font-black text-center max-w-md">
              {t('chat.footer_disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};