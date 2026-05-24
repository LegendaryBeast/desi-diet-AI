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
  User,
  ChevronDown,
  Mic,
  Square,
  Loader2,
  ImagePlus,
  X,
  Crown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { DashboardLayout } from '../layout/DashboardLayout';
import { ProModal } from '../ui/ProModal';
import { chatApi, type ChatHistoryItem, isAuthenticated, type MealTrackingResponse } from '../../lib/api';

interface Message {
  id: number;
  type: 'ai' | 'user';
  text: string;
  time: string;
  /** Optional inline image (data-URL) attached to this message. */
  imageDataUrl?: string;
  loggedMeal?: MealTrackingResponse;
}

const renderFormattedText = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, lineIndex) => {
    let content = line;
    let isHeader = false;
    let headerLevel = 0;
    const headerMatch = content.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      isHeader = true;
      headerLevel = headerMatch[1].length;
      content = headerMatch[2];
    }
    const isBullet = content.trim().startsWith('-');
    if (isBullet) content = content.replace(/^\s*-\s*/, '');
    const parts = content.split('**');
    const formattedLine = parts.map((part, partIndex) => {
      if (partIndex % 2 === 1) return <strong key={partIndex} className="font-bold text-accent">{part}</strong>;
      return part;
    });
    if (isHeader) {
      const cls = headerLevel === 3
        ? "text-xs md:text-sm font-bold text-ink mt-3 mb-1.5 block border-b border-ink/5 pb-0.5"
        : "text-sm md:text-base font-bold text-ink mt-4 mb-2 block border-b border-ink/5 pb-0.5";
      return <span key={lineIndex} className={cls}>{formattedLine}</span>;
    }
    if (isBullet) {
      return (
        <span key={lineIndex} className="pl-3 py-0.5 flex items-start gap-1.5 leading-relaxed block text-ink-muted">
          <span className="text-accent shrink-0 mt-2 text-[0.45rem]">•</span>
          <span className="flex-1">{formattedLine}</span>
        </span>
      );
    }
    if (content.trim() === '') return <span key={lineIndex} className="h-1.5 block" />;
    return <span key={lineIndex} className="block leading-relaxed">{formattedLine}</span>;
  });
};

