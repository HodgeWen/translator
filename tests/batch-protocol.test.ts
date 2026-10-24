import { describe, expect, test } from 'bun:test';
import { decodeBatch, encodeBatch, parseEncodedBatch } from '../src/lib/batch-protocol';

describe('decodeBatch 正常格式', () => {
  test('标记独占一行时按顺序解析出各段', () => {
    const raw = '<<<1>>>\n第一段\n<<<2>>>\n第二段';
    const { translations, missing } = decodeBatch(raw, 2);

    expect(translations.get(1)).toBe('第一段');
    expect(translations.get(2)).toBe('第二段');
    expect(missing).toEqual([]);
  });

  test('标记行允许前导空格 / Tab（模型缩进输出）', () => {
    const raw = '  <<<1>>>\n第一段\n\t<<<2>>>\n第二段';
    const { translations, missing } = decodeBatch(raw, 2);

    expect(translations.get(1)).toBe('第一段');
    expect(translations.get(2)).toBe('第二段');
    expect(missing).toEqual([]);
  });
});

describe('decodeBatch 标记与译文同行', () => {
  test('<<<N>>> 后直接跟译文不再导致整批解析为空', () => {
    // 旧实现要求标记独占一行，此输入会得到空 Map，调用方误判协议失败并回落逐段翻译
    const raw = '<<<1>>>你好\n<<<2>>>世界';
    const { translations, missing } = decodeBatch(raw, 2);

    expect(translations.size).toBe(2);
    expect(translations.get(1)).toBe('你好');
    expect(translations.get(2)).toBe('世界');
    expect(missing).toEqual([]);
  });

  test('同行与独占一行混用时都能解析', () => {
    const raw = '<<<1>>>你好\n<<<2>>>\n世界\n<<<3>>>再见';
    const { translations } = decodeBatch(raw, 3);

    expect(translations.get(1)).toBe('你好');
    expect(translations.get(2)).toBe('世界');
    expect(translations.get(3)).toBe('再见');
  });
});

describe('decodeBatch 换行兼容', () => {
  test('CRLF 换行不残留 \\r', () => {
    const raw = '<<<1>>>\r\n第一段\r\n<<<2>>>\r\n第二段\r\n';
    const { translations, missing } = decodeBatch(raw, 2);

    expect(translations.get(1)).toBe('第一段');
    expect(translations.get(2)).toBe('第二段');
    expect(missing).toEqual([]);
  });

  test('行尾空白被裁剪', () => {
    const raw = '<<<1>>>   \n第一段   \n<<<2>>>   \n第二段\t\n';
    const { translations } = decodeBatch(raw, 2);

    expect(translations.get(1)).toBe('第一段');
    expect(translations.get(2)).toBe('第二段');
  });
});

describe('decodeBatch 同 id 重复', () => {
  test('first-wins：保留第一个译文而不是被后者覆盖', () => {
    // 旧实现 last-wins，此处会只剩 B，前一段译文丢失
    const { translations } = decodeBatch('<<<1>>>\nA\n<<<1>>>\nB', 1);

    expect(translations.get(1)).toBe('A');
  });

  test('首个为空时用后续非空值补位', () => {
    const { translations, missing } = decodeBatch('<<<1>>>\n\n<<<1>>>\nB', 1);

    expect(translations.get(1)).toBe('B');
    expect(missing).toEqual([]);
  });

  test('重复标记之间的内容不会串到其他段', () => {
    const raw = '<<<1>>>\nA\n<<<2>>>\nB\n<<<1>>>\nA2';
    const { translations } = decodeBatch(raw, 2);

    expect(translations.get(1)).toBe('A');
    expect(translations.get(2)).toBe('B');
  });

  test('重复 id 会把结果标记为不可信，让调用方回落而不是写错位译文', () => {
    // 复现真实歧义：段 1 正文里有一行以 <<<2>>> 开头（代码示例 / 协议文档），
    // 无法从文本区分它是伪标记还是模型串段。此时绝不能把「代码示例」当成
    // 段 2 的译文写进 DOM —— suspicious 让调用方整批回落逐段翻译。
    const raw = '<<<1>>>\n正文第一段\n<<<2>>>\n这是第一段里的代码示例\n<<<2>>>\n真正的第二段';
    const { translations, missing, suspicious } = decodeBatch(raw, 2);

    expect(suspicious).toBe(true);
    expect(missing).toEqual([]);
    // 解析结果本身仍可能是错配的，这正是必须回落的原因
    expect(translations.get(1)).toBe('正文第一段');
  });

  test('模型重复输出同一 id 也标记不可信', () => {
    expect(decodeBatch('<<<1>>>\nA\n<<<1>>>\nB', 1).suspicious).toBe(true);
  });
});

