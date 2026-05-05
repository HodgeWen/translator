import { useState, useCallback, useEffect, useRef } from 'react';

type ToastType = 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface UseToastReturn {
  toast: ToastItem | null;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  dismiss: () => void;
}

export function useToast(autoDismissMs = 3000): UseToastReturn {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timerRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      const id = crypto.randomUUID();
      setToast({ id, message, type });
      timerRef.current = window.setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, autoDismissMs);
    },
    [autoDismissMs]
  );

  const showSuccess = useCallback(
    (message: string) => showToast(message, 'success'),
    [showToast]
  );

  const showError = useCallback(
    (message: string) => showToast(message, 'error'),
    [showToast]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { toast, showSuccess, showError, dismiss };
}
