import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useId,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: ReactNode;
  // label 可能是 JSX，读屏文本由调用方补一份纯文本；不传则退回选项自身的可见文本
  ariaLabel?: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  // 触发按钮 id，供外部 <label htmlFor> 关联
  id?: string;
  // 触发按钮的无障碍名称，未传时回退到 placeholder
  ariaLabel?: string;
  // 外部可见标签的 id，传入后优先作为无障碍名称
  ariaLabelledby?: string;
}

export function Select({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select...',
  className,
  compact = false,
  id,
  ariaLabel,
  ariaLabelledby,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  // 键盘高亮项索引，-1 表示无高亮
  const [activeIndex, setActiveIndex] = useState(-1);
  // 是否把焦点移入列表：键盘打开（含鼠标打开后再按方向键）才移，纯鼠标点击不抢焦点
  const [focusList, setFocusList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // 稳定 id：调用方未传 id 时用 useId 兜底，并去掉冒号等字符，避免被当成 CSS 选择器
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const triggerId = id ?? `select-${generatedId}`;
  const listboxId = `${triggerId}-listbox`;
  const getOptionId = (index: number) => `${triggerId}-option-${index}`;
  // 触发按钮内可见文本的 id：无障碍名称通过引用它来带上「当前选中值」，
  // 这样 label 是 ReactNode 也不必转成字符串，读屏读的就是用户看到的那段文字。
  const valueId = `${triggerId}-value`;
  const fallbackLabel = ariaLabel ?? placeholder;
  // 无障碍名称分三种情况，目标都是「既说清这是什么，也说清当前值」：
  // 1) 调用方给了外部可见标签：标签 + 当前值；
  // 2) 只给了 ariaLabel：ariaLabel 作名称，当前值退为 aria-describedby 的补充描述；
  // 3) 都没给：已选中时直接引用可见值文本；未选中时用 placeholder 兜底（可见文本同样是 placeholder）。
  const triggerLabelledBy = ariaLabelledby
    ? `${ariaLabelledby} ${valueId}`
    : ariaLabel
      ? undefined
      : selected
        ? valueId
        : undefined;
  const triggerAriaLabel = triggerLabelledBy ? undefined : ariaLabel ?? (selected ? undefined : placeholder);
  const triggerDescribedBy = !ariaLabelledby && ariaLabel && selected ? valueId : undefined;
  // 列表容器自身始终要有个名字（外部标签优先，否则回退 ariaLabel / placeholder）
  const listboxAriaLabel = ariaLabelledby ? undefined : fallbackLabel;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
        setFocusList(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  // 采用「焦点跟随高亮项」而不是 aria-activedescendant：
  // 选项 label 是 ReactNode，直接聚焦选项能让读屏朗读选项自身的可见文本，
  // 不必把 JSX 强转成字符串；同时用 scrollIntoView 保证高亮项可见。
  useEffect(() => {
    if (!open || !focusList || activeIndex < 0) return;
    // 在菜单内部按索引取选项，避免依赖 document 全局查找（同页多个 Select 时也不会串）
    const el = menuRef.current?.querySelectorAll('[role="option"]')[activeIndex] as HTMLElement | undefined;
    if (!el) return;
    el.focus({ preventScroll: true });
    // 部分精简 DOM 环境（测试/嵌入）未实现 scrollIntoView，做存在性判断再调用
    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [open, focusList, activeIndex]);

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

  const openMenu = (startIndex: number, moveFocus: boolean) => {
    // 无选项时不展开空面板（服务商列表为空等场景），避免出现一个无内容的 listbox
    if (disabled || options.length === 0) return;
    setOpen(true);
    setActiveIndex(Math.min(Math.max(startIndex, 0), options.length - 1));
    setFocusList(moveFocus);
  };

  const closeMenu = (returnFocus: boolean) => {
    setOpen(false);
    setActiveIndex(-1);
    setFocusList(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  // 在已展开的列表内移动高亮；焦点随高亮进入列表，键盘用户才能感知当前项
  const moveHighlight = (nextIndex: number) => {
    setActiveIndex(nextIndex);
    setFocusList(true);
  };

  const selectOption = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    closeMenu(true);
  };

  const handleTriggerClick = () => {
    if (open) {
      closeMenu(true);
    } else {
      // 鼠标打开时焦点留在触发按钮，不打断指针用户的操作节奏
      openMenu(selectedIndex >= 0 ? selectedIndex : 0, false);
    }
  };

  const handleTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open) closeMenu(true);
        else openMenu(selectedIndex >= 0 ? selectedIndex : 0, true);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (open) moveHighlight(Math.min(activeIndex + 1, options.length - 1));
        else openMenu(selectedIndex >= 0 ? selectedIndex : 0, true);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (open) moveHighlight(Math.max(activeIndex - 1, 0));
        else openMenu(selectedIndex >= 0 ? selectedIndex : 0, true);
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          closeMenu(true);
        }
        break;
      case 'Tab':
        // 不拦截默认行为：关闭菜单后 Tab 继续走正常的顺序导航
        if (open) closeMenu(false);
        break;
      default:
        break;
    }
  };

  const handleOptionKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveHighlight(Math.min(index + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveHighlight(Math.max(index - 1, 0));
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu(true);
        break;
      case 'Tab':
        // 先把焦点同步交还触发按钮（此时选项即将卸载），再放行默认 Tab，
        // 浏览器就会从触发按钮继续顺序导航，不会把焦点丢到 body
        closeMenu(true);
        break;
      // Enter / Space 显式选中并关闭：不依赖浏览器把按键合成为 click，
      // 键盘与读屏的「激活」路径因此完全一致；preventDefault 同时抑制原生 click，
      // 且菜单在同一批次内卸载，不会出现 onChange 被调用两次
      case 'Enter':
      case ' ':
        e.preventDefault();
        selectOption(index);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        // 列表只在打开时挂载（保留现有进入动画），因此仅打开时指向它，避免引用不存在的 id
        aria-controls={open ? listboxId : undefined}
        aria-label={triggerAriaLabel}
        aria-labelledby={triggerLabelledBy}
        aria-describedby={triggerDescribedBy}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'flex w-full items-center justify-between rounded-md border border-input bg-transparent shadow-sm transition-colors',
          'focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          'hover:bg-accent/50',
          compact ? 'h-7 px-2 py-1 text-xs' : 'h-9 px-3 py-2 text-sm'
        )}
      >
        <span id={valueId} className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.label : placeholder}
        </span>
        {open ? (
          <ChevronUp className={cn('shrink-0 text-muted-foreground', compact ? 'h-3 w-3' : 'h-4 w-4')} />
        ) : (
          <ChevronDown className={cn('shrink-0 text-muted-foreground', compact ? 'h-3 w-3' : 'h-4 w-4')} />
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          className={cn(
            'absolute z-50 w-full rounded-md border border-border bg-popover shadow-lg overflow-hidden',
            placement === 'bottom' ? 'mt-1 top-full' : 'mb-1 bottom-full'
          )}
        >
          {/* listbox 直接包住 option（不插入无语义中间层），否则部分读屏读不出「列表→选项」的从属关系 */}
          <div
            id={listboxId}
            role="listbox"
            aria-label={listboxAriaLabel}
            aria-labelledby={ariaLabelledby}
            className="max-h-60 overflow-auto py-1"
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                id={getOptionId(index)}
                type="button"
                role="option"
                aria-selected={value === option.value}
                aria-label={option.ariaLabel}
                // 漫游 tabindex：只有当前高亮项可被 Tab 命中，其余用方向键移动
                tabIndex={index === activeIndex ? 0 : -1}
                onClick={() => selectOption(index)}
                onKeyDown={(e) => handleOptionKeyDown(e, index)}
                className={cn(
                  'flex w-full items-center justify-between transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  (value === option.value || index === activeIndex) &&
                    'bg-accent text-accent-foreground',
                  compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'
                )}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && (
                  <Check className={cn('shrink-0', compact ? 'ml-1 h-3 w-3' : 'ml-2 h-4 w-4')} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