describe('decodeBatch suspicious 标记', () => {
  test('正常协议不标记可疑', () => {
    expect(decodeBatch('<<<1>>>\n第一段\n<<<2>>>\n第二段', 2).suspicious).toBe(false);
    expect(decodeBatch('<<<1>>>第一段\n<<<2>>>第二段', 2).suspicious).toBe(false);
  });

  test('id 乱序标记可疑（正文伪标记的典型症状）', () => {
    expect(decodeBatch('<<<2>>>\n第二段\n<<<1>>>\n第一段', 2).suspicious).toBe(true);
  });

  test('空输入不标记可疑', () => {
    expect(decodeBatch('', 2).suspicious).toBe(false);
  });
});

describe('decodeBatch 越界 id', () => {
  test('越界标记被过滤，不进入 translations', () => {
    const { translations, missing } = decodeBatch('<<<0>>>\n零\n<<<1>>>\nA\n<<<99>>>\n九十九', 1);

    expect(translations.size).toBe(1);
    expect(translations.get(1)).toBe('A');
    expect(translations.has(0)).toBe(false);
    expect(translations.has(99)).toBe(false);
    expect(missing).toEqual([]);
  });

  test('越界标记作为分隔符：其正文被丢弃且不并进相邻段', () => {
    const raw = '<<<1>>>\nA\n<<<3>>>\n越界正文\n<<<2>>>\nB';
    const { translations, missing } = decodeBatch(raw, 2);

    // 关键：id=1 的段只到越界标记为止，越界正文不会污染 A
    expect(translations.get(1)).toBe('A');
    expect(translations.get(2)).toBe('B');
    expect(missing).toEqual([]);
  });

  test('越界标记出现在开头时同样被丢弃', () => {
    const raw = '<<<7>>>\n噪声\n<<<1>>>\nA';
    const { translations } = decodeBatch(raw, 1);

    expect(translations.size).toBe(1);
    expect(translations.get(1)).toBe('A');
  });
});

describe('decodeBatch 空译文', () => {
  test('空译文进 missing，不进 translations', () => {
    // 空串一旦写入 Map，调用方会当真值判断成功并写回 DOM，把段落清空
    const raw = '<<<1>>>\n\n<<<2>>>\nB';
    const { translations, missing } = decodeBatch(raw, 2);

    expect(translations.has(1)).toBe(false);
    expect(translations.get(2)).toBe('B');
    expect(missing).toEqual([1]);
  });

  test('只有标记没有正文（下一行立刻是下一个标记）也算空译文', () => {
    const { translations, missing } = decodeBatch('<<<1>>>\n<<<2>>>\nB', 2);

    expect(translations.has(1)).toBe(false);
    expect(missing).toEqual([1]);
  });
});

describe('decodeBatch 非法标记按普通文本', () => {
  test('<<<abc>>> 保留在所属段落正文中', () => {
    const raw = '<<<1>>>你好 <<<abc>>> 世界';
    const { translations, missing } = decodeBatch(raw, 1);

    expect(translations.get(1)).toBe('你好 <<<abc>>> 世界');
    expect(missing).toEqual([]);
  });

  test('缺少右尖括号的 <<<1>> 也按普通文本保留', () => {
    const raw = '<<<1>>>\nA <<<1>> B';
    const { translations } = decodeBatch(raw, 1);

    expect(translations.get(1)).toBe('A <<<1>> B');
  });

  test('正文中间出现的合法标记（非行首）不当作分隔符', () => {
    // 行内标记若被当作分隔符，前面的正文会被静默丢弃，行为随上下文漂移
    const raw = '前言 <<<1>>> 正文\n<<<2>>>\nB';
    const { translations } = decodeBatch(raw, 2);

    expect(translations.has(1)).toBe(false);
    expect(translations.get(2)).toBe('B');
  });
});

