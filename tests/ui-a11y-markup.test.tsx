import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NumberInput } from '@/components/ui/number-input';
import { Badge } from '@/components/ui/badge';
import { Toast } from '@/components/ui/toast';

// t() 在扩展上下文里从 chrome.i18n 取文案。这里注入最小桩，
// 使断言验证的是「组件真的走了 i18n」，而不是硬编码字符串。
const MESSAGES: Record<string, string> = {
  a11y_decrease: '减少',
  a11y_increase: '增加',
  a11y_dismiss_toast: '关闭提示',
};
(globalThis as unknown as { chrome: unknown }).chrome = {
  i18n: { getMessage: (key: string) => MESSAGES[key] ?? '' },
};

// 基础 UI 组件的无障碍语义：用 SSR 静态标记做断言，不依赖任何 DOM 实现
describe('Select 无障碍语义（收起态）', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];

  test('触发按钮声明 listbox 弹出语义且当前收起', () => {
    const html = renderToStaticMarkup(
      <Select value="a" options={options} onChange={() => {}} />
    );

    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
    // 未打开时不挂载列表，避免 aria-controls 指向不存在的 id
    expect(html).not.toContain('aria-controls');
  });

  test('调用方未给标签时用 placeholder 兜底作无障碍名称', () => {
    const html = renderToStaticMarkup(
      <Select value="" options={options} onChange={() => {}} placeholder="选择服务" />
    );

    expect(html).toContain('aria-label="选择服务"');
  });

  test('已选中且无标签时，名称直接引用可见的当前值', () => {
    const html = renderToStaticMarkup(
      <Select value="a" options={options} onChange={() => {}} placeholder="选择服务" />
    );

    expect(html).not.toContain('aria-label=');
    expect(html).toContain('Alpha');
    expect(html).toMatch(/aria-labelledby="select-[^"]+-value"/);
  });

  test('调用方显式给 ariaLabel 时优先使用它，当前值降为描述', () => {
    const html = renderToStaticMarkup(
      <Select value="a" options={options} onChange={() => {}} ariaLabel="翻译语气" />
    );

    expect(html).toContain('aria-label="翻译语气"');
    // 名称被 ariaLabel 占用后，当前选中值改由 aria-describedby 播报，信息不丢失
    expect(html).toContain('aria-describedby="select-');
    expect(html).toContain('-value"');
  });

  test('支持 id 透传与 aria-labelledby 覆盖', () => {
    const html = renderToStaticMarkup(
      <Select
        id="tone-select"
        value="a"
        options={options}
        onChange={() => {}}
        ariaLabelledby="tone-label"
      />
    );

    expect(html).toContain('id="tone-select"');
    // 外部标签 + 当前值一起作为名称：读屏既知道这是什么，也知道当前选了什么
    expect(html).toContain('aria-labelledby="tone-label tone-select-value"');
    // 有外部标签时不再叠加 aria-label，避免读屏重复播报
    expect(html).not.toContain('aria-label=');
  });
});

describe('Button 语义', () => {
  test('默认 type="button"，避免在表单里意外提交', () => {
    const html = renderToStaticMarkup(<Button>确定</Button>);

    expect(html).toContain('type="button"');
  });

  test('调用方显式传 type 时仍可覆盖为 submit', () => {
    const html = renderToStaticMarkup(<Button type="submit">提交</Button>);

    expect(html).toContain('type="submit"');
  });

  test('disabled 交给原生属性表达，不重复叠加 aria-disabled', () => {
    const html = renderToStaticMarkup(<Button disabled>禁用</Button>);

    expect(html).toContain('disabled');
    expect(html).not.toContain('aria-disabled');
  });
});

describe('Textarea 属性透传', () => {
  test('id 与 aria-* 落到 textarea 元素上，供外部 label htmlFor 关联', () => {
    const html = renderToStaticMarkup(
      <Textarea id="prompt-input" aria-describedby="prompt-hint" aria-label="提示词" />
    );

    expect(html).toContain('id="prompt-input"');
    expect(html).toContain('aria-describedby="prompt-hint"');
    expect(html).toContain('aria-label="提示词"');
  });
});

describe('NumberInput 无障碍语义', () => {
  test('输入框暴露 spinbutton 语义与取值范围', () => {
    const html = renderToStaticMarkup(
      <NumberInput value={3} min={1} max={10} ariaLabel="最大并发" />
    );

    expect(html).toContain('role="spinbutton"');
    // SSR 保留 React 的驼峰属性名，浏览器解析 HTML 时大小写不敏感，统一按小写比对
    expect(html.toLowerCase()).toContain('inputmode="numeric"');
    expect(html).toContain('aria-valuemin="1"');
    expect(html).toContain('aria-valuemax="10"');
    expect(html).toContain('aria-valuenow="3"');
    expect(html).toContain('aria-label="最大并发"');
  });

  test('加减按钮经 i18n 取无障碍名称且不提交表单', () => {
    const html = renderToStaticMarkup(<NumberInput value={3} min={1} max={10} />);

    expect(html).toContain('aria-label="减少"');
    expect(html).toContain('aria-label="增加"');
    expect(html.match(/type="button"/g)).toHaveLength(2);
  });

  test('支持 id 透传供 htmlFor 使用', () => {
    const html = renderToStaticMarkup(<NumberInput id="max-tokens" value={100} />);

    expect(html).toContain('id="max-tokens"');
  });

  test('空值时不声明 spinbutton，避免缺少 aria-valuenow 的非法组合', () => {
    const html = renderToStaticMarkup(<NumberInput allowEmpty value={undefined} />);

    expect(html).not.toContain('role="spinbutton"');
    expect(html).not.toContain('aria-valuenow');
  });
});

describe('Badge 保持纯展示', () => {
  test('不自行声明 role，避免读屏把装饰标签当控件', () => {
    const html = renderToStaticMarkup(<Badge>内置</Badge>);

    expect(html).not.toContain('role=');
    expect(html).toContain('内置');
  });
});

describe('Toast 朗读语义', () => {
  test('成功提示用 status + polite', () => {
    const html = renderToStaticMarkup(
      <Toast toast={{ id: '1', message: '已保存', type: 'success' }} onDismiss={() => {}} />
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
  });

  test('错误提示用 alert + assertive', () => {
    const html = renderToStaticMarkup(
      <Toast toast={{ id: '2', message: '保存失败', type: 'error' }} onDismiss={() => {}} />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('aria-atomic="true"');
  });

  test('关闭按钮经 i18n 取无障碍名称且不提交表单', () => {
    const html = renderToStaticMarkup(
      <Toast toast={{ id: '3', message: '已复制', type: 'success' }} onDismiss={() => {}} />
    );

    expect(html).toContain('aria-label="关闭提示"');
    expect(html).toContain('type="button"');
  });

  test('无提示时仍保留常驻 live region（否则读屏器不播报后续消息）', () => {
    // 回归：旧实现 `if (!toast) return null` 让 live region 与消息同批挂载，
    // NVDA/VoiceOver 通常不播报「新出现 region 里已存在的文本」→ 无障碍失效。
    const html = renderToStaticMarkup(<Toast toast={null} onDismiss={() => {}} />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    // 无消息时不应渲染卡片内容
    expect(html).not.toContain('bg-emerald-500');
    expect(html).not.toContain('bg-destructive');
  });
});
