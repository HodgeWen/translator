// Shadow DOM 样式注入：把 content 样式文本注入 open shadow root。
//
// 从 observer.ts 拆出（原文件 580 行、混着 IO / MO / 路由检测 / GC 五类职责）。
// 本模块只负责「样式怎么进 shadow root」这一件事，不持有任何观察状态。
//
// document 级样式表（manifest 注入的 content_scripts.css）不会穿透 shadow root：
// collectBlocks 能穿进 open shadow root 找到段落，但 `[data-translator-pending]`
// `[data-translator-bilingual]` `[data-translator-underline]` 等规则在 shadow root
// 内不生效（Reddit 等 Web Components 内的翻译没有加载态、没有双语样式）。
// 因此注册 shadow root 观察时同步注入同一份规则文本。
//
// `?inline` 让构建器把 styles.css 的**文本**内联进 content script bundle
// （WXT/vite 均支持；产物里是一段 JS 字符串，不额外发请求）。
// 代价是 CSS 在产物里出现两次（一次作为 content-scripts/*.css 文件、
// 一次作为内联字符串）—— 换来的是不依赖运行时 fetch、不受
// web_accessible_resources 配置影响，离线与 MV3 CSP 下都能工作。
import contentCssText from './styles.css?inline';

/** 注入标记：幂等判据（同一 shadow root 只注入一次） */
const SHADOW_STYLE_ATTR = 'data-translator-shadow-style';

/**
 * 取 content 样式文本。
 * 首选构建期内联的 `styles.css?inline`；若构建器没有把它内联成字符串
 * （例如测试环境 / 未来的打包配置变化），退而扫描 `document.styleSheets`
 * 找到包含本扩展规则的那张表并拼出规则文本。
 */
function getContentCssText(): string {
  if (typeof contentCssText === 'string' && contentCssText.length > 0) {
    return contentCssText;
  }
  if (typeof document === 'undefined' || !document.styleSheets) return '';
  try {
    const parts: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | undefined;
      try {
        rules = sheet.cssRules;
      } catch {
        // 跨域样式表读取 cssRules 会抛 SecurityError，跳过
        continue;
      }
      if (!rules) continue;
      const texts = Array.from(rules, rule => rule.cssText);
      // 只认本扩展的样式表：以注入标记属性作为指纹
      if (!texts.some(text => text.includes('[data-translator-bilingual]'))) continue;
      parts.push(...texts);
    }
    return parts.join('\n');
  } catch {
    return '';
  }
}

/**
 * 把 content 样式注入指定 shadow root。幂等：已注入过则直接返回。
 * 不额外持有 shadow root 的强引用 —— 生命周期完全跟随 host：
 * observer.ts 里 `observedShadowRoots` 的离树条目由 cleanupDisconnectedEntries
 * 清除，注入的 <style> 随 shadow root 一起被 GC。
 *
 * @param cssText 显式样式文本（仅单测注入用）；省略时按 getContentCssText() 取。
 * @returns 是否真正写入了 <style>（幂等命中 / 无样式文本时返回 false）
 */
export function injectStylesIntoShadowRoot(shadow: ShadowRoot, cssText?: string): boolean {
  if (shadow.querySelector(`style[${SHADOW_STYLE_ATTR}]`)) return false;
  const text = cssText ?? getContentCssText();
  if (!text) return false;
  const style = document.createElement('style');
  style.setAttribute(SHADOW_STYLE_ATTR, 'true');
  style.textContent = text;
  shadow.appendChild(style);
  return true;
}
