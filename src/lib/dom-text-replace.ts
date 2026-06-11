export interface TextNodeSegment {
  id: number | null;
  node: Text;
  sourceText: string;
  leadingWhitespace: string;
  trailingWhitespace: string;
}

export interface TextNodeTemplate {
  wrapper: HTMLElement;
  segments: TextNodeSegment[];
}

const EXCLUDED_TEXT_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME',
  'TEXTAREA', 'INPUT', 'BUTTON', 'SELECT', 'OPTION',
  'SVG', 'CANVAS', 'VIDEO', 'AUDIO',
  'PRE', 'CODE', 'KBD', 'SAMP', 'VAR',
  'TIME',
]);

const EXCLUDED_ROLES = new Set([
  'button', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
  'toolbar', 'tablist', 'tab', 'navigation',
  'switch', 'slider', 'spinbutton',
  'listbox', 'option', 'combobox',
  'alertdialog', 'dialog',
  'tooltip', 'status', 'timer', 'progressbar',
]);

const TRANSLATOR_RUNTIME_ATTRS = [
  'data-translator-pending',
  'data-translator-theme',
  'data-translator-error',
  'data-translator-processed',
  'data-translator-clone',
];

function splitWhitespace(text: string): { leading: string; core: string; trailing: string } {
  const leading = text.match(/^\s*/)?.[0] ?? '';
  const trailing = text.match(/\s*$/)?.[0] ?? '';
  return {
    leading,
    core: text.slice(leading.length, text.length - trailing.length),
    trailing,
  };
}

function shouldSkipAncestor(el: Element): boolean {
  if (EXCLUDED_TEXT_TAGS.has(el.tagName)) return true;
  if (el.getAttribute('translate') === 'no') return true;
  if (el.classList.contains('notranslate')) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  if (el.getAttribute('contenteditable') === 'true') return true;
  for (const attr of TRANSLATOR_RUNTIME_ATTRS) {
    if (el.hasAttribute(attr)) return true;
  }

  const role = el.getAttribute('role');
  return role !== null && role.toLowerCase().split(/\s+/).some(token => EXCLUDED_ROLES.has(token));
}

function shouldTranslateTextNode(node: Text, root: HTMLElement): boolean {
  const raw = node.textContent ?? '';
  const { core } = splitWhitespace(raw);
  if (!core || !/[\p{L}\p{N}]/u.test(core)) return false;

  let cur: Element | null = node.parentElement;
  while (cur) {
    if (shouldSkipAncestor(cur)) return false;
    if (cur === root) break;
    cur = cur.parentElement;
  }
  return true;
}

function cleanupRuntimeAttrs(wrapper: HTMLElement): void {
  const all = [wrapper, ...Array.from(wrapper.querySelectorAll<HTMLElement>('*'))];
  for (const el of all) {
    for (const attr of TRANSLATOR_RUNTIME_ATTRS) {
      el.removeAttribute(attr);
    }
  }
}

export function createTextNodeTemplate(el: HTMLElement): TextNodeTemplate | null {
  const wrapper = el.cloneNode(true) as HTMLElement;
  cleanupRuntimeAttrs(wrapper);

  const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
  const segments: TextNodeSegment[] = [];

  let node = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    if (shouldTranslateTextNode(textNode, wrapper)) {
      const { leading, core, trailing } = splitWhitespace(textNode.textContent ?? '');
      segments.push({
        id: null,
        node: textNode,
        sourceText: core,
        leadingWhitespace: leading,
        trailingWhitespace: trailing,
      });
    }
    node = walker.nextNode();
  }

  if (segments.length === 0) return null;
  return { wrapper, segments };
}

export function assignTextNodeIds(template: TextNodeTemplate, startId: number): Array<{ id: number; text: string }> {
  return template.segments.map((segment, index) => {
    const id = startId + index;
    segment.id = id;
    return { id, text: segment.sourceText };
  });
}

export function applyTextNodeTranslations(template: TextNodeTemplate, translations: Map<number, string>): number {
  let applied = 0;
  for (const segment of template.segments) {
    if (segment.id === null) continue;
    const translated = translations.get(segment.id);
    if (!translated) continue;
    segment.node.textContent = `${segment.leadingWhitespace}${translated.trim()}${segment.trailingWhitespace}`;
    applied++;
  }
  return applied;
}

export function getTextNodeTemplateText(template: TextNodeTemplate): string {
  return template.wrapper.textContent?.trim() ?? '';
}
