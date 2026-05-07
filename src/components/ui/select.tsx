import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: ReactNode;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function Select({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select...',
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      setPlacement('top');
    } else {
      setPlacement('bottom');
    }
  }, [open, options.length]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors',
          'focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          'hover:bg-accent/50'
        )}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.label : placeholder}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          className={cn(
            'absolute z-50 w-full rounded-md border border-border bg-popover shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95',
            placement === 'bottom' ? 'mt-1 top-full' : 'mb-1 bottom-full'
          )}
        >
          <div className="max-h-60 overflow-auto py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  value === option.value && 'bg-accent text-accent-foreground'
                )}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && (
                  <Check className="ml-2 h-4 w-4 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
