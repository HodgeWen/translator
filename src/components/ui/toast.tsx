import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ToastItem } from '@/hooks/use-toast';

interface ToastProps {
  toast: ToastItem | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      const enter = window.setTimeout(() => setVisible(true), 10);
      return () => window.clearTimeout(enter);
    } else {
      setVisible(false);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg text-sm font-medium transition-all duration-300',
        'max-w-[320px]',
        toast.type === 'success' && 'bg-emerald-500 text-white',
        toast.type === 'error' && 'bg-destructive text-white',
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      )}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      <span className="flex-1 break-words">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 hover:bg-white/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
