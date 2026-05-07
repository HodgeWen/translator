import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Cpu, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

interface PopupTranslationResultProps {
  result: string;
  onCopy: () => void;
  providerName?: string;
  modelName?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export function PopupTranslationResult({
  result,
  onCopy,
  providerName,
  modelName,
  usage,
}: PopupTranslationResultProps) {
  const [metaOpen, setMetaOpen] = useState(false);

  if (!result) return null;

  const hasMeta = !!providerName || !!modelName || !!usage;

  return (
    <div className="rounded-md border border-border bg-muted/50 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">{t('popup_result')}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCopy}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{result}</p>

      {hasMeta && (
        <div className="mt-2 pt-2 border-t border-border/60">
          <button
            onClick={() => setMetaOpen(!metaOpen)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {metaOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {metaOpen ? t('popup_meta_hide') : t('popup_meta_show')}
          </button>

          {metaOpen && (
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {(providerName || modelName) && (
                <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Cpu className="h-3 w-3" />
                  <span className="truncate max-w-[120px]" title={providerName}>
                    {providerName}
                  </span>
                  {modelName && (
                    <>
                      <span className="text-muted-foreground/40">/</span>
                      <span className="truncate" title={modelName}>
                        {modelName}
                      </span>
                    </>
                  )}
                </div>
              )}
              {usage && (
                <div className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/70 ml-auto">
                  <span className={cn('px-1 py-0.5 rounded bg-accent/60')}>Prompt {usage.promptTokens}</span>
                  <span className={cn('px-1 py-0.5 rounded bg-accent/60')}>Output {usage.completionTokens}</span>
                  <span className={cn('px-1 py-0.5 rounded bg-primary/10 text-primary/80 font-medium')}>Total {usage.totalTokens}</span>
                </div>
              )}
             </div>
          )}
        </div>
      )}
    </div>
  );
}
