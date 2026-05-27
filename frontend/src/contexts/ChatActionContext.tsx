import { createContext, useContext, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface ToastMessage {
  id: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

interface ChatActionContextType {
  navigateTo: (path: string) => void;
  showToast: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
}

const ChatActionContext = createContext<ChatActionContextType | null>(null);

export const ChatActionProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);

  const navigateTo = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate]
  );

  const showToast = useCallback(
    (message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      const id = String(++idRef.current);
      setToasts((prev) => [...prev, { id, message, level }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ChatActionContext.Provider value={{ navigateTo, showToast, toasts, dismissToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const colors = {
            info: 'bg-accent text-white',
            success: 'bg-green-500 text-white',
            warning: 'bg-amber-500 text-white',
            error: 'bg-red-500 text-white',
          };
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto px-4 py-2.5 rounded-xl shadow-lg text-sm font-bold font-bn max-w-sm animate-in slide-in-from-right fade-in duration-300 ${colors[toast.level]}`}
            >
              {toast.message}
            </div>
          );
        })}
      </div>
    </ChatActionContext.Provider>
  );
};

export const useChatActions = () => {
  const ctx = useContext(ChatActionContext);
  if (!ctx) throw new Error('useChatActions must be used within ChatActionProvider');
  return ctx;
};
