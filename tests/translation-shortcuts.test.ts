import { describe, expect, test } from 'bun:test';
import {
  eventMatchesSingleKeyShortcut,
  getHoverShortcutOptions,
  getPlatformShortcutOptions,
  normalizeShortcutKey,
  recordSequentialShortcutPress,
} from '../src/entrypoints/content/shortcut-utils';
import {
  getInputLoadingEasingValue,
  isValidHexColor,
  setInputTranslationLoading,
  resolveInputTargetLanguage,
} from '../src/entrypoints/content/input-translate-utils';
import { commitInputLoadingKeyframe } from '../src/components/options/display-settings';
import { globalSettingsSchema } from '../src/lib/schema';
import { DEFAULT_SETTINGS } from '../src/lib/storage';

function keyEvent(
  key: string,
  modifiers: Partial<Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>> = {}
): KeyboardEvent {
  return {
    key,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...modifiers,
  } as KeyboardEvent;
}

describe('single-key shortcut matching', () => {
  test('normalizes space aliases to KeyboardEvent.key space', () => {
    expect(normalizeShortcutKey('Space')).toBe(' ');
    expect(normalizeShortcutKey('space')).toBe(' ');
    expect(normalizeShortcutKey(' ')).toBe(' ');
  });

  test('matches a plain single key without unrelated modifiers', () => {
    expect(eventMatchesSingleKeyShortcut(keyEvent(' ', { ctrlKey: true }), 'Space')).toBe(false);
    expect(eventMatchesSingleKeyShortcut(keyEvent(' '), 'Space')).toBe(true);
  });

  test('matches modifier keys as standalone keys', () => {
    expect(eventMatchesSingleKeyShortcut(keyEvent('Control', { ctrlKey: true }), 'Control')).toBe(true);
    expect(eventMatchesSingleKeyShortcut(keyEvent('Alt', { altKey: true }), 'Alt')).toBe(true);
    expect(eventMatchesSingleKeyShortcut(keyEvent('Meta', { metaKey: true }), 'Meta')).toBe(true);
  });

  test('resets sequential press count when the interval is exceeded', () => {
    let sequence = recordSequentialShortcutPress({ count: 0, lastPressedAt: 0 }, 1000, 450);
    expect(sequence.count).toBe(1);
    sequence = recordSequentialShortcutPress(sequence, 1300, 450);
    expect(sequence.count).toBe(2);
    sequence = recordSequentialShortcutPress(sequence, 1900, 450);
    expect(sequence.count).toBe(1);
  });

  test('uses operating-system-specific shortcut labels', () => {
    const macOptions = getPlatformShortcutOptions(true);
    expect(macOptions.some((option) => option.labelKey === 'shortcut_key_alt')).toBe(false);
    expect(macOptions.some((option) => option.labelKey === 'shortcut_key_win')).toBe(false);
    expect(macOptions.some((option) => option.labelKey === 'shortcut_key_option')).toBe(true);
    expect(macOptions.some((option) => option.labelKey === 'shortcut_key_command')).toBe(true);

    const windowsOptions = getPlatformShortcutOptions(false);
    expect(windowsOptions.some((option) => option.labelKey === 'shortcut_key_command')).toBe(false);
    expect(windowsOptions.some((option) => option.labelKey === 'shortcut_key_option')).toBe(false);
    expect(windowsOptions.some((option) => option.labelKey === 'shortcut_key_alt')).toBe(true);
    expect(windowsOptions.some((option) => option.labelKey === 'shortcut_key_win')).toBe(true);
  });

  test('limits hover translation shortcuts to modifier keys', () => {
    const options = getHoverShortcutOptions(true);
    expect(options.map((option) => option.value)).toEqual(['Control', 'Alt', 'Shift', 'Meta']);
    expect(options.some((option) => option.value === 'Space')).toBe(false);
    expect(options.some((option) => option.value === 'Escape')).toBe(false);
  });
});

