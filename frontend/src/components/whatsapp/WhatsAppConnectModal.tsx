import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useWhatsappOptin } from '../../hooks/useWhatsappOptin';
import { useAuth } from '../../contexts/AuthContext';

interface WhatsAppConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppConnectModal: React.FC<WhatsAppConnectModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { optin, status, errorMessage, reset } = useWhatsappOptin();
  const phone = user?.phone;

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(reset, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        onClose();
        reset();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose, reset]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-[#25D366] to-[#128C7E] p-6 text-white relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <FaWhatsapp size={26} />
                </div>
                <div>
                  <h3 className="font-bn font-extrabold text-lg">WhatsApp-এ চ্যাট করুন</h3>
                  <p className="text-white/80 text-xs font-medium">Chat on WhatsApp</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {status === 'success' ? (
                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle2 size={32} className="text-green-600" />
                  </motion.div>
                  <h4 className="font-bn font-extrabold text-lg text-ink mb-1">বার্তা পাঠানো হয়েছে!</h4>
                  <p className="text-sm text-ink-muted">Message sent!</p>
                  <p className="text-sm text-ink-muted mt-3">
                    Check WhatsApp on <span className="font-bold text-ink">{phone}</span>. PushtiAI has sent you a message.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      reset();
                    }}
                    className="mt-6 w-full py-3 rounded-xl bg-ink text-cream font-bold text-sm hover:bg-ink/90 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : !phone ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                    <Smartphone size={28} className="text-amber-500" />
                  </div>
                  <h4 className="font-bn font-extrabold text-lg text-ink mb-1">No phone number found</h4>
                  <p className="text-sm text-ink-muted mt-2">
                    Please add a phone number to your profile before using WhatsApp.
                  </p>
                  <a
                    href="/profile"
                    onClick={(e) => {
                      e.preventDefault();
                      onClose();
                      window.location.href = '/profile';
                    }}
                    className="mt-6 w-full py-3 rounded-xl bg-ink text-cream font-bold text-sm hover:bg-ink/90 transition-colors flex items-center justify-center gap-2"
                  >
                    Go to Profile <ArrowRight size={16} />
                  </a>
                </div>
              ) : (
                <>
                  <p className="text-sm text-ink-muted text-center mb-6">
                    We'll send your first message to:
                  </p>

                  <div className="flex items-center gap-3 bg-cream/60 border border-ink/5 rounded-2xl p-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-ink text-base">{phone}</div>
                      <div className="text-[0.65rem] uppercase tracking-wider text-ink-faint font-body font-bold">
                        Registered Phone
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-ink-muted text-center mb-6">
                    Make sure this number is active on WhatsApp before confirming.
                  </p>

                  {status === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4"
                    >
                      <AlertCircle size={16} />
                      <span>{errorMessage}</span>
                    </motion.div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 rounded-xl bg-cream text-ink font-bold text-sm hover:bg-ink/5 transition-colors border border-ink/5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={optin}
                      disabled={status === 'loading'}
                      className="flex-1 py-3 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:bg-[#128C7E] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {status === 'loading' ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 size={16} /> Send Message
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
