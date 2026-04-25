import { Button } from '@/components/ui/button';
import type { GlobalSettings } from '@/types';
import { t } from '@/lib/i18n';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

interface OptionsModelQueueProps {
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
}

export function OptionsModelQueue({ settings, onSave }: OptionsModelQueueProps) {
  const moveQueueItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === settings.modelQueue.length - 1) return;

    const newQueue = [...settings.modelQueue];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newQueue[index], newQueue[swapIndex]] = [newQueue[swapIndex], newQueue[index]];
    onSave({ ...settings, modelQueue: newQueue });
  };

  const toggleQueueItem = (index: number) => {
    const newQueue = [...settings.modelQueue];
    newQueue[index] = { ...newQueue[index], enabled: !newQueue[index].enabled };
    onSave({ ...settings, modelQueue: newQueue });
  };

  const removeQueueItem = (index: number) => {
    const newQueue = settings.modelQueue.filter((_, i) => i !== index);
    onSave({ ...settings, modelQueue: newQueue });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">{t('queue_description')}</div>
      <div className="rounded-lg border border-border divide-y divide-border">
        {settings.modelQueue.map((item, index) => {
          const provider = settings.providers.find((p) => p.id === item.providerId);
          const model = provider?.models.find((m) => m.id === item.modelId);
          return (
            <div key={`${item.providerId}:${item.modelId}`} className="flex items-center gap-4 p-4">
              <div className="text-sm text-muted-foreground w-8 text-right">{index + 1}</div>
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={() => toggleQueueItem(index)}
                className="h-4 w-4 rounded border-border"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {provider?.name || item.providerId} / {model?.name || item.modelId}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveQueueItem(index, 'up')}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveQueueItem(index, 'down')}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeQueueItem(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
