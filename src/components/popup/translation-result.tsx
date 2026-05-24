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

interface DefinitionItem {
  hint: string;
  phonetic: string | null;
  meaning: string;
}

function parseDefinitions(text: string): DefinitionItem[] | null {
  const lines = text.split('\n').filter((l) => l.trim());
  const items: DefinitionItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const withPhonetic = trimmed.match(/^[•\-*]\s*\(([^)]+)\)\s*\/([^/]+)\/\s*(.+)$/);
    if (withPhonetic) {
      items.push({
        hint: withPhonetic[1].trim(),
        phonetic: withPhonetic[2].trim(),
        meaning: withPhonetic[3].trim(),
      });
      continue;
    }
    const withoutPhonetic = trimmed.match(/^[•\-*]\s*\(([^)]+)\)\s*(.+)$/);
    if (!withoutPhonetic) return null;
    items.push({
      hint: withoutPhonetic[1].trim(),
      phonetic: null,
      meaning: withoutPhonetic[2].trim(),
    });
  }

  return items.length > 0 ? items : null;
}

function posBadgeColor(hint: string): string {
  const lower = hint.toLowerCase();
  if (/名|noun|n\./i.test(lower)) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
  if (/动|verb|v\./i.test(lower)) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (/形|adj|adjective/i.test(lower)) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  if (/副|adv|adverb/i.test(lower)) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
  if (/介|prep|preposition/i.test(lower)) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
  if (/连|conj|conjunction/i.test(lower)) return 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300';
  if (/代|pron|pronoun/i.test(lower)) return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300';
  if (/量|助|叹|拟声|数|冠|前缀|后缀|词缀/i.test(lower)) return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';
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
  const definitions = parseDefinitions(result);
  const hasPhonetics = definitions ? definitions.some((d) => d.phonetic) : false;

  return (
    <div className="rounded-md border border-border bg-muted/50 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">{t('popup_result')}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCopy}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>

      {definitions ? (
        <div className="flex flex-col gap-0.5">
          {definitions.map((def, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span
                className={cn(
                  'inline-flex shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-none min-w-[4.5em]',
                  posBadgeColor(def.hint),
                )}
              >
                {def.hint}
              </span>
              {hasPhonetics && (
                <span className="shrink-0 text-muted-foreground/70 text-xs font-mono min-w-[6em]">
                  {def.phonetic ? `/${def.phonetic}/` : ''}
                </span>
              )}
              <span className="text-sm text-foreground">{def.meaning}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
      )}

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
