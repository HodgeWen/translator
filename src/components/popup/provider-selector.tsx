import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProviderConfig } from '@/types';

interface PopupProviderSelectorProps {
  providers: ProviderConfig[];
  selectedProviderId: string;
  onChange: (providerId: string) => void;
}

export function PopupProviderSelector({
  providers,
  selectedProviderId,
  onChange,
}: PopupProviderSelectorProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {providers.map((p) => (
        <button key={p.id} onClick={() => onChange(p.id)} className="cursor-pointer">
          <Badge
            variant={selectedProviderId === p.id ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer hover:opacity-80 transition-opacity',
              selectedProviderId === p.id
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
                : ''
            )}
          >
            {p.name}
          </Badge>
        </button>
      ))}
    </div>
  );
}
