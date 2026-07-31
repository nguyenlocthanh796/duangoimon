import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  message: string;
  subMessage?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  toastState: (ToastOptions & { visible: boolean; id: number }) | null;
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastState, setToastState] = useState<(ToastOptions & { visible: boolean; id: number }) | null>(null);

  const showToast = useCallback((options: ToastOptions) => {
    setToastState({
      ...options,
      type: options.type || 'success',
      duration: options.duration ?? 2000,
      visible: true,
      id: Date.now(),
    });
  }, []);

  const hideToast = useCallback(() => {
    setToastState(prev => (prev ? { ...prev, visible: false } : null));
  }, []);

  return (
    <ToastContext.Provider value={{ toastState, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback stub if used outside provider gracefully
    return {
      toastState: null,
      showToast: () => {},
      hideToast: () => {},
    };
  }
  return context;
};
