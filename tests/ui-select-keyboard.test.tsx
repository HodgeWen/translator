import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';

// Select 的键盘交互需要真实 DOM 挂载：这里借用 wxt 自带的 linkedom（不新增依赖），
// 仅在本文件内临时接管全局 window/document，结束后恢复，避免影响其它测试文件。
type AnyRecord = Record<string, unknown>;
const globals = globalThis as unknown as AnyRecord;
const DOM_KEYS = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'IS_REACT_ACT_ENVIRONMENT',
] as const;
const saved = new Map<string, unknown>();

let windowRef: any;
let container: HTMLElement;
let root: any;
let act: any;
let React: any;
let SelectComponent: any;

function keyEvent(key: string) {
  const e = new windowRef.Event('keydown', { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'key', { value: key });
  return e;
}

const options = () => [...container.querySelectorAll('[role=option]')] as any[];
const trigger = () => container.querySelector('button') as any;
const tabIndexes = () => options().map((o) => o.getAttribute('tabindex'));

// beforeEach 已重建 root，这里只负责渲染：用例之间的 open/activeIndex 状态互不影响
async function mount(changes: string[], props: AnyRecord = {}) {
  await act(async () => {
    root.render(
      React.createElement(SelectComponent, {
        value: 'a',
        options: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
          { value: 'c', label: 'Gamma' },
        ],
        onChange: (v: string) => changes.push(v),
        placeholder: '选择语言',
        ...props,
      })
    );
  });
}

describe('Select 键盘导航', () => {
  beforeAll(async () => {
    for (const key of DOM_KEYS) saved.set(key, globals[key]);

    const { window } = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>');
    windowRef = window;
    Object.assign(globals, {
      window,
      document: window.document,
      navigator: window.navigator,
      HTMLElement: window.HTMLElement,
      Element: window.Element,
      Node: window.Node,
      Event: window.Event,
      IS_REACT_ACT_ENVIRONMENT: true,
    });

    React = await import('react');
    act = React.act;
    SelectComponent = (await import('@/components/ui/select')).Select;
    container = window.document.getElementById('root') as HTMLElement;
    root = (await import('react-dom/client')).createRoot(container);
  });

  beforeEach(async () => {
    // 清掉上一个用例遗留的节点，保证 querySelector 拿到的是当前用例的 DOM
    await act(async () => {
      root.unmount();
    });
    root = (await import('react-dom/client')).createRoot(container);
  });

  afterAll(async () => {
    await act(async () => {
      root.unmount();
    });
    for (const key of DOM_KEYS) {
      if (saved.get(key) === undefined) delete globals[key];
      else globals[key] = saved.get(key);
    }
  });

  test('ArrowDown 打开菜单并把高亮落在当前选中项', async () => {
    const changes: string[] = [];
    await mount(changes);

    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    await act(async () => {
      trigger().dispatchEvent(keyEvent('ArrowDown'));
    });

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('[role=listbox]')).not.toBeNull();
    // 触发按钮 aria-controls 指向已挂载的 listbox
    expect(trigger().getAttribute('aria-controls')).toBe(
      container.querySelector('[role=listbox]')?.getAttribute('id')
    );
    // 只有高亮项可被 Tab 命中（漫游 tabindex）
    expect(tabIndexes()).toEqual(['0', '-1', '-1']);
    expect(options().map((o) => o.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
  });

  test('方向键移动高亮，Enter 选中并关闭', async () => {
    const changes: string[] = [];
    await mount(changes);

    await act(async () => {
      trigger().dispatchEvent(keyEvent('ArrowDown'));
    });
    await act(async () => {
      options()[0].dispatchEvent(keyEvent('ArrowDown'));
    });
    expect(tabIndexes()).toEqual(['-1', '0', '-1']);

    await act(async () => {
      options()[1].dispatchEvent(keyEvent('Enter'));
    });

    expect(changes).toEqual(['b']);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('[role=listbox]')).toBeNull();
  });

  test('高亮在两端收敛，不会越界', async () => {
    await mount([]);

    // 已有选中项时，ArrowUp 与 ArrowDown 都从选中项开始，不会跳过当前值
    await act(async () => {
      trigger().dispatchEvent(keyEvent('ArrowUp'));
    });
    expect(tabIndexes()).toEqual(['0', '-1', '-1']);

    // 首项再按 ArrowUp 保持不动
    await act(async () => {
      options()[0].dispatchEvent(keyEvent('ArrowUp'));
    });
    expect(tabIndexes()).toEqual(['0', '-1', '-1']);

    await act(async () => {
      options()[0].dispatchEvent(keyEvent('ArrowDown'));
    });
    await act(async () => {
      options()[1].dispatchEvent(keyEvent('ArrowDown'));
    });
    await act(async () => {
      options()[2].dispatchEvent(keyEvent('ArrowDown'));
    });
    // 末项再按 ArrowDown 保持不动
    expect(tabIndexes()).toEqual(['-1', '-1', '0']);
  });

  test('Escape 关闭菜单且不触发 onChange', async () => {
    const changes: string[] = [];
    await mount(changes);

    await act(async () => {
      trigger().dispatchEvent(keyEvent(' '));
    });
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    await act(async () => {
      options()[0].dispatchEvent(keyEvent('Escape'));
    });

    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(changes).toEqual([]);
  });

  test('Tab 关闭菜单并放行默认焦点移动', async () => {
    await mount([]);

    await act(async () => {
      trigger().dispatchEvent(keyEvent('ArrowDown'));
    });
    await act(async () => {
      options()[0].dispatchEvent(keyEvent('Tab'));
    });

    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  test('触发按钮带 id 时选项 id 由它派生，供外部 label htmlFor 关联', async () => {
    const changes: string[] = [];
    await mount(changes, { id: 'tone-select' });

    expect(trigger().getAttribute('id')).toBe('tone-select');

    await act(async () => {
      trigger().dispatchEvent(keyEvent('ArrowDown'));
    });

    expect(options()[0].getAttribute('id')).toBe('tone-select-option-0');
    expect(container.querySelector('[role=listbox]')?.getAttribute('id')).toBe('tone-select-listbox');
  });
});