describe('decodeBatch missing 计算', () => {
  test('全部缺失', () => {
    const { translations, missing } = decodeBatch('模型没有按协议输出', 3);

    expect(translations.size).toBe(0);
    expect(missing).toEqual([1, 2, 3]);
  });

  test('部分缺失', () => {
    const { translations, missing } = decodeBatch('<<<1>>>\nA\n<<<3>>>\nC', 4);

    expect(translations.size).toBe(2);
    expect(missing).toEqual([2, 4]);
  });

  test('expected 为 0 时不产生缺失项', () => {
    const { translations, missing } = decodeBatch('', 0);

    expect(translations.size).toBe(0);
    expect(missing).toEqual([]);
  });
});

describe('encodeBatch → decodeBatch 往返', () => {
  test('多段中文往返一致', () => {
    const items = [
      { id: 1, text: '第一段中文' },
      { id: 2, text: '第二段中文' },
      { id: 3, text: '第三段中文' },
    ];
    const { translations, missing } = decodeBatch(encodeBatch(items), items.length);

    expect(missing).toEqual([]);
    expect(translations.get(1)).toBe('第一段中文');
    expect(translations.get(2)).toBe('第二段中文');
    expect(translations.get(3)).toBe('第三段中文');
  });

  test('段内含内部换行的文本往返一致', () => {
    const items = [
      { id: 1, text: '第一行\n第二行' },
      { id: 2, text: '含 <b>标签</b> 与 <<<1>> 字样的正文' },
    ];
    const { translations, missing } = decodeBatch(encodeBatch(items), items.length);

    expect(missing).toEqual([]);
    expect(translations.get(1)).toBe('第一行\n第二行');
    // 内部 <<<1>> 格式不合法，原样保留
    expect(translations.get(2)).toBe('含 <b>标签</b> 与 <<<1>> 字样的正文');
  });

  test('encodeBatch 保持原格式（标记独占一行）', () => {
    expect(encodeBatch([{ id: 1, text: 'A' }, { id: 2, text: 'B' }])).toBe('<<<1>>>\nA\n<<<2>>>\nB');
  });
});

// ─── parseEncodedBatch：聚合缓存的逐段切分 ────────────────────────────────
//
// 聚合请求的缓存粒度必须是「单个段落」而不是「整批文本」，否则批次组成一变
// （滚动节奏、视口起点不同）整批 key 就不同，缓存永远命中不了 —— Reddit
// 右侧栏列表「始终无法命中缓存」的根因就是它。要逐段查缓存，必须先把请求
// 文本无歧义地切回单段，这里锁住该切分契约。
describe('parseEncodedBatch 批次文本切分', () => {
  test('往返一致：encodeBatch → parseEncodedBatch 还原出原始条目', () => {
    const items = [
      { id: 1, text: 'Hello there' },
      { id: 2, text: 'General Kenobi' },
      { id: 3, text: '<s0>You</s0> are a bold one #1#' },
    ];
    expect(parseEncodedBatch(encodeBatch(items))).toEqual(items);
  });

  test('正文含换行也能正确切分', () => {
    const items = [
      { id: 1, text: 'line one\nline two' },
      { id: 2, text: 'plain' },
    ];
    expect(parseEncodedBatch(encodeBatch(items))).toEqual(items);
  });

  test('单段批次同样可切分', () => {
    expect(parseEncodedBatch(encodeBatch([{ id: 1, text: 'only one' }]))).toEqual([
      { id: 1, text: 'only one' },
    ]);
  });

  test('不含标记的普通文本返回 null（调用方回落整批缓存）', () => {
    expect(parseEncodedBatch('just a plain sentence')).toBeNull();
  });

  test('正文里字面出现 <<<N>>> 行时返回 null（宁可回落，也不能切错段落）', () => {
    // 讲解本协议的文档页、代码块里的示例都可能出现这种行。
    // 切错段落会把残缺片段当成段落去查/写缓存，造成错误译文被复用。
    const ambiguous = '<<<1>>>\nA\n<<<2>>>\nB\n<<<2>>>\nFAKE';
    expect(parseEncodedBatch(ambiguous)).toBeNull();
  });

  test('id 不从 1 开始或跳跃时返回 null', () => {
    expect(parseEncodedBatch('<<<2>>>\nA')).toBeNull();
    expect(parseEncodedBatch('<<<1>>>\nA\n<<<3>>>\nC')).toBeNull();
  });
});
