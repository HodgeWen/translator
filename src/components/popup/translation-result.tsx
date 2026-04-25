import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { t } from '@/lib/i18n';

interface PopupTranslationResultProps {
  result: string;
  onCopy: () => void;
}

export function PopupTranslationResult({
  result,
  onCopy,
}: PopupTranslationResultProps) {
  if (!result) return null;

  return (
    <div className="rounded-md border border-border bg-muted/50 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">{t('popup_result')}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCopy}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-sm leading-relaxed">{result}</p>
    </div>
  );
}