export const ChatWindow = () => {
  const { t, i18n } = useTranslation();
  const { profileData, isLoggedIn } = useAuth();
  const { isPro, canSendMessage, messageCount, incrementMessageCount, FREE_MESSAGE_LIMIT } = useSubscription();
  const [showProModal, setShowProModal] = useState(false);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  // Image attached to the next outgoing message (base64 data-URL + filename)
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Realtime voice state
  const [voiceState, setVoiceState] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<(() => void) | null>(null);
  // Realtime refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const liveAiMsgIdRef = useRef<number | null>(null);
  const liveUserMsgIdRef = useRef<number | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const stopVoiceSession = useCallback(() => {
    try { dcRef.current?.close(); } catch { /* ignore */ }
    try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch { /* ignore */ }
    try { pcRef.current?.close(); } catch { /* ignore */ }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
    pcRef.current = null;
    dcRef.current = null;
    localStreamRef.current = null;
    liveAiMsgIdRef.current = null;
    liveUserMsgIdRef.current = null;
    setVoiceState('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.();
      stopVoiceSession();
    };
  }, [stopVoiceSession]);

  // ─── Realtime voice session (WebRTC → OpenAI) ───────────────────────────
  const startVoiceSession = useCallback(async () => {
    if (voiceState !== 'idle' || isStreaming) return;
    setVoiceError(null);
    setVoiceState('connecting');

    try {
      // 1. Mint ephemeral session via our backend (carries RAG context).
      //    GA response shape: { value: "ek_...", expires_at, session: { model, ... } }
      const session = await chatApi.realtimeSession({
        voice: 'alloy',
        language: i18n.language,
      });
      const ephemeralKey = session?.value;
      const model = session?.session?.model || 'gpt-realtime';
      if (!ephemeralKey) throw new Error('No ephemeral key returned');

      // 2. Capture mic.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // 3. Set up WebRTC peer connection.
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Remote audio (assistant voice) → hidden <audio> element
      pc.ontrack = (e) => {
        if (remoteAudioRef.current && e.streams[0]) {
          remoteAudioRef.current.srcObject = e.streams[0];
          remoteAudioRef.current.play().catch(() => { /* autoplay may be blocked */ });
        }
      };

      // Add mic track
      stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

      // Data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      const ensureMsg = (
        ref: React.MutableRefObject<number | null>,
        type: 'ai' | 'user',
      ) => {
        if (ref.current != null) return ref.current;
        const id = Date.now() + Math.floor(Math.random() * 1000);
        ref.current = id;
        setMessages((prev) => [
          ...prev,
          { id, type, text: '', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ]);
        return id;
      };

      const appendToMsg = (id: number, delta: string) => {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: m.text + delta } : m)));
      };

      const replaceMsgText = (id: number, text: string) => {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text } : m)));
      };

      dc.onmessage = (e) => {
        let evt: any;
        try { evt = JSON.parse(e.data); } catch { return; }
        // Debug: log every event type so we can see what GA sends
        // eslint-disable-next-line no-console
        console.log('[realtime]', evt.type, evt);

        const type: string = evt.type || '';

        if (type === 'session.created' || type === 'session.updated') {
          setVoiceState('live');
          return;
        }

        if (type === 'input_audio_buffer.speech_started') {
          liveUserMsgIdRef.current = null;
          ensureMsg(liveUserMsgIdRef, 'user');
          return;
        }

        // User transcription events (handle both legacy + GA names)
        if (type.startsWith('conversation.item.input_audio_transcription')) {
          const id = ensureMsg(liveUserMsgIdRef, 'user');
          if (type.endsWith('.delta') && evt.delta) appendToMsg(id, evt.delta);
          if (type.endsWith('.completed') || type.endsWith('.done')) {
            if (evt.transcript) replaceMsgText(id, evt.transcript);
            liveUserMsgIdRef.current = null;
          }
          return;
        }

        if (type === 'response.created') {
          liveAiMsgIdRef.current = null;
          ensureMsg(liveAiMsgIdRef, 'ai');
          return;
        }

        // AI transcript events — GA renamed `response.audio_transcript.*` to
        // `response.output_audio_transcript.*`. Accept both.
        if (
          type === 'response.audio_transcript.delta' ||
          type === 'response.output_audio_transcript.delta'
        ) {
          const id = ensureMsg(liveAiMsgIdRef, 'ai');
          if (evt.delta) appendToMsg(id, evt.delta);
          return;
        }
        if (
          type === 'response.audio_transcript.done' ||
          type === 'response.output_audio_transcript.done'
        ) {
          const id = ensureMsg(liveAiMsgIdRef, 'ai');
          if (evt.transcript) replaceMsgText(id, evt.transcript);
          return;
        }

        // Fallback: text-only output (in case the model emits text frames)
        if (
          type === 'response.text.delta' ||
          type === 'response.output_text.delta'
        ) {
          const id = ensureMsg(liveAiMsgIdRef, 'ai');
          if (evt.delta) appendToMsg(id, evt.delta);
          return;
        }

        if (type === 'response.done') {
          liveAiMsgIdRef.current = null;
          return;
        }

        if (type === 'error') {
          setVoiceError(evt.error?.message || 'Realtime error');
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
          stopVoiceSession();
        }
      };

      // 4. Create offer and exchange SDP with OpenAI.
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // GA SDP exchange: POST /v1/realtime/calls (the old /v1/realtime path was beta).
      // No "OpenAI-Beta: realtime=v1" header in GA.
      const sdpResp = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });
      if (!sdpResp.ok) {
        const err = await sdpResp.text();
        throw new Error(`OpenAI SDP exchange failed: ${sdpResp.status} ${err.slice(0, 200)}`);
      }
      const answerSdp = await sdpResp.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Voice session failed');
      setVoiceState('error');
      stopVoiceSession();
    }
  }, [voiceState, isStreaming, i18n.language, stopVoiceSession]);

  const buildHistory = (): ChatHistoryItem[] =>
    messages.map((m) => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

  const send = useCallback((overrideText?: string) => {
    const textToSend = overrideText || input;
    // Allow sending if there's text OR an attached image
    if ((!textToSend.trim() && !pendingImage) || isStreaming) return;

    // Free tier: check message limit
    if (!canSendMessage) {
      setShowProModal(true);
      return;
    }

    // Increment counter for free users
    if (!isPro) {
      incrementMessageCount();
    }

    setApiError(null);

    const attachedImage = pendingImage;
    const userMsg: Message = {
      id: Date.now(),
      type: 'user',
      text: textToSend || (attachedImage ? '🖼️ Image' : ''),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imageDataUrl: attachedImage?.dataUrl,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setPendingImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      textToSend || 'Please describe what you see in this image and how it fits my diet.',
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
      },
      attachedImage ? { imageDataUrl: attachedImage.dataUrl } : undefined,
      (meal) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, loggedMeal: meal } : m))
        );
      }
    );

    abortRef.current = abort;
  }, [input, isStreaming, isLoggedIn, i18n.language, messages, pendingImage, canSendMessage, isPro, incrementMessageCount]);

  // ─── Image attach handler ────────────────────────────────────────────────
  const handleImagePick = useCallback(async (file: File) => {
    setApiError(null);
    if (!file.type.startsWith('image/')) {
      setApiError('Please choose an image file (JPG, PNG, WebP, GIF).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setApiError('Image too large — keep under 8 MB.');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    setPendingImage({ dataUrl, name: file.name });
  }, []);

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
          <div className="w-10 h-10 md:w-12 md:h-12 bg-ink rounded-xl md:rounded-2xl flex items-center justify-center text-cream shadow-lg transform -rotate-3">
            <Bot size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-4 md:h-4 bg-green-500 border-2 md:border-4 border-white rounded-full" />
        </div>
      )}
      headerActions={(
        <button
          onClick={() => { abortRef.current?.(); setMessages([]); setApiError(null); }}
          className="p-2 md:p-3 bg-cream text-ink-muted hover:bg-red-50 hover:text-red-500 rounded-xl transition-all flex items-center gap-2 text-[0.65rem] md:text-xs font-bold font-bn shadow-sm"
        >
          <History size={16} />
          <span className="hidden sm:inline">{t('chat.clear_chat')}</span>
        </button>
      )}
    >
      {/* Pro Upgrade Modal */}
      <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} trigger="chat_limit" />

      <div className="flex-1 flex flex-col relative max-w-6xl mx-auto w-full min-h-0">
        {/* Soft Background Glows */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[300px] md:w-[800px] h-[300px] md:h-[600px] bg-accent/5 blur-[80px] md:blur-[120px] rounded-full pointer-events-none" />

        {/* API Error Banner */}
        {apiError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="m-4 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-bn z-20"
          >
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </motion.div>
        )}

        {/* Voice Error / Live Indicator */}
        {voiceError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="m-4 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-bn z-20"
          >
            <Mic className="w-4 h-4 shrink-0" />
            <span>{voiceError}</span>
            <button onClick={() => setVoiceError(null)} className="ml-auto text-xs underline">dismiss</button>
          </motion.div>
        )}
        {voiceState === 'live' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="m-4 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-bn z-20"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live voice conversation — speak naturally, the assistant will respond out loud.</span>
          </motion.div>
        )}

        {/* Hidden audio element for assistant voice playback (Realtime API) */}
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 pb-12 md:p-8 md:pb-24 space-y-6 md:space-y-10 scroll-smooth relative z-10">
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col items-center justify-center text-center py-10"
              >
                {/* Brand Icon */}
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-12 h-12 md:w-20 md:h-20 bg-ink rounded-2xl md:rounded-[2rem] flex items-center justify-center text-cream mb-4 md:mb-8 shadow-2xl relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <MessageSquare size={32} className="relative z-10" />
                </motion.div>

                <div className="space-y-2 md:space-y-4 mb-6 md:mb-16 px-4">
                  <h4 className="text-ink-muted font-bn text-sm md:text-xl opacity-60">
                    {t('chat.greeting_user', { name: displayName })}
                  </h4>
                  <h3 className="font-display text-2xl md:text-4xl lg:text-5xl font-black text-ink tracking-tight leading-tight">
                    {t('chat.how_can_i_help')}
                  </h3>
                  <p className="font-bn text-[0.75rem] md:text-base text-ink-faint max-w-md mx-auto">
                    {t('chat.description_short')}
                  </p>
                </div>

                {/* Suggestion Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 w-full max-w-4xl px-2">
                  {[
                    { icon: Layout, title: t('chat.suggestions.title1'), sub: t('chat.suggestions.sub1'), label: 'Meal Plan' },
                    { icon: Activity, title: t('chat.suggestions.title2'), sub: t('chat.suggestions.sub2'), label: 'Health Status' },
                    { icon: Flame, title: t('chat.suggestions.title3'), sub: t('chat.suggestions.sub3'), label: 'Nutrients' },
                  ].map((btn, i) => (
                    <button
                      key={i}
                      onClick={() => send(btn.title)}
                      disabled={isStreaming}
                      className="p-4 md:p-8 bg-white border border-ink/5 rounded-2xl md:rounded-[2.5rem] text-center sm:text-left hover:border-accent/20 hover:shadow-2xl transition-all group shadow-sm disabled:opacity-50 flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-0"
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-cream rounded-xl md:rounded-2xl flex items-center justify-center text-ink group-hover:bg-accent group-hover:text-cream transition-colors shrink-0 sm:mb-6">
                        <btn.icon size={18} className="md:w-5 md:h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-bn font-bold text-sm md:text-xl text-ink mb-0.5 md:mb-2">{btn.title}</div>
                        <div className="font-bn text-xs text-ink-muted opacity-60">{btn.sub}</div>
                      </div>
                      <div className="hidden sm:block text-[0.6rem] uppercase tracking-widest text-ink-faint font-body font-bold border-t border-ink/5 pt-4 w-full mt-4">
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
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2 md:gap-4`}
                >
                  {msg.type === 'ai' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-[1.25rem] bg-ink flex-shrink-0 flex items-center justify-center text-cream shadow-xl mb-1 transform -rotate-6 border-2 border-white/10"
                    >
                      <Bot size={16} className="md:w-6 md:h-6" />
                    </motion.div>
                  )}
                  <div className={`relative p-4 md:p-7 lg:p-9 rounded-[1.5rem] md:rounded-[2.8rem] font-bn leading-relaxed text-sm md:text-lg max-w-[92%] md:max-w-[80%] lg:max-w-[70%] shadow-lg transition-all duration-300 ${
                    msg.type === 'user'
                      ? 'bg-ink text-cream rounded-br-none shadow-ink/30'
                      : 'bg-white border border-ink/5 text-ink rounded-tl-none ring-1 ring-ink/5'
                  }`}>
                    {/* Loading dots when empty */}
                    {msg.type === 'ai' && msg.text === '' && (
                      <div className="flex gap-1.5 py-2 px-1">
                        <div className="w-2 h-2 bg-ink/20 rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-ink/20 rounded-full animate-pulse delay-75" />
                        <div className="w-2 h-2 bg-ink/20 rounded-full animate-pulse delay-150" />
                      </div>
                    )}
                    {msg.imageDataUrl && (
                      <img
                        src={msg.imageDataUrl}
                        alt="attached"
                        className="max-h-64 rounded-2xl mb-3 border border-white/10 shadow-md"
                      />
                    )}
                    <div className="relative z-10 whitespace-pre-wrap font-bn break-words leading-relaxed">
                      {msg.type === 'user' ? msg.text : renderFormattedText(msg.text)}
                    </div>
                    {msg.loggedMeal && (
                      <div className="mt-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3 text-ink text-left">
                        <div className="flex items-center justify-between">
                          <div className="font-display font-black text-sm flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            {isBn ? 'খাবারটি লগ করা হয়েছে!' : 'Meal Logged Successfully!'}
                          </div>
                          <span className="bg-emerald-500 text-cream font-bold text-[0.65rem] px-2 py-0.5 rounded-full">
                            {msg.loggedMeal.total_calories} kcal
                          </span>
                        </div>
                        
                        {msg.loggedMeal.parsed_items.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {msg.loggedMeal.parsed_items.map((item, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-white border border-emerald-100/60 rounded-full text-xs font-bn font-bold text-ink-muted flex items-center gap-1 shadow-sm"
                              >
                                {item.name}
                                {item.amount_g ? ` · ${Math.round(item.amount_g)}g` : ''}
                                <span className="text-ink-faint ml-0.5">{Math.round(item.calories)}kcal</span>
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-3 gap-2 bg-white/60 p-2.5 rounded-xl text-center text-[0.7rem] border border-emerald-100/30">
                          <div>
                            <div className="font-body font-black text-ink-muted">{Math.round(msg.loggedMeal.macros.protein_g || 0)}g</div>
                            <div className="text-[0.55rem] uppercase tracking-widest text-ink-faint font-bold">{isBn ? 'প্রোটিন' : 'Protein'}</div>
                          </div>
                          <div>
                            <div className="font-body font-black text-ink-muted">{Math.round(msg.loggedMeal.macros.carbs_g || 0)}g</div>
                            <div className="text-[0.55rem] uppercase tracking-widest text-ink-faint font-bold">{isBn ? 'কার্বস' : 'Carbs'}</div>
                          </div>
                          <div>
                            <div className="font-body font-black text-ink-muted">{Math.round(msg.loggedMeal.macros.fat_g || 0)}g</div>
                            <div className="text-[0.55rem] uppercase tracking-widest text-ink-faint font-bold">{isBn ? 'ফ্যাট' : 'Fat'}</div>
                          </div>
                        </div>

                        {msg.loggedMeal.ai_feedback && (
                          <div className="text-xs text-ink-muted border-t border-emerald-100/50 pt-2 font-bn">
                            <strong>{isBn ? 'পরামর্শ:' : 'Insight:'}</strong> {msg.loggedMeal.ai_feedback}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Streaming cursor */}
                    {msg.type === 'ai' && isStreaming && msg.text !== '' && (
                      <span className="inline-block w-0.5 h-5 bg-accent ml-1 animate-pulse" />
                    )}
                    <div className={`text-[0.6rem] md:text-[0.65rem] mt-2 md:mt-4 font-body font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.type === 'ai' && <div className="w-1 h-1 bg-accent rounded-full animate-ping" />}
                      {msg.time}
                    </div>
                  </div>
                </motion.div>
              ))
            )}

            {/* AI Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col gap-2"
              >
                <div className="flex justify-start items-end gap-2 md:gap-4">
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-[1.25rem] bg-ink flex-shrink-0 flex items-center justify-center text-cream shadow-xl mb-1 transform -rotate-6">
                    <Bot size={16} className="md:w-6 md:h-6" />
                  </div>
                  <div className="p-5 md:p-6 bg-white border border-ink/5 rounded-[1.8rem] md:rounded-[2.2rem] rounded-tl-none shadow-xl flex items-center gap-1.5 ring-1 ring-ink/5">
                    {[0, 1, 2].map((dot) => (
                      <motion.div
                        key={dot}
                        className="w-2 h-2 md:w-2.5 md:h-2.5 bg-accent/40 rounded-full"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.15, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ml-10 md:ml-16 flex items-center gap-2"
                >
                  <span className="text-[0.65rem] md:text-xs font-bn font-bold text-accent tracking-wider uppercase flex items-center gap-1.5">
                    {t('chat.ai_name')}
                    <span className="animate-pulse">{t('chat.typing')}</span>
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-6 md:h-8 shrink-0" />
        </div>

        {/* Scroll to bottom button */}
        {messages.length > 3 && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-32 right-6 p-3 bg-white border border-ink/10 rounded-2xl shadow-xl text-ink-muted hover:text-accent transition-all z-20"
          >
            <ChevronDown size={18} />
          </button>
        )}

        {/* Free tier message counter */}
        {!isPro && (
          <div className="mx-4 md:mx-8 mb-0 z-30">
            <div className={`flex items-center justify-between px-4 py-2 rounded-t-2xl border border-b-0 text-xs font-bn font-bold ${
              canSendMessage
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>
                  {canSendMessage
                    ? `ফ্রি মেসেজ: ${messageCount}/${FREE_MESSAGE_LIMIT} ব্যবহৃত`
                    : 'ফ্রি মেসেজ শেষ!'}
                </span>
              </div>
              <button
                onClick={() => setShowProModal(true)}
                className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[0.62rem] rounded-lg font-black hover:shadow-lg transition-all flex items-center gap-1"
              >
                <Crown className="w-3 h-3" />
                Pro তে আপগ্রেড
              </button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 md:p-8 bg-white/90 backdrop-blur-xl border-t border-ink/5 z-30 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
          {/* Pending image preview chip */}
          {pendingImage && (
            <div className="max-w-5xl mx-auto mb-3 flex items-center gap-3">
              <div className="relative inline-block">
                <img
                  src={pendingImage.dataUrl}
                  alt={pendingImage.name}
                  className="h-20 w-20 object-cover rounded-2xl border border-ink/10 shadow-sm"
                />
                <button
                  onClick={() => { setPendingImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-ink text-cream rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors"
                  aria-label="Remove attached image"
                  title="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="text-xs font-body text-ink-muted truncate max-w-[60%]">
                <div className="font-black uppercase tracking-widest text-[0.6rem] text-accent mb-1">Attached</div>
                <div className="truncate">{pendingImage.name}</div>
              </div>
            </div>
          )}

          {/* Hidden file input for image picking */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImagePick(f);
            }}
          />

          <div className="max-w-5xl mx-auto flex items-center gap-3 md:gap-5">
            <button
              aria-label="View history"
              onClick={() => setMessages([])}
              className="p-4 md:p-5 bg-ink text-cream rounded-[1.2rem] md:rounded-[1.5rem] shadow-2xl hover:bg-accent transition-all shrink-0 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
              <History size={22} className="relative z-10" />
            </button>

            <div className="flex-1 bg-white border border-ink/10 rounded-full flex items-center px-4 md:px-8 py-1 md:py-2 shadow-2xl shadow-ink/5 focus-within:border-accent/60 focus-within:ring-4 ring-accent/5 transition-all duration-500">
              <div className="text-accent mr-3 md:mr-5 hidden sm:block opacity-60">
                <FileText size={20} />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                disabled={isStreaming || voiceState !== 'idle'}
                aria-label="Chat input"
                placeholder={
                  voiceState === 'connecting' ? '🔌 Connecting voice…'
                  : voiceState === 'live' ? '🎙️ Listening — speak naturally'
                  : t('chat.input_placeholder')
                }
                className="flex-1 bg-transparent py-3 md:py-5 font-bn text-sm md:text-xl focus:outline-none placeholder:text-ink/30 disabled:opacity-50"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || voiceState !== 'idle'}
                aria-label="Attach image"
                title="Attach image"
                className={`ml-1 md:ml-2 p-2.5 md:p-3 rounded-full transition-all shrink-0 ${
                  pendingImage
                    ? 'bg-accent text-white shadow-lg shadow-accent/40'
                    : 'bg-cream text-ink-muted hover:bg-accent hover:text-white'
                } disabled:opacity-30 disabled:hover:bg-cream disabled:hover:text-ink-muted`}
              >
                <ImagePlus size={18} />
              </button>
              <button
                onClick={voiceState === 'idle' ? startVoiceSession : stopVoiceSession}
                disabled={isStreaming || voiceState === 'connecting'}
                aria-label={voiceState === 'idle' ? 'Start voice conversation' : 'End voice conversation'}
                title={voiceState === 'idle' ? 'Voice conversation' : 'End voice conversation'}
                className={`ml-1 md:ml-2 p-2.5 md:p-3 rounded-full transition-all shrink-0 ${
                  voiceState === 'live'
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40'
                    : voiceState === 'connecting'
                    ? 'bg-amber-400 text-white'
                    : 'bg-cream text-ink-muted hover:bg-accent hover:text-white'
                } disabled:opacity-30 disabled:hover:bg-cream disabled:hover:text-ink-muted`}
              >
                {voiceState === 'connecting' ? <Loader2 size={18} className="animate-spin" />
                  : voiceState === 'live' ? <Square size={18} />
                  : <Mic size={18} />}
              </button>
              <button
                onClick={() => send()}
                disabled={(!input.trim() && !pendingImage) || isStreaming || voiceState !== 'idle'}
                aria-label="Send message"
                className="ml-2 px-4 md:px-10 py-2 md:py-4 bg-accent text-white rounded-full font-bn font-black text-sm md:text-xl flex items-center gap-2 hover:bg-ink hover:scale-105 active:scale-95 disabled:opacity-20 disabled:scale-100 transition-all shadow-xl shadow-accent/20 shrink-0"
              >
                <span className="hidden md:inline">{t('chat.send')}</span>
                <Send size={18} className={input.trim() ? 'animate-pulse' : ''} />
              </button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-center items-center gap-2 mt-4 md:mt-6">
            <p className="text-[0.6rem] md:text-[0.7rem] uppercase tracking-[0.3em] text-ink-faint font-body font-black opacity-40">
              {t('chat.footer_secure')}
            </p>
            <span className="hidden md:block text-ink-faint opacity-20">•</span>
            <p className="text-[0.6rem] md:text-[0.7rem] uppercase tracking-[0.3em] text-ink-faint font-body font-black opacity-40">
              {t('chat.footer_disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};