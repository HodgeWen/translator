import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NumberInputProps {
  value?: number;
  onChange?: (value: number) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  min?: number;
  max?: number;
  step?: number;
  allowEmpty?: boolean;
  size?: 'default' | 'sm';
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function NumberInput({
  value,
  onChange,
  onBlur,
  min,
  max,
  step = 1,
  allowEmpty = false,
  size = 'default',
  placeholder,
  disabled = false,
  className,
}: NumberInputProps) {
  const [inputValue, setInputValue] = React.useState<string>('');

  React.useEffect(() => {
    setInputValue(value === undefined || value === null ? '' : String(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    // 只允许数字输入
    if (rawVal !== '' && !/^\d+$/.test(rawVal)) {
      return;
    }

    setInputValue(rawVal);

    if (rawVal === '') {
      if (allowEmpty) {
        onChange?.(undefined as any);
      }
      return;
    }

    const parsed = parseInt(rawVal, 10);
    if (!isNaN(parsed)) {
      // 只有在满足 min 和 max 限制时才实时通知父级
      const isBelowMin = min !== undefined && parsed < min;
      const isAboveMax = max !== undefined && parsed > max;
      if (!isBelowMin && !isAboveMax) {
        onChange?.(parsed);
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(e);

    if (inputValue === '') {
      if (allowEmpty) {
        onChange?.(undefined as any);
        return;
      }
      const fallback = min !== undefined ? min : (value ?? 0);
      setInputValue(String(fallback));
      onChange?.(fallback);
      return;
    }

    let parsed = parseInt(inputValue, 10);
    if (isNaN(parsed)) {
      parsed = min !== undefined ? min : (value ?? 0);
    }

    let finalVal = parsed;
    if (min !== undefined && finalVal < min) {
      finalVal = min;
    }
    if (max !== undefined && finalVal > max) {
      finalVal = max;
    }

    setInputValue(String(finalVal));
    onChange?.(finalVal);
  };

  const handleStep = (direction: 'up' | 'down') => {
    if (disabled) return;

    let currentVal = parseInt(inputValue, 10);
    if (isNaN(currentVal)) {
      currentVal = min !== undefined ? min : (value ?? 0);
    }
    const currentStep = step ?? 1;
    let nextVal = direction === 'up' ? currentVal + currentStep : currentVal - currentStep;

    if (min !== undefined && nextVal < min) {
      nextVal = min;
    }
    if (max !== undefined && nextVal > max) {
      nextVal = max;
    }

    setInputValue(String(nextVal));
    onChange?.(nextVal);
  };

  const parsedVal = parseInt(inputValue, 10);
  const isMinusDisabled = disabled || (min !== undefined && !isNaN(parsedVal) && parsedVal <= min);
  const isPlusDisabled = disabled || (max !== undefined && !isNaN(parsedVal) && parsedVal >= max);

  return (
    <div
      className={cn(
        "flex items-center rounded-md border border-input bg-background overflow-hidden transition-all duration-200",
        "focus-within:ring-1 focus-within:ring-ring focus-within:border-ring",
        disabled && "opacity-50 bg-muted/30 cursor-not-allowed",
        size === 'sm' ? 'h-8' : 'h-9',
        className
      )}
    >
      <button
        type="button"
        disabled={isMinusDisabled}
        onClick={() => handleStep('down')}
        className={cn(
          "flex items-center justify-center shrink-0 text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
          "disabled:opacity-30 disabled:pointer-events-none cursor-pointer",
          size === 'sm' ? 'w-8 h-full border-r border-input' : 'w-9 h-full border-r border-input'
        )}
      >
        <Minus className={size === 'sm' ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1 min-w-0 bg-transparent text-center focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        )}
      />

      <button
        type="button"
        disabled={isPlusDisabled}
        onClick={() => handleStep('up')}
        className={cn(
          "flex items-center justify-center shrink-0 text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
          "disabled:opacity-30 disabled:pointer-events-none cursor-pointer",
          size === 'sm' ? 'w-8 h-full border-l border-input' : 'w-9 h-full border-l border-input'
        )}
      >
        <Plus className={size === 'sm' ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
}
