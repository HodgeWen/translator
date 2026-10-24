import { describe, expect, test } from 'bun:test';
import { resolveDarkScheme } from '../src/hooks/use-dark-mode';
import type { ColorScheme } from '../src/types';

// 配色决策纯函数：显式偏好必须压过系统偏好，system 才跟随系统。
// 这条逻辑决定设置页与弹窗的明暗，回归时肉眼难以及时发现，用单测锁住。
describe('resolveDarkScheme 配色决策', () => {
  test('显式 dark 无论系统偏好都返回 true', () => {
    expect(resolveDarkScheme('dark', false)).toBe(true);
    expect(resolveDarkScheme('dark', true)).toBe(true);
  });

  test('显式 light 无论系统偏好都返回 false', () => {
    expect(resolveDarkScheme('light', true)).toBe(false);
    expect(resolveDarkScheme('light', false)).toBe(false);
  });

  test('system 跟随系统偏好', () => {
    expect(resolveDarkScheme('system', true)).toBe(true);
    expect(resolveDarkScheme('system', false)).toBe(false);
  });

  test('覆盖全部 ColorScheme 取值，保证分支无遗漏', () => {
    const schemes: ColorScheme[] = ['system', 'light', 'dark'];
    for (const scheme of schemes) {
      for (const prefersDark of [true, false]) {
        expect(typeof resolveDarkScheme(scheme, prefersDark)).toBe('boolean');
      }
    }
    // 三种取值在「系统偏好为暗」时至少产生两种不同结果，说明显式覆盖真的生效
    const results = new Set(schemes.map((s) => resolveDarkScheme(s, true)));
    expect(results.size).toBe(2);
  });
});
