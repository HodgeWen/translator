import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ToastItem } from '@/hooks/use-toast';
import { t } from '@/lib/i18n';

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

  const isError = toast?.type === 'error';

  return (
    // live region 必须**常驻挂载**，只切换其内部内容。
    // 若在无提示时 return null，live region 会与消息同一批挂载，多数读屏器
    // （NVDA / VoiceOver）不会播报「新出现的 region 里已存在的文本」，
    // 等于无障碍修复失效。这里常驻一个视觉上不占位的空容器。
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="pointer-events-none fixed top-4 right-4 z-50"
    >
      {toast ? (
        <div
          className={cn(
            'pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg text-sm font-medium transition-all duration-300',
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
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded p-0.5 hover:bg-white/20 transition-colors"
            aria-label={t('a11y_dismiss_toast')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
