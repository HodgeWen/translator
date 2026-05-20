export interface SiteRule {
  id: string;
  matches: (url: URL) => boolean;
  // 排除这些选择器匹配的元素及其后代
  excludeSelectors?: string[];
  // 自定义排除逻辑
  shouldExclude?: (el: HTMLElement) => boolean;
}

import { githubRule } from './github';

export const siteRules: SiteRule[] = [
  githubRule,
];

// 根据 URL 匹配活跃的网站规则
export function getActiveRules(urlStr: string): SiteRule[] {
  try {
    const url = new URL(urlStr);
    return siteRules.filter(rule => rule.matches(url));
  } catch {
    return [];
  }
}
