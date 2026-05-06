const SPACE_ALIASES = new Set(['space', 'spacebar']);

const KEY_ALIASES: Record<string, string> = {
  ctrl: 'Control',
  control: 'Control',
  option: 'Alt',
  alt: 'Alt',
  cmd: 'Meta',
  command: 'Meta',
  meta: 'Meta',
  esc: 'Escape',
  escape: 'Escape',
  shift: 'Shift',
};

const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Meta', 'Shift']);

export interface ShortcutOption {
  value: string;
  labelKey: string;
}

export interface ShortcutSequenceState {
  count: number;
  lastPressedAt: number;
}

export function normalizeShortcutKey(raw: string): string {
  if (raw === ' ') return ' ';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (SPACE_ALIASES.has(lower)) return ' ';
  if (KEY_ALIASES[lower]) return KEY_ALIASES[lower];
  return trimmed.length === 1 ? trimmed : trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function hasUnrelatedModifier(event: KeyboardEvent, shortcutKey: string): boolean {
  if (shortcutKey === 'Control') return event.altKey || event.metaKey || event.shiftKey;
  if (shortcutKey === 'Alt') return event.ctrlKey || event.metaKey || event.shiftKey;
  if (shortcutKey === 'Meta') return event.ctrlKey || event.altKey || event.shiftKey;
  if (shortcutKey === 'Shift') return event.ctrlKey || event.altKey || event.metaKey;
  return event.ctrlKey || event.altKey || event.metaKey || event.shiftKey;
}

export function eventMatchesSingleKeyShortcut(event: KeyboardEvent, shortcutKey: string): boolean {
  const normalized = normalizeShortcutKey(shortcutKey);
  if (!normalized) return false;
  if (normalizeShortcutKey(event.key) !== normalized) return false;
  return !hasUnrelatedModifier(event, normalized);
}

export function isShortcutKeyEvent(event: KeyboardEvent, shortcutKey: string): boolean {
  const normalized = normalizeShortcutKey(shortcutKey);
  return !!normalized && normalizeShortcutKey(event.key) === normalized;
}

export function mouseEventHasModifierShortcut(event: MouseEvent, shortcutKey: string): boolean {
  const normalized = normalizeShortcutKey(shortcutKey);
  if (!MODIFIER_KEYS.has(normalized)) return false;
  if (normalized === 'Control') return event.ctrlKey;
  if (normalized === 'Alt') return event.altKey;
  if (normalized === 'Meta') return event.metaKey;
  return event.shiftKey;
}

export function recordSequentialShortcutPress(
  state: ShortcutSequenceState,
  pressedAt: number,
  maxIntervalMs: number
): ShortcutSequenceState {
  const withinWindow = state.lastPressedAt > 0 && pressedAt - state.lastPressedAt <= maxIntervalMs;
  return {
    count: withinWindow ? state.count + 1 : 1,
    lastPressedAt: pressedAt,
  };
}

export function getPlatformShortcutOptions(isMac: boolean): ShortcutOption[] {
  return [
    { value: 'Control', labelKey: 'shortcut_key_control' },
    { value: 'Alt', labelKey: isMac ? 'shortcut_key_option' : 'shortcut_key_alt' },
    { value: 'Shift', labelKey: 'shortcut_key_shift' },
    { value: 'Meta', labelKey: isMac ? 'shortcut_key_command' : 'shortcut_key_win' },
    { value: 'Space', labelKey: 'shortcut_key_space' },
    { value: 'Escape', labelKey: 'shortcut_key_escape' },
  ];
}

export function getHoverShortcutOptions(isMac: boolean): ShortcutOption[] {
  return getPlatformShortcutOptions(isMac).filter((option) => MODIFIER_KEYS.has(option.value));
}

/** 输入框翻译快捷键：仅允许不会插入字符的按键（modifier + Escape） */
export function getInputShortcutOptions(isMac: boolean): ShortcutOption[] {
  const NON_CHAR_KEYS = new Set([...MODIFIER_KEYS, 'Escape']);
  return getPlatformShortcutOptions(isMac).filter((option) => NON_CHAR_KEYS.has(option.value));
}

