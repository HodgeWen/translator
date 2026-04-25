import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n';

interface KeyValueListProps {
  items: Record<string, string>;
  onChange: (items: Record<string, string>) => void;
  label?: string;
}

export function KeyValueList({ items, onChange, label }: KeyValueListProps) {
  const entries = Object.entries(items);

  const update = (index: number, key: string, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = [key, value];
    onChange(Object.fromEntries(newEntries.filter(([k]) => k.trim())));
  };

  const add = () => {
    onChange({ ...items, '': '' });
  };

  const remove = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index);
    onChange(Object.fromEntries(newEntries));
  };

  return (
    <div className="space-y-2">
      {label && <div className="text-xs font-medium text-muted-foreground">{label}</div>}
      {entries.map(([key, value], index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            value={key}
            onChange={(e) => update(index, e.target.value, value)}
            placeholder={t('label_key')}
            className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => update(index, key, e.target.value)}
            placeholder={t('label_value')}
            className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => remove(index)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={add}>
        <Plus className="mr-1 h-3 w-3" />
        {t('btn_add')}
      </Button>
    </div>
  );
}
