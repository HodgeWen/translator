import { useEffect, useState } from 'react';
import type { ColorScheme } from '@/types';

/**
 * 配色决策纯函数：显式 light / dark 优先，system 跟随系统偏好。
 * 抽成纯函数便于单测，也避免 hook 内部把两种来源的判断逻辑写乱。
 */
export function resolveDarkScheme(colorScheme: ColorScheme, systemPrefersDark: boolean): boolean {
  if (colorScheme === 'dark') return true;
  if (colorScheme === 'light') return false;
  return systemPrefersDark;
}

/**
 * 界面暗色模式：由设置项 colorScheme 驱动（system / light / dark）。
 * 同时把结果写入 <html class="dark"> 与 style.colorScheme，
 * 后者让原生控件（滚动条、表单控件）跟随配色，避免暗色下的白色滚动条。
 */
export function useDarkMode(colorScheme: ColorScheme = 'system'): boolean {
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isDark = resolveDarkScheme(colorScheme, systemPrefersDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  return isDark;
}