describe('display settings helpers', () => {
  test('commits the passed keyframe value instead of relying on previous draft state', () => {
    expect(commitInputLoadingKeyframe(['#111111', '#222222', '#333333'], 1, '#abcdef')).toEqual([
      '#111111',
      '#abcdef',
      '#333333',
    ]);
  });
});

describe('settings validation', () => {
  test('normalizes persisted non-modifier hover shortcuts back to Control', () => {
    const parsed = globalSettingsSchema.parse({ ...DEFAULT_SETTINGS, hoverShortcutKey: 'Space' });
    expect(parsed.hoverShortcutKey).toBe('Control');
  });
});

describe('input translation direction', () => {
  test('native input translates to the input-specific source language first', () => {
    expect(resolveInputTargetLanguage({
      detectedLang: 'zh-CN',
      nativeLanguage: 'zh-CN',
      defaultSourceLanguage: 'en',
      inputDefaultSourceLanguage: 'ja',
    })).toBe('ja');
  });

  test('native input falls back to global default source language', () => {
    expect(resolveInputTargetLanguage({
      detectedLang: 'zh-CN',
      nativeLanguage: 'zh-CN',
      defaultSourceLanguage: 'en',
    })).toBe('en');
  });

  test('non-native or unknown input translates to native language', () => {
    expect(resolveInputTargetLanguage({
      detectedLang: 'en',
      nativeLanguage: 'zh-CN',
      defaultSourceLanguage: 'en',
      inputDefaultSourceLanguage: 'ja',
    })).toBe('zh-CN');
    expect(resolveInputTargetLanguage({
      detectedLang: null,
      nativeLanguage: 'zh-CN',
      defaultSourceLanguage: 'en',
      inputDefaultSourceLanguage: 'ja',
    })).toBe('zh-CN');
  });
});

describe('input loading state', () => {
  test('sets loading attribute and configurable animation variables', () => {
    const el = { dataset: {} } as HTMLTextAreaElement;
    const styles = new Map<string, string>();
    el.style = {
      setProperty: (name: string, value: string) => { styles.set(name, value); },
      removeProperty: (name: string) => { styles.delete(name); },
    } as CSSStyleDeclaration;

    setInputTranslationLoading(el, true, {
      keyframes: ['#111827', '#0ea5e9', '#1d4ed8'],
      durationMs: 900,
      easing: 'spring',
    });

    expect(el.dataset.translatorInputLoading).toBe('true');
    expect(styles.get('--translator-input-loading-color-0')).toBe('#111827');
    expect(styles.get('--translator-input-loading-color-50')).toBe('#0ea5e9');
    expect(styles.get('--translator-input-loading-color-100')).toBe('#1d4ed8');
    expect(styles.get('--translator-input-loading-duration')).toBe('900ms');
    expect(styles.get('--translator-input-loading-easing')).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');

    setInputTranslationLoading(el, false);
    expect(el.dataset.translatorInputLoading).toBeUndefined();
    expect(styles.has('--translator-input-loading-color-0')).toBe(false);
    expect(styles.has('--translator-input-loading-color-50')).toBe(false);
    expect(styles.has('--translator-input-loading-color-100')).toBe(false);
    expect(styles.has('--translator-input-loading-duration')).toBe(false);
    expect(styles.has('--translator-input-loading-easing')).toBe(false);
  });

  test('validates manual color input as hex only', () => {
    expect(isValidHexColor('#38bdf8')).toBe(true);
    expect(isValidHexColor('#38bdf880')).toBe(true);
    expect(isValidHexColor('#0af')).toBe(true);
    expect(isValidHexColor('#0af8')).toBe(true);
    expect(isValidHexColor('38bdf8')).toBe(false);
    expect(isValidHexColor('rgb(56,189,248)')).toBe(false);
  });

  test('maps animation presets to timing functions', () => {
    expect(getInputLoadingEasingValue('linear')).toBe('linear');
    expect(getInputLoadingEasingValue('ease-out')).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    expect(getInputLoadingEasingValue('spring')).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');
  });
});
