'use client';
// context/ToastContext.tsx
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let nextId = 0;

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const icons: Record<ToastType, string> = {
    success: '✓', error: '✕', info: 'i',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
              background: t.type === 'success' ? 'var(--green-dim)' :
                          t.type === 'error'   ? 'var(--red-dim)'   : 'var(--blue-dim)',
            }}>
              {icons[t.type]}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
